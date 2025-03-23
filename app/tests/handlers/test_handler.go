package handlers

import (
	dashboardModels "TeacherJournal/app/dashboard/models"
	testsModels "TeacherJournal/app/tests/models"
	"TeacherJournal/app/tests/utils"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// TestHandler handles test-taking operations for students
type TestHandler struct {
	DB *gorm.DB
}

// NewTestHandler creates a new TestHandler
func NewTestHandler(database *gorm.DB) *TestHandler {
	return &TestHandler{
		DB: database,
	}
}

// GetAvailableTests retrieves tests available for a student to take
func (h *TestHandler) GetAvailableTests(w http.ResponseWriter, r *http.Request) {
	// Get student ID from query params
	studentIDStr := r.URL.Query().Get("student_id")
	studentID, err := strconv.Atoi(studentIDStr)
	if err != nil || studentID <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Valid student ID is required")
		return
	}

	// Verify student exists
	var student dashboardModels.Student
	if err := h.DB.Where("id = ?", studentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Get all active tests, with information about attempts for this student
	type TestInfo struct {
		ID              int        `json:"id"`
		Title           string     `json:"title"`
		Description     string     `json:"description"`
		Subject         string     `json:"subject"`
		QuestionsCount  int        `json:"questions_count"`
		CreatedAt       time.Time  `json:"created_at"`
		MaxAttempts     int        `json:"max_attempts"`
		TimePerQuestion int        `json:"time_per_question"`
		AttemptsUsed    int        `json:"attempts_used"`
		HighestScore    int        `json:"highest_score"`
		LastAttemptDate *time.Time `json:"last_attempt_date"`
		CanAttempt      bool       `json:"can_attempt"`
	}

	var availableTests []TestInfo

	// Get tests based on student's group - ОБНОВЛЕНО для использования связей test_groups
	rows, err := h.DB.Raw(`
		SELECT 
			t.id, 
			t.title, 
			t.description, 
			t.subject, 
			COUNT(DISTINCT q.id) as questions_count,
			t.created_at,
			t.max_attempts,
			t.time_per_question,
			COUNT(DISTINCT ta.id) as attempts_used,
			COALESCE(MAX(ta.score), 0) as highest_score,
			MAX(ta.start_time) as last_attempt_date
		FROM tests t
		JOIN questions q ON t.id = q.test_id
		LEFT JOIN test_attempts ta ON t.id = ta.test_id AND ta.student_id = ?
		JOIN test_groups tg ON t.id = tg.test_id AND tg.group_name = ?
		WHERE t.is_active = true
		GROUP BY t.id
		ORDER BY t.created_at DESC
	`, studentID, student.GroupName).Rows()

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving available tests")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var test TestInfo
		var attemptDate *time.Time

		if err := rows.Scan(
			&test.ID,
			&test.Title,
			&test.Description,
			&test.Subject,
			&test.QuestionsCount,
			&test.CreatedAt,
			&test.MaxAttempts,
			&test.TimePerQuestion,
			&test.AttemptsUsed,
			&test.HighestScore,
			&attemptDate,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error scanning test data")
			return
		}

		test.LastAttemptDate = attemptDate
		test.CanAttempt = test.AttemptsUsed < test.MaxAttempts

		availableTests = append(availableTests, test)
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Available tests retrieved successfully", availableTests)
}

// StartTestRequest defines the request body for starting a test
type StartTestRequest struct {
	StudentID int `json:"student_id"`
}

// StartTestResponse defines the response body for starting a test
type StartTestResponse struct {
	AttemptID int `json:"attempt_id"`
}

// StartTest starts a new test attempt for a student
func (h *TestHandler) StartTest(w http.ResponseWriter, r *http.Request) {
	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Parse request body
	var req StartTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.StudentID <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Valid student ID is required")
		return
	}

	// Check if test exists and is active
	var test testsModels.Test
	if err := h.DB.Where("id = ? AND is_active = true", testID).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found or not active")
		return
	}

	// Check if student exists
	var student dashboardModels.Student
	if err := h.DB.Where("id = ?", req.StudentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Check if student has reached the maximum number of attempts
	var attemptCount int64
	h.DB.Model(&testsModels.TestAttempt{}).Where("test_id = ? AND student_id = ?", testID, req.StudentID).Count(&attemptCount)

	if int(attemptCount) >= test.MaxAttempts {
		utils.RespondWithError(w, http.StatusForbidden, "Maximum number of attempts reached")
		return
	}

	// Get total questions count
	var questionCount int64
	h.DB.Model(&testsModels.Question{}).Where("test_id = ?", testID).Count(&questionCount)

	if questionCount == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "This test has no questions")
		return
	}

	// Create a new test attempt
	testAttempt := testsModels.TestAttempt{
		TestID:         testID,
		StudentID:      req.StudentID,
		StartTime:      time.Now(),
		Score:          0,
		TotalQuestions: int(questionCount),
		Completed:      false,
	}

	if err := h.DB.Create(&testAttempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating test attempt")
		return
	}

	utils.RespondWithSuccess(w, http.StatusCreated, "Test attempt started", StartTestResponse{
		AttemptID: testAttempt.ID,
	})
}

// GetNextQuestion gets the next unanswered question for a test attempt
func (h *TestHandler) GetNextQuestion(w http.ResponseWriter, r *http.Request) {
	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["attempt_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Verify the attempt exists and is not completed
	var attempt testsModels.TestAttempt
	if err := h.DB.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Attempt not found")
		return
	}

	if attempt.Completed {
		utils.RespondWithSuccess(w, http.StatusOK, "All questions answered. Test completed.", map[string]interface{}{
			"completed":  true,
			"attempt_id": attemptID,
		})
		return
	}

	// Get all questions for this test with answers preloaded
	var questions []testsModels.Question
	if err := h.DB.Preload("Answers").Where("test_id = ?", attempt.TestID).Order("position").Find(&questions).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	if len(questions) == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "This test has no questions")
		return
	}

	// Log found questions for debugging
	log.Printf("Found %d questions for test ID %d", len(questions), attempt.TestID)
	for i, q := range questions {
		log.Printf("Question %d: %s (Type: %s, Answers: %d)",
			i+1, q.QuestionText, q.QuestionType, len(q.Answers))
	}

	// Get answered questions for this attempt
	var answeredQuestionIDs []int
	h.DB.Model(&testsModels.StudentResponse{}).
		Where("attempt_id = ?", attemptID).
		Pluck("question_id", &answeredQuestionIDs)

	// Convert answeredQuestionIDs to a map for faster lookup
	answeredMap := make(map[int]bool)
	for _, id := range answeredQuestionIDs {
		answeredMap[id] = true
	}

	// Find the first unanswered question
	var nextQuestion *testsModels.Question
	for i := range questions {
		if !answeredMap[questions[i].ID] {
			nextQuestion = &questions[i]
			break
		}
	}

	if nextQuestion == nil {
		// All questions have been answered
		// Complete the test
		now := time.Now()
		h.DB.Model(&attempt).Updates(map[string]interface{}{
			"completed": true,
			"end_time":  now,
		})

		utils.RespondWithSuccess(w, http.StatusOK, "All questions answered. Test completed.", map[string]interface{}{
			"completed":  true,
			"attempt_id": attemptID,
		})
		return
	}

	// Get the test's time per question setting
	var test testsModels.Test
	h.DB.Select("time_per_question").Where("id = ?", attempt.TestID).First(&test)

	// Strip IsCorrect field from answers for security
	answers := make([]map[string]interface{}, 0)
	for _, ans := range nextQuestion.Answers {
		answers = append(answers, map[string]interface{}{
			"id":          ans.ID,
			"answer_text": ans.AnswerText,
		})
	}

	// Format the question for the response
	question := map[string]interface{}{
		"id":            nextQuestion.ID,
		"question_text": nextQuestion.QuestionText,
		"question_type": nextQuestion.QuestionType,
		"position":      nextQuestion.Position,
		"time_limit":    test.TimePerQuestion,
		"answers":       answers,
	}

	// Log response data for debugging
	log.Printf("Sending question data: %+v", question)

	// Return the next question with formatted data
	utils.RespondWithSuccess(w, http.StatusOK, "Next question retrieved", map[string]interface{}{
		"question": question,
		"progress": map[string]interface{}{
			"answered": len(answeredQuestionIDs),
			"total":    len(questions),
		},
	})
}

// SubmitAnswerRequest defines the request body for submitting an answer
type SubmitAnswerRequest struct {
	QuestionID int    `json:"question_id"`
	AnswerID   *int   `json:"answer_id"`
	TextAnswer string `json:"text_answer"`
	TimeSpent  int    `json:"time_spent"` // Time in seconds
}

// SubmitAnswer submits a student's answer for a question
func (h *TestHandler) SubmitAnswer(w http.ResponseWriter, r *http.Request) {
	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["attempt_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Parse request body
	var req SubmitAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Verify the attempt exists and is not completed
	var attempt testsModels.TestAttempt
	if err := h.DB.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Attempt not found")
		return
	}

	if attempt.Completed {
		utils.RespondWithError(w, http.StatusBadRequest, "This test attempt is already completed")
		return
	}

	// Check if the question exists and belongs to this test
	var question testsModels.Question
	if err := h.DB.Where("id = ? AND test_id = ?", req.QuestionID, attempt.TestID).First(&question).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Question not found in this test")
		return
	}

	// Check if this question was already answered in this attempt
	var existingResponse testsModels.StudentResponse
	result := h.DB.Where("attempt_id = ? AND question_id = ?", attemptID, req.QuestionID).First(&existingResponse)
	if result.Error == nil {
		utils.RespondWithError(w, http.StatusBadRequest, "This question was already answered")
		return
	}

	// Determine if the answer is correct
	isCorrect := false

	if question.QuestionType == "text" {
		// For text questions, use exact match for now
		// In a real application, you might want more sophisticated matching
		var correctAnswer string
		h.DB.Model(&testsModels.Answer{}).
			Where("question_id = ? AND is_correct = true", req.QuestionID).
			Pluck("answer_text", &correctAnswer)

		isCorrect = req.TextAnswer == correctAnswer
	} else {
		// For multiple/single choice questions
		if req.AnswerID != nil {
			// Verify the answer belongs to this question
			var answer testsModels.Answer
			result = h.DB.Where("id = ? AND question_id = ?", *req.AnswerID, req.QuestionID).First(&answer)
			if result.Error != nil {
				utils.RespondWithError(w, http.StatusBadRequest, "Invalid answer for this question")
				return
			}

			isCorrect = answer.IsCorrect
		}
	}

	// Create the student response
	response := testsModels.StudentResponse{
		AttemptID:   attemptID,
		QuestionID:  req.QuestionID,
		AnswerID:    req.AnswerID,
		TextAnswer:  req.TextAnswer,
		IsCorrect:   isCorrect,
		TimeSpent:   req.TimeSpent,
		SubmittedAt: time.Now(),
	}

	if err := h.DB.Create(&response).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error saving response")
		return
	}

	// Update the test attempt score if the answer is correct
	if isCorrect {
		h.DB.Model(&attempt).Update("score", gorm.Expr("score + 1"))
	}

	// Check if all questions have been answered
	var answeredCount int64
	h.DB.Model(&testsModels.StudentResponse{}).Where("attempt_id = ?", attemptID).Count(&answeredCount)

	allQuestionsAnswered := int(answeredCount) >= attempt.TotalQuestions

	// If all questions are answered, complete the test
	if allQuestionsAnswered {
		now := time.Now()
		h.DB.Model(&attempt).Updates(map[string]interface{}{
			"completed": true,
			"end_time":  now,
		})
	}

	// Return whether the answer was correct and if the test is completed
	utils.RespondWithSuccess(w, http.StatusOK, "Answer submitted successfully", map[string]interface{}{
		"is_correct": isCorrect,
		"completed":  allQuestionsAnswered,
		"progress": map[string]interface{}{
			"answered": answeredCount,
			"total":    attempt.TotalQuestions,
		},
	})
}

// GetTestResults retrieves detailed results for a completed test attempt
func (h *TestHandler) GetTestResults(w http.ResponseWriter, r *http.Request) {
	// Get attempt ID from URL
	vars := mux.Vars(r)
	attemptID, err := strconv.Atoi(vars["attempt_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
		return
	}

	// Verify the attempt exists
	var attempt testsModels.TestAttempt
	if err := h.DB.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Attempt not found")
		return
	}

	// Get test information
	var test testsModels.Test
	if err := h.DB.Where("id = ?", attempt.TestID).First(&test).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test information")
		return
	}

	// Get student information
	var student dashboardModels.Student
	if err := h.DB.Where("id = ?", attempt.StudentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving student information")
		return
	}

	// Calculate test duration
	var duration time.Duration
	if attempt.EndTime != nil {
		duration = attempt.EndTime.Sub(attempt.StartTime)
	}

	// Get all questions and responses
	type QuestionResponse struct {
		QuestionID    int       `json:"question_id"`
		QuestionText  string    `json:"question_text"`
		QuestionType  string    `json:"question_type"`
		Position      int       `json:"position"`
		AnswerID      *int      `json:"answer_id"`
		TextAnswer    string    `json:"text_answer"`
		CorrectAnswer string    `json:"correct_answer"`
		IsCorrect     bool      `json:"is_correct"`
		TimeSpent     int       `json:"time_spent"`
		SubmittedAt   time.Time `json:"submitted_at"`
	}

	var responses []QuestionResponse

	// Get all questions for this test
	var allQuestions []struct {
		ID           int    `json:"id"`
		QuestionText string `json:"question_text"`
		QuestionType string `json:"question_type"`
		Position     int    `json:"position"`
	}

	if err := h.DB.Model(&testsModels.Question{}).
		Where("test_id = ?", attempt.TestID).
		Order("position").
		Find(&allQuestions).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	// For each question, get the student's response and the correct answer
	for _, q := range allQuestions {
		var response QuestionResponse
		response.QuestionID = q.ID
		response.QuestionText = q.QuestionText
		response.QuestionType = q.QuestionType
		response.Position = q.Position

		// Get the student's response
		var studentResponse testsModels.StudentResponse
		result := h.DB.Where("attempt_id = ? AND question_id = ?", attemptID, q.ID).First(&studentResponse)

		if result.Error == nil {
			// Student answered this question
			response.AnswerID = studentResponse.AnswerID
			response.TextAnswer = studentResponse.TextAnswer
			response.IsCorrect = studentResponse.IsCorrect
			response.TimeSpent = studentResponse.TimeSpent
			response.SubmittedAt = studentResponse.SubmittedAt
		} else {
			// Student didn't answer this question
			response.IsCorrect = false
			response.TimeSpent = 0
		}

		// Get the correct answer
		var correctAnswer string
		h.DB.Model(&testsModels.Answer{}).
			Where("question_id = ? AND is_correct = true", q.ID).
			Pluck("answer_text", &correctAnswer)

		response.CorrectAnswer = correctAnswer

		responses = append(responses, response)
	}

	// Calculate score as a percentage
	scorePercent := 0.0
	if attempt.TotalQuestions > 0 {
		scorePercent = float64(attempt.Score) / float64(attempt.TotalQuestions) * 100
	}

	// Return the test results
	result := map[string]interface{}{
		"attempt_info": map[string]interface{}{
			"id":               attempt.ID,
			"start_time":       attempt.StartTime,
			"end_time":         attempt.EndTime,
			"completed":        attempt.Completed,
			"score":            attempt.Score,
			"total_questions":  attempt.TotalQuestions,
			"score_percent":    scorePercent,
			"duration_seconds": int(duration.Seconds()),
		},
		"test_info": map[string]interface{}{
			"id":      test.ID,
			"title":   test.Title,
			"subject": test.Subject,
		},
		"student_info": map[string]interface{}{
			"id":    student.ID,
			"name":  student.StudentFIO,
			"group": student.GroupName,
		},
		"responses": responses,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test results retrieved successfully", result)
}

// GetStudentTestHistory retrieves the test history for a student
func (h *TestHandler) GetStudentTestHistory(w http.ResponseWriter, r *http.Request) {
	// Get student ID from query parameters
	studentIDStr := r.URL.Query().Get("student_id")
	studentID, err := strconv.Atoi(studentIDStr)
	if err != nil || studentID <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Valid student ID is required")
		return
	}

	// Verify student exists
	var student dashboardModels.Student
	if err := h.DB.Where("id = ?", studentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Get all test attempts for this student
	type TestAttemptHistory struct {
		AttemptID       int        `json:"attempt_id"`
		TestID          int        `json:"test_id"`
		TestTitle       string     `json:"test_title"`
		Subject         string     `json:"subject"`
		StartTime       time.Time  `json:"start_time"`
		EndTime         *time.Time `json:"end_time"`
		Completed       bool       `json:"completed"`
		Score           int        `json:"score"`
		TotalQuestions  int        `json:"total_questions"`
		ScorePercent    float64    `json:"score_percent"`
		DurationSeconds int        `json:"duration_seconds"`
	}

	var attempts []TestAttemptHistory

	rows, err := h.DB.Raw(`
		SELECT 
			ta.id as attempt_id,
			t.id as test_id,
			t.title as test_title,
			t.subject,
			ta.start_time,
			ta.end_time,
			ta.completed,
			ta.score,
			ta.total_questions,
			CASE WHEN ta.total_questions > 0 THEN (ta.score * 100.0 / ta.total_questions) ELSE 0 END as score_percent,
			CASE WHEN ta.end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (ta.end_time - ta.start_time)) ELSE NULL END as duration_seconds
		FROM test_attempts ta
		JOIN tests t ON ta.test_id = t.id
		WHERE ta.student_id = ?
		ORDER BY ta.start_time DESC
	`, studentID).Rows()

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test attempts")
		return
	}
	defer rows.Close()

	for rows.Next() {
		var attempt TestAttemptHistory
		var durationSeconds *int

		if err := rows.Scan(
			&attempt.AttemptID,
			&attempt.TestID,
			&attempt.TestTitle,
			&attempt.Subject,
			&attempt.StartTime,
			&attempt.EndTime,
			&attempt.Completed,
			&attempt.Score,
			&attempt.TotalQuestions,
			&attempt.ScorePercent,
			&durationSeconds,
		); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error scanning attempt data")
			return
		}

		if durationSeconds != nil {
			attempt.DurationSeconds = *durationSeconds
		}

		attempts = append(attempts, attempt)
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test history retrieved successfully", map[string]interface{}{
		"student_info": map[string]interface{}{
			"id":    student.ID,
			"name":  student.StudentFIO,
			"group": student.GroupName,
		},
		"attempts": attempts,
	})
}
