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
	rows, err := h.DB.Raw(`SELECT 
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
LEFT JOIN questions q ON t.id = q.test_id
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

	// Log the attempt ID for debugging
	log.Printf("GetNextQuestion called for attempt ID: %d", attemptID)

	// Verify the attempt exists and is not completed
	var attempt testsModels.TestAttempt
	if err := h.DB.Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		log.Printf("Error finding attempt ID %d: %v", attemptID, err)
		utils.RespondWithError(w, http.StatusNotFound, "Attempt not found")
		return
	}

	log.Printf("Found attempt ID %d for test ID %d, student ID %d, completed: %v",
		attempt.ID, attempt.TestID, attempt.StudentID, attempt.Completed)

	if attempt.Completed {
		log.Printf("Attempt %d is already completed", attemptID)
		utils.RespondWithSuccess(w, http.StatusOK, "All questions answered. Test completed.", map[string]interface{}{
			"completed":  true,
			"attempt_id": attemptID,
		})
		return
	}

	// Get all questions for this test with answers preloaded
	var questions []testsModels.Question
	if err := h.DB.Debug().Preload("Answers").Where("test_id = ?", attempt.TestID).Order("position").Find(&questions).Error; err != nil {
		log.Printf("Error retrieving questions for test ID %d: %v", attempt.TestID, err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	if len(questions) == 0 {
		log.Printf("No questions found for test ID %d", attempt.TestID)
		utils.RespondWithError(w, http.StatusNotFound, "This test has no questions")
		return
	}

	// Log found questions for debugging
	log.Printf("Found %d questions for test ID %d", len(questions), attempt.TestID)
	for i, q := range questions {
		log.Printf("Question %d: ID=%d, Text=%s (Type: %s, Answers: %d)",
			i+1, q.ID, q.QuestionText, q.QuestionType, len(q.Answers))
	}

	// Get answered questions for this attempt
	var answeredQuestionIDs []int
	result := h.DB.Model(&testsModels.StudentResponse{}).
		Where("attempt_id = ?", attemptID).
		Pluck("question_id", &answeredQuestionIDs)

	if result.Error != nil {
		log.Printf("Error retrieving answered questions: %v", result.Error)
	}

	log.Printf("Found %d answered questions for attempt ID %d: %v",
		len(answeredQuestionIDs), attemptID, answeredQuestionIDs)

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
			log.Printf("Found next unanswered question ID %d: %s", nextQuestion.ID, nextQuestion.QuestionText)
			break
		}
	}

	if nextQuestion == nil {
		// All questions have been answered
		// Complete the test
		log.Printf("All questions answered for attempt ID %d, marking as completed", attemptID)
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
	if err := h.DB.Select("time_per_question").Where("id = ?", attempt.TestID).First(&test).Error; err != nil {
		log.Printf("Error retrieving test info: %v", err)
	}

	// Verify answers are loaded correctly
	log.Printf("Question ID %d has %d answers", nextQuestion.ID, len(nextQuestion.Answers))
	for i, ans := range nextQuestion.Answers {
		log.Printf("Answer %d: ID=%d, Text=%s, IsCorrect=%v",
			i+1, ans.ID, ans.AnswerText, ans.IsCorrect)
	}

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

	// Log the attempt ID for debugging
	log.Printf("SubmitAnswer called for attempt ID: %d", attemptID)

	// Parse request body
	var req SubmitAnswerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error parsing request body: %v", err)
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	log.Printf("Received answer submission: question_id=%d, answer_id=%v, text_answer=%q, time_spent=%d",
		req.QuestionID, req.AnswerID, req.TextAnswer, req.TimeSpent)

	// Verify the attempt exists and is not completed
	var attempt testsModels.TestAttempt
	if err := h.DB.Debug().Where("id = ?", attemptID).First(&attempt).Error; err != nil {
		log.Printf("Error finding attempt ID %d: %v", attemptID, err)
		utils.RespondWithError(w, http.StatusNotFound, "Attempt not found")
		return
	}

	if attempt.Completed {
		log.Printf("Attempt %d is already completed", attemptID)
		utils.RespondWithError(w, http.StatusBadRequest, "This test attempt is already completed")
		return
	}

	log.Printf("Found attempt: test_id=%d, student_id=%d, completed=%v",
		attempt.TestID, attempt.StudentID, attempt.Completed)

	// Check if the question exists and belongs to this test
	var question testsModels.Question
	questionQuery := h.DB.Debug().Where("id = ?", req.QuestionID)

	// Modified: Remove the test_id condition to just find the question by ID first
	result := questionQuery.First(&question)
	if result.Error != nil {
		log.Printf("Error finding question ID %d: %v", req.QuestionID, result.Error)
		utils.RespondWithError(w, http.StatusNotFound, "Question not found")
		return
	}

	// After finding the question, check if it belongs to the test
	if question.TestID != attempt.TestID {
		log.Printf("Question ID %d belongs to test ID %d, not attempt test ID %d",
			req.QuestionID, question.TestID, attempt.TestID)
		utils.RespondWithError(w, http.StatusBadRequest, "Question not found in this test")
		return
	}

	log.Printf("Found question: id=%d, test_id=%d, text=%q, type=%s",
		question.ID, question.TestID, question.QuestionText, question.QuestionType)

	// Check if this question was already answered in this attempt
	var existingResponse testsModels.StudentResponse
	result = h.DB.Debug().Where("attempt_id = ? AND question_id = ?", attemptID, req.QuestionID).First(&existingResponse)
	if result.Error == nil {
		log.Printf("Question ID %d was already answered in attempt ID %d", req.QuestionID, attemptID)
		utils.RespondWithError(w, http.StatusBadRequest, "This question was already answered")
		return
	}

	// Determine if the answer is correct
	isCorrect := false

	if question.QuestionType == "text" {
		// For text questions, use exact match for now
		var correctAnswer string
		h.DB.Debug().Model(&testsModels.Answer{}).
			Where("question_id = ? AND is_correct = true", req.QuestionID).
			Pluck("answer_text", &correctAnswer)

		isCorrect = req.TextAnswer == correctAnswer
		log.Printf("Text answer check: submitted=%q, correct=%q, match=%v",
			req.TextAnswer, correctAnswer, isCorrect)
	} else {
		// For multiple/single choice questions
		if req.AnswerID != nil {
			// Verify the answer belongs to this question
			var answer testsModels.Answer
			result = h.DB.Debug().Where("id = ? AND question_id = ?", *req.AnswerID, req.QuestionID).First(&answer)
			if result.Error != nil {
				log.Printf("Error finding answer ID %d for question ID %d: %v",
					*req.AnswerID, req.QuestionID, result.Error)
				utils.RespondWithError(w, http.StatusBadRequest, "Invalid answer for this question")
				return
			}

			isCorrect = answer.IsCorrect
			log.Printf("Choice answer check: answer_id=%d, is_correct=%v", answer.ID, isCorrect)
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

	if err := h.DB.Debug().Create(&response).Error; err != nil {
		log.Printf("Error saving response: %v", err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error saving response")
		return
	}

	log.Printf("Created student response: id=%d, is_correct=%v", response.ID, isCorrect)

	// Update the test attempt score if the answer is correct
	if isCorrect {
		result := h.DB.Debug().Model(&attempt).Update("score", gorm.Expr("score + 1"))
		if result.Error != nil {
			log.Printf("Error updating score: %v", result.Error)
		} else {
			log.Printf("Updated score for attempt ID %d", attemptID)
		}
	}

	// Check if all questions have been answered
	var answeredCount int64
	h.DB.Debug().Model(&testsModels.StudentResponse{}).Where("attempt_id = ?", attemptID).Count(&answeredCount)

	log.Printf("Checked answered questions: %d of %d", answeredCount, attempt.TotalQuestions)
	allQuestionsAnswered := int(answeredCount) >= attempt.TotalQuestions

	// If all questions are answered, complete the test
	if allQuestionsAnswered {
		log.Printf("All questions answered, completing attempt ID %d", attemptID)
		now := time.Now()
		h.DB.Debug().Model(&attempt).Updates(map[string]interface{}{
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

	// Log debugging information
	log.Printf("Getting test history for student ID: %d", studentID)

	// Verify student exists
	var student dashboardModels.Student
	if err := h.DB.Where("id = ?", studentID).First(&student).Error; err != nil {
		log.Printf("Error finding student with ID %d: %v", studentID, err)
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	log.Printf("Found student: %s, Group: %s", student.StudentFIO, student.GroupName)

	// Get all test attempts for this student with a simpler query first
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

	// Use a simpler query to debug where the issue might be
	query := `
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
            CASE WHEN ta.end_time IS NOT NULL THEN 
                EXTRACT(EPOCH FROM (ta.end_time - ta.start_time))::integer 
            ELSE 0 END as duration_seconds
        FROM test_attempts ta
        JOIN tests t ON ta.test_id = t.id
        WHERE ta.student_id = ?
        ORDER BY ta.start_time DESC
    `

	log.Printf("Executing test history query for student ID: %d", studentID)

	// Try running the query with error handling
	rows, err := h.DB.Raw(query, studentID).Rows()
	if err != nil {
		log.Printf("Error in SQL query for test history: %v", err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test attempts: "+err.Error())
		return
	}
	defer rows.Close()

	// Process the rows carefully with error checking
	for rows.Next() {
		var attempt TestAttemptHistory
		var durationSeconds int

		scanErr := rows.Scan(
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
		)

		if scanErr != nil {
			log.Printf("Error scanning row data: %v", scanErr)
			utils.RespondWithError(w, http.StatusInternalServerError, "Error scanning attempt data: "+scanErr.Error())
			return
		}

		attempt.DurationSeconds = durationSeconds
		attempts = append(attempts, attempt)
	}

	// Check for any errors that occurred during iteration
	if err = rows.Err(); err != nil {
		log.Printf("Error after row iteration: %v", err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error processing test attempts")
		return
	}

	log.Printf("Successfully retrieved %d test attempts for student ID: %d", len(attempts), studentID)

	utils.RespondWithSuccess(w, http.StatusOK, "Test history retrieved successfully", map[string]interface{}{
		"student_info": map[string]interface{}{
			"id":    student.ID,
			"name":  student.StudentFIO,
			"group": student.GroupName,
		},
		"attempts": attempts,
	})
}
