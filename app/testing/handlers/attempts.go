package handlers

import (
	"TeacherJournal/app/dashboard/models"
	dashboardUtils "TeacherJournal/app/dashboard/utils"
	testingModels "TeacherJournal/app/testing/models"
	"TeacherJournal/app/testing/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// AttemptHandler handles test attempt-related requests
type AttemptHandler struct {
	DB *gorm.DB
}

// NewAttemptHandler creates a new AttemptHandler
func NewAttemptHandler(database *gorm.DB) *AttemptHandler {
	return &AttemptHandler{
		DB: database,
	}
}

// StartTest starts a new test attempt
func (h *AttemptHandler) StartTest(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Get student details
	var student models.Student
	if err := h.DB.Where("id = ?", studentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Verify the test exists and is active
	var test testingModels.Test
	if err := h.DB.Where("id = ? AND active = ?", testID, true).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found or not active")
		return
	}

	// Verify the student's group has access to this test
	var count int64
	if err := h.DB.Model(&testingModels.TestGroupAccess{}).
		Where("test_id = ? AND group_name = ?", testID, student.GroupName).
		Count(&count).Error; err != nil || count == 0 {
		utils.RespondWithError(w, http.StatusForbidden, "Your group does not have access to this test")
		return
	}

	// Check if student has already reached the maximum number of attempts
	var attemptCount int64
	if err := h.DB.Model(&testingModels.TestAttempt{}).
		Where("test_id = ? AND student_id = ?", testID, studentID).
		Count(&attemptCount).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error checking attempt count")
		return
	}

	if int(attemptCount) >= test.MaxAttempts {
		utils.RespondWithError(w, http.StatusForbidden, "You have reached the maximum number of attempts for this test")
		return
	}

	// Check if there's an ongoing attempt
	var ongoingAttempt testingModels.TestAttempt
	err = h.DB.Where("test_id = ? AND student_id = ? AND completed = ?", testID, studentID, false).
		First(&ongoingAttempt).Error

	if err == nil {
		// There's an ongoing attempt, return it
		utils.RespondWithSuccess(w, http.StatusOK, "Ongoing test attempt retrieved", map[string]interface{}{
			"attempt_id": ongoingAttempt.ID,
			"message":    "You have an ongoing attempt for this test",
		})
		return
	}

	// Get total number of questions
	var totalQuestions int64
	if err := h.DB.Model(&testingModels.Question{}).
		Where("test_id = ?", testID).
		Count(&totalQuestions).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving question count")
		return
	}

	if totalQuestions == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "This test has no questions")
		return
	}

	// Create new test attempt
	attempt := testingModels.TestAttempt{
		TestID:         testID,
		StudentID:      studentID,
		StartedAt:      time.Now(),
		TotalQuestions: int(totalQuestions),
		Completed:      false,
	}

	if err := h.DB.Create(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating test attempt")
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, studentID, "Start Test",
		fmt.Sprintf("Started test '%s' (ID: %d)", test.Title, testID))

	utils.RespondWithSuccess(w, http.StatusCreated, "Test attempt started successfully", map[string]interface{}{
		"attempt_id":      attempt.ID,
		"test_id":         testID,
		"test_title":      test.Title,
		"total_questions": totalQuestions,
	})
}

// GetCurrentQuestion retrieves the current question for a test attempt
func (h *AttemptHandler) GetCurrentQuestion(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Verify the attempt exists and belongs to this student
	var attempt testingModels.TestAttempt
	if err := h.DB.Where("id = ? AND student_id = ?", attemptID, studentID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test attempt not found")
		return
	}

	// Check if the attempt is already completed
	if attempt.Completed {
		utils.RespondWithError(w, http.StatusBadRequest, "This test attempt is already completed")
		return
	}

	// Get the test info
	var test testingModels.Test
	if err := h.DB.Where("id = ?", attempt.TestID).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test information")
		return
	}

	// Get already answered questions
	var answeredQuestionIDs []int
	if err := h.DB.Model(&testingModels.StudentAnswer{}).
		Where("test_attempt_id = ?", attemptID).
		Pluck("question_id", &answeredQuestionIDs).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving answered questions")
		return
	}

	// Find the next unanswered question
	var question testingModels.Question
	query := h.DB.Where("test_id = ?", attempt.TestID).Order("question_order")

	if len(answeredQuestionIDs) > 0 {
		query = query.Where("id NOT IN ?", answeredQuestionIDs)
	}

	err = query.First(&question).Error
	if err != nil {
		// All questions have been answered
		utils.RespondWithSuccess(w, http.StatusOK, "All questions have been answered", map[string]interface{}{
			"remaining_questions": 0,
			"test_completed":      true,
		})
		return
	}

	// Get answers for this question, but don't show which are correct
	var answers []struct {
		ID         int    `json:"id"`
		AnswerText string `json:"answer_text"`
	}

	if err := h.DB.Model(&testingModels.Answer{}).
		Select("id, answer_text").
		Where("question_id = ?", question.ID).
		Find(&answers).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving answers")
		return
	}

	// Calculate remaining questions
	remainingQuestions := attempt.TotalQuestions - len(answeredQuestionIDs) - 1

	// Format response
	response := struct {
		QuestionID         int         `json:"question_id"`
		QuestionText       string      `json:"question_text"`
		QuestionOrder      int         `json:"question_order"`
		Answers            interface{} `json:"answers"`
		TimePerQuestion    int         `json:"time_per_question"`
		RemainingQuestions int         `json:"remaining_questions"`
	}{
		QuestionID:         question.ID,
		QuestionText:       question.QuestionText,
		QuestionOrder:      question.QuestionOrder,
		Answers:            answers,
		TimePerQuestion:    test.TimePerQuestion,
		RemainingQuestions: remainingQuestions,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Question retrieved successfully", response)
}

// SubmitAnswerRequest defines the request structure for submitting an answer
type SubmitAnswerRequest struct {
	AnswerID  int `json:"answer_id"`
	TimeSpent int `json:"time_spent"` // Time in seconds
}

// SubmitAnswer records a student's answer to a question
func (h *AttemptHandler) SubmitAnswer(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get attempt ID and question ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}
	questionID, err := strconv.Atoi(vars["qid"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// Parse request body
	var req SubmitAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Verify the attempt exists and belongs to this student
	var attempt testingModels.TestAttempt
	if err := h.DB.Where("id = ? AND student_id = ?", attemptID, studentID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test attempt not found")
		return
	}

	// Check if the attempt is already completed
	if attempt.Completed {
		utils.RespondWithError(w, http.StatusBadRequest, "This test attempt is already completed")
		return
	}

	// Verify the question belongs to the test
	var question testingModels.Question
	if err := h.DB.Where("id = ? AND test_id = ?", questionID, attempt.TestID).First(&question).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Question not found for this test")
		return
	}

	// Check if this question has already been answered
	var existingAnswer testingModels.StudentAnswer
	err = h.DB.Where("test_attempt_id = ? AND question_id = ?", attemptID, questionID).
		First(&existingAnswer).Error

	if err == nil {
		utils.RespondWithError(w, http.StatusBadRequest, "This question has already been answered")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Check if the answer is correct
	var isCorrect bool
	var answerID *int

	if req.AnswerID > 0 {
		answerID = &req.AnswerID

		// Verify the answer belongs to the question
		var answer testingModels.Answer
		err = tx.Where("id = ? AND question_id = ?", req.AnswerID, questionID).First(&answer).Error
		if err != nil {
			tx.Rollback()
			utils.RespondWithError(w, http.StatusNotFound, "Answer not found for this question")
			return
		}

		isCorrect = answer.IsCorrect
	} else {
		// No answer selected, it's incorrect
		isCorrect = false
	}

	// Save the student's answer
	studentAnswer := testingModels.StudentAnswer{
		TestAttemptID: attemptID,
		QuestionID:    questionID,
		AnswerID:      answerID,
		TimeSpent:     req.TimeSpent,
		IsCorrect:     isCorrect,
		AnsweredAt:    time.Now(),
	}

	if err := tx.Create(&studentAnswer).Error; err != nil {
		tx.Rollback()
		utils.RespondWithError(w, http.StatusInternalServerError, "Error saving answer")
		return
	}

	// Update test attempt statistics
	if isCorrect {
		if err := tx.Model(&attempt).Update("correct_answers", attempt.CorrectAnswers+1).Error; err != nil {
			tx.Rollback()
			utils.RespondWithError(w, http.StatusInternalServerError, "Error updating attempt statistics")
			return
		}
	}

	// Update total time spent on test
	if err := tx.Model(&attempt).Update("total_time", attempt.TotalTime+req.TimeSpent).Error; err != nil {
		tx.Rollback()
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating attempt time")
		return
	}

	// Check if all questions have been answered
	var answeredCount int64
	if err := tx.Model(&testingModels.StudentAnswer{}).
		Where("test_attempt_id = ?", attemptID).
		Count(&answeredCount).Error; err != nil {
		tx.Rollback()
		utils.RespondWithError(w, http.StatusInternalServerError, "Error counting answered questions")
		return
	}

	var allAnswered bool
	if int(answeredCount) >= attempt.TotalQuestions {
		allAnswered = true

		// Auto-complete the test if all questions are answered
		finishTime := time.Now()
		score := float64(attempt.CorrectAnswers) / float64(attempt.TotalQuestions) * 100

		if err := tx.Model(&attempt).Updates(map[string]interface{}{
			"finished_at": finishTime,
			"score":       score,
			"completed":   true,
		}).Error; err != nil {
			tx.Rollback()
			utils.RespondWithError(w, http.StatusInternalServerError, "Error completing test")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Format response
	response := struct {
		QuestionID           int  `json:"question_id"`
		AnswerID             *int `json:"answer_id"`
		IsCorrect            bool `json:"is_correct"`
		AllQuestionsAnswered bool `json:"all_questions_answered"`
	}{
		QuestionID:           questionID,
		AnswerID:             answerID,
		IsCorrect:            isCorrect,
		AllQuestionsAnswered: allAnswered,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Answer submitted successfully", response)
}

// FinishTest manually finishes a test attempt
func (h *AttemptHandler) FinishTest(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Verify the attempt exists and belongs to this student
	var attempt testingModels.TestAttempt
	if err := h.DB.Where("id = ? AND student_id = ?", attemptID, studentID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test attempt not found")
		return
	}

	// Check if the attempt is already completed
	if attempt.Completed {
		utils.RespondWithError(w, http.StatusBadRequest, "This test attempt is already completed")
		return
	}

	// Calculate test score based on answered questions
	finishTime := time.Now()
	score := 0.0

	if attempt.TotalQuestions > 0 {
		score = float64(attempt.CorrectAnswers) / float64(attempt.TotalQuestions) * 100
	}

	// Update attempt as completed
	if err := h.DB.Model(&attempt).Updates(map[string]interface{}{
		"finished_at": finishTime,
		"score":       score,
		"completed":   true,
	}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error completing test")
		return
	}

	// Get test details
	var test testingModels.Test
	if err := h.DB.Where("id = ?", attempt.TestID).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test details")
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, studentID, "Finish Test",
		fmt.Sprintf("Finished test '%s' with score %.2f%%", test.Title, score))

	// Format response
	response := struct {
		AttemptID      int       `json:"attempt_id"`
		TestID         int       `json:"test_id"`
		TestTitle      string    `json:"test_title"`
		StartedAt      time.Time `json:"started_at"`
		FinishedAt     time.Time `json:"finished_at"`
		TotalTime      int       `json:"total_time"`
		Score          float64   `json:"score"`
		CorrectAnswers int       `json:"correct_answers"`
		TotalQuestions int       `json:"total_questions"`
	}{
		AttemptID:      attempt.ID,
		TestID:         attempt.TestID,
		TestTitle:      test.Title,
		StartedAt:      attempt.StartedAt,
		FinishedAt:     finishTime,
		TotalTime:      attempt.TotalTime,
		Score:          score,
		CorrectAnswers: attempt.CorrectAnswers,
		TotalQuestions: attempt.TotalQuestions,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test completed successfully", response)
}

// GetTestResult retrieves the result of a completed test attempt
func (h *AttemptHandler) GetTestResult(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Verify the attempt exists and belongs to this student
	var attempt testingModels.TestAttempt
	if err := h.DB.Where("id = ? AND student_id = ?", attemptID, studentID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test attempt not found")
		return
	}

	// Get test details
	var test testingModels.Test
	if err := h.DB.Where("id = ?", attempt.TestID).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test details")
		return
	}

	// Get student's answers with questions
	type AnswerDetail struct {
		QuestionID        int       `json:"question_id"`
		QuestionText      string    `json:"question_text"`
		QuestionOrder     int       `json:"question_order"`
		AnswerID          *int      `json:"answer_id"`
		AnswerText        string    `json:"answer_text"`
		CorrectAnswerID   int       `json:"correct_answer_id"`
		CorrectAnswerText string    `json:"correct_answer_text"`
		TimeSpent         int       `json:"time_spent"`
		IsCorrect         bool      `json:"is_correct"`
		AnsweredAt        time.Time `json:"answered_at"`
	}

	var answers []testingModels.StudentAnswer
	if err := h.DB.Where("test_attempt_id = ?", attemptID).Find(&answers).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving answers")
		return
	}

	var answerDetails []AnswerDetail
	for _, answer := range answers {
		// Get question info
		var question testingModels.Question
		if err := h.DB.Where("id = ?", answer.QuestionID).First(&question).Error; err != nil {
			continue
		}

		detail := AnswerDetail{
			QuestionID:    answer.QuestionID,
			QuestionText:  question.QuestionText,
			QuestionOrder: question.QuestionOrder,
			AnswerID:      answer.AnswerID,
			TimeSpent:     answer.TimeSpent,
			IsCorrect:     answer.IsCorrect,
			AnsweredAt:    answer.AnsweredAt,
		}

		// Get student's answer text if provided
		if answer.AnswerID != nil {
			var studentAnswer testingModels.Answer
			if err := h.DB.Where("id = ?", *answer.AnswerID).First(&studentAnswer).Error; err == nil {
				detail.AnswerText = studentAnswer.AnswerText
			}
		}

		// Get correct answer
		var correctAnswer testingModels.Answer
		if err := h.DB.Where("question_id = ? AND is_correct = ?", answer.QuestionID, true).
			First(&correctAnswer).Error; err == nil {
			detail.CorrectAnswerID = correctAnswer.ID
			detail.CorrectAnswerText = correctAnswer.AnswerText
		}

		answerDetails = append(answerDetails, detail)
	}

	// Format response
	response := struct {
		AttemptID      int            `json:"attempt_id"`
		TestID         int            `json:"test_id"`
		TestTitle      string         `json:"test_title"`
		StartedAt      time.Time      `json:"started_at"`
		FinishedAt     *time.Time     `json:"finished_at"`
		TotalTime      int            `json:"total_time"`
		Score          float64        `json:"score"`
		CorrectAnswers int            `json:"correct_answers"`
		TotalQuestions int            `json:"total_questions"`
		Completed      bool           `json:"completed"`
		Answers        []AnswerDetail `json:"answers"`
	}{
		AttemptID:      attempt.ID,
		TestID:         attempt.TestID,
		TestTitle:      test.Title,
		StartedAt:      attempt.StartedAt,
		FinishedAt:     attempt.FinishedAt,
		TotalTime:      attempt.TotalTime,
		Score:          attempt.Score,
		CorrectAnswers: attempt.CorrectAnswers,
		TotalQuestions: attempt.TotalQuestions,
		Completed:      attempt.Completed,
		Answers:        answerDetails,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test result retrieved successfully", response)
}
