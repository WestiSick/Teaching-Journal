package handlers

import (
	dashboardUtils "TeacherJournal/app/dashboard/utils"
	"TeacherJournal/app/tests/models"
	"TeacherJournal/app/tests/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// AdminHandler handles admin-specific test operations
type AdminHandler struct {
	DB *gorm.DB
}

// NewAdminHandler creates a new AdminHandler
func NewAdminHandler(database *gorm.DB) *AdminHandler {
	return &AdminHandler{
		DB: database,
	}
}

// CreateTestRequest defines the request body for creating a test
type CreateTestRequest struct {
	Title           string                  `json:"title"`
	Description     string                  `json:"description"`
	Subject         string                  `json:"subject"`
	TimePerQuestion int                     `json:"time_per_question"`
	MaxAttempts     int                     `json:"max_attempts"`
	Questions       []CreateQuestionRequest `json:"questions"`
}

// CreateQuestionRequest defines the request body for creating a question
type CreateQuestionRequest struct {
	QuestionText string                `json:"question_text"`
	QuestionType string                `json:"question_type"`
	Position     int                   `json:"position"`
	Answers      []CreateAnswerRequest `json:"answers"`
}

// CreateAnswerRequest defines the request body for creating an answer
type CreateAnswerRequest struct {
	AnswerText string `json:"answer_text"`
	IsCorrect  bool   `json:"is_correct"`
}

// CreateTest creates a new test
func (h *AdminHandler) CreateTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context to ensure it's admin or teacher
	userRole, err := dashboardUtils.GetUserRoleFromContext(r.Context())
	if err != nil || (userRole != "admin" && userRole != "teacher") {
		utils.RespondWithError(w, http.StatusForbidden, "Admin or teacher privileges required")
		return
	}

	// Parse request body
	var req CreateTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.Title == "" || req.Subject == "" || len(req.Questions) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Title, subject, and questions are required")
		return
	}

	// Set default values if not provided
	if req.TimePerQuestion <= 0 {
		req.TimePerQuestion = 60 // Default 60 seconds per question
	}
	if req.MaxAttempts <= 0 {
		req.MaxAttempts = 1 // Default 1 attempt
	}

	// Create test in transaction
	var testID int
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Create test
		test := models.Test{
			Title:           req.Title,
			Description:     req.Description,
			Subject:         req.Subject,
			CreatorID:       userID,
			TimePerQuestion: req.TimePerQuestion,
			MaxAttempts:     req.MaxAttempts,
			IsActive:        true,
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
		}

		if err := tx.Create(&test).Error; err != nil {
			return err
		}

		testID = test.ID

		// Create questions and answers
		for _, q := range req.Questions {
			questionType := q.QuestionType
			if questionType == "" {
				questionType = "multiple_choice" // Default question type
			}

			question := models.Question{
				TestID:       test.ID,
				QuestionText: q.QuestionText,
				QuestionType: questionType,
				Position:     q.Position,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}

			if err := tx.Create(&question).Error; err != nil {
				return err
			}

			// Create answers for the question
			for _, a := range q.Answers {
				answer := models.Answer{
					QuestionID: question.ID,
					AnswerText: a.AnswerText,
					IsCorrect:  a.IsCorrect,
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				}

				if err := tx.Create(&answer).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating test: "+err.Error())
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, userID, "Create Test", fmt.Sprintf("Created test '%s' with ID %d", req.Title, testID))

	utils.RespondWithSuccess(w, http.StatusCreated, "Test created successfully", map[string]interface{}{
		"test_id": testID,
	})
}

// GetAllTests returns all tests created by the admin or teacher
func (h *AdminHandler) GetAllTests(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get all tests created by this user
	var tests []struct {
		ID              int       `json:"id"`
		Title           string    `json:"title"`
		Subject         string    `json:"subject"`
		IsActive        bool      `json:"is_active"`
		CreatedAt       time.Time `json:"created_at"`
		QuestionsCount  int       `json:"questions_count"`
		AttemptsCount   int       `json:"attempts_count"`
		MaxAttempts     int       `json:"max_attempts"`
		TimePerQuestion int       `json:"time_per_question"`
	}

	// Query for tests with question counts and attempt counts
	query := `
		SELECT 
			t.id, t.title, t.subject, t.is_active, t.created_at, t.max_attempts, t.time_per_question,
			COUNT(DISTINCT q.id) as questions_count,
			COUNT(DISTINCT ta.id) as attempts_count
		FROM tests t
		LEFT JOIN questions q ON t.id = q.test_id
		LEFT JOIN test_attempts ta ON t.id = ta.test_id
		WHERE t.creator_id = ?
		GROUP BY t.id
		ORDER BY t.created_at DESC
	`

	if err := h.DB.Raw(query, userID).Scan(&tests).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving tests")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Tests retrieved successfully", tests)
}

// GetTestDetails returns detailed information about a specific test
func (h *AdminHandler) GetTestDetails(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
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

	// Get test details
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to view this test")
		return
	}

	// Get questions with answers
	var questions []struct {
		ID           int    `json:"id"`
		QuestionText string `json:"question_text"`
		QuestionType string `json:"question_type"`
		Position     int    `json:"position"`
		Answers      []struct {
			ID         int    `json:"id"`
			AnswerText string `json:"answer_text"`
			IsCorrect  bool   `json:"is_correct"`
		} `json:"answers"`
	}

	if err := h.DB.Raw(`
		SELECT 
			q.id, q.question_text, q.question_type, q.position,
			JSON_AGG(
				JSON_BUILD_OBJECT(
					'id', a.id,
					'answer_text', a.answer_text,
					'is_correct', a.is_correct
				) ORDER BY a.id
			) as answers
		FROM questions q
		LEFT JOIN answers a ON q.id = a.question_id
		WHERE q.test_id = ?
		GROUP BY q.id
		ORDER BY q.position
	`, testID).Scan(&questions).Error; err != nil {
		// If the above query fails due to JSON_AGG not being supported, fallback to manual collection
		if err := h.DB.Model(&models.Question{}).Where("test_id = ?", testID).Order("position").Find(&questions).Error; err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
			return
		}

		// Manually get answers for each question
		for i, q := range questions {
			var answers []struct {
				ID         int    `json:"id"`
				AnswerText string `json:"answer_text"`
				IsCorrect  bool   `json:"is_correct"`
			}
			if err := h.DB.Model(&models.Answer{}).Where("question_id = ?", q.ID).Find(&answers).Error; err != nil {
				utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving answers")
				return
			}
			questions[i].Answers = answers
		}
	}

	// Get attempt stats
	var stats struct {
		TotalAttempts   int     `json:"total_attempts"`
		CompletedCount  int     `json:"completed_count"`
		AverageScore    float64 `json:"average_score"`
		AverageDuration int     `json:"average_duration"` // In seconds
	}

	h.DB.Raw(`
		SELECT 
			COUNT(*) as total_attempts,
			SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count,
			COALESCE(AVG(CASE WHEN completed = true THEN score ELSE NULL END), 0) as average_score,
			COALESCE(AVG(CASE WHEN completed = true AND end_time IS NOT NULL 
				THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE NULL END), 0) as average_duration
		FROM test_attempts
		WHERE test_id = ?
	`, testID).Scan(&stats)

	response := map[string]interface{}{
		"id":                test.ID,
		"title":             test.Title,
		"description":       test.Description,
		"subject":           test.Subject,
		"creator_id":        test.CreatorID,
		"is_active":         test.IsActive,
		"created_at":        test.CreatedAt,
		"updated_at":        test.UpdatedAt,
		"max_attempts":      test.MaxAttempts,
		"time_per_question": test.TimePerQuestion,
		"questions":         questions,
		"stats":             stats,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test details retrieved successfully", response)
}

// UpdateTestRequest defines the request body for updating a test
type UpdateTestRequest struct {
	Title           string `json:"title,omitempty"`
	Description     string `json:"description,omitempty"`
	Subject         string `json:"subject,omitempty"`
	IsActive        *bool  `json:"is_active,omitempty"`
	MaxAttempts     int    `json:"max_attempts,omitempty"`
	TimePerQuestion int    `json:"time_per_question,omitempty"`
}

// UpdateTest updates a test's basic information
func (h *AdminHandler) UpdateTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
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

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to update this test")
		return
	}

	// Parse request body
	var req UpdateTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Update test fields if provided
	updates := make(map[string]interface{})

	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Subject != "" {
		updates["subject"] = req.Subject
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.MaxAttempts > 0 {
		updates["max_attempts"] = req.MaxAttempts
	}
	if req.TimePerQuestion > 0 {
		updates["time_per_question"] = req.TimePerQuestion
	}

	// Only update if there are changes
	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		if err := h.DB.Model(&test).Updates(updates).Error; err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error updating test")
			return
		}

		// Log the action
		dashboardUtils.LogAction(h.DB, userID, "Update Test", fmt.Sprintf("Updated test '%s' with ID %d", test.Title, test.ID))
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test updated successfully", nil)
}

// DeleteTest deletes a test and all its questions, answers, and attempts
func (h *AdminHandler) DeleteTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
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

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to delete this test")
		return
	}

	// Delete test and all related data in a transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// First delete all student responses
		if err := tx.Exec("DELETE FROM student_responses WHERE attempt_id IN (SELECT id FROM test_attempts WHERE test_id = ?)", testID).Error; err != nil {
			return err
		}

		// Delete all test attempts
		if err := tx.Where("test_id = ?", testID).Delete(&models.TestAttempt{}).Error; err != nil {
			return err
		}

		// Delete all answers for all questions in the test
		if err := tx.Exec("DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE test_id = ?)", testID).Error; err != nil {
			return err
		}

		// Delete all questions
		if err := tx.Where("test_id = ?", testID).Delete(&models.Question{}).Error; err != nil {
			return err
		}

		// Finally delete the test
		if err := tx.Delete(&test).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting test: "+err.Error())
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, userID, "Delete Test", fmt.Sprintf("Deleted test '%s' with ID %d", test.Title, test.ID))

	utils.RespondWithSuccess(w, http.StatusOK, "Test deleted successfully", nil)
}

// AddQuestionRequest defines the request body for adding a question to a test
type AddQuestionRequest struct {
	QuestionText string                `json:"question_text"`
	QuestionType string                `json:"question_type"`
	Position     int                   `json:"position"`
	Answers      []CreateAnswerRequest `json:"answers"`
}

// AddQuestion adds a new question to an existing test
func (h *AdminHandler) AddQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
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

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to modify this test")
		return
	}

	// Parse request body
	var req AddQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.QuestionText == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Question text is required")
		return
	}

	questionType := req.QuestionType
	if questionType == "" {
		questionType = "multiple_choice" // Default
	}

	// Set position if not provided
	if req.Position <= 0 {
		var maxPosition int
		h.DB.Model(&models.Question{}).Where("test_id = ?", testID).Select("COALESCE(MAX(position), 0)").Scan(&maxPosition)
		req.Position = maxPosition + 1
	}

	// Add question and answers in a transaction
	var questionID int
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Create question
		question := models.Question{
			TestID:       testID,
			QuestionText: req.QuestionText,
			QuestionType: questionType,
			Position:     req.Position,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := tx.Create(&question).Error; err != nil {
			return err
		}

		questionID = question.ID

		// Create answers
		for _, a := range req.Answers {
			answer := models.Answer{
				QuestionID: question.ID,
				AnswerText: a.AnswerText,
				IsCorrect:  a.IsCorrect,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			}

			if err := tx.Create(&answer).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error adding question: "+err.Error())
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, userID, "Add Question", fmt.Sprintf("Added question to test ID %d", testID))

	utils.RespondWithSuccess(w, http.StatusCreated, "Question added successfully", map[string]interface{}{
		"question_id": questionID,
	})
}

// UpdateQuestionRequest defines the request body for updating a question
type UpdateQuestionRequest struct {
	QuestionText string                `json:"question_text,omitempty"`
	QuestionType string                `json:"question_type,omitempty"`
	Position     int                   `json:"position,omitempty"`
	Answers      []UpdateAnswerRequest `json:"answers,omitempty"`
}

// UpdateAnswerRequest defines the request body for updating an answer
type UpdateAnswerRequest struct {
	ID         int    `json:"id"`
	AnswerText string `json:"answer_text,omitempty"`
	IsCorrect  *bool  `json:"is_correct,omitempty"`
}

// UpdateQuestion updates an existing question and its answers
func (h *AdminHandler) UpdateQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID and question ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["test_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	questionID, err := strconv.Atoi(vars["question_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to modify this test")
		return
	}

	// Check if question exists and belongs to the test
	var question models.Question
	if err := h.DB.Where("id = ? AND test_id = ?", questionID, testID).First(&question).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Question not found in this test")
		return
	}

	// Parse request body
	var req UpdateQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Update question and answers in a transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Update question fields if provided
		updates := make(map[string]interface{})

		if req.QuestionText != "" {
			updates["question_text"] = req.QuestionText
		}
		if req.QuestionType != "" {
			updates["question_type"] = req.QuestionType
		}
		if req.Position > 0 {
			updates["position"] = req.Position
		}

		// Only update if there are changes
		if len(updates) > 0 {
			updates["updated_at"] = time.Now()
			if err := tx.Model(&question).Updates(updates).Error; err != nil {
				return err
			}
		}

		// Update answers if provided
		if req.Answers != nil && len(req.Answers) > 0 {
			for _, a := range req.Answers {
				answerUpdates := make(map[string]interface{})

				if a.AnswerText != "" {
					answerUpdates["answer_text"] = a.AnswerText
				}
				if a.IsCorrect != nil {
					answerUpdates["is_correct"] = *a.IsCorrect
				}

				// Only update if there are changes
				if len(answerUpdates) > 0 {
					answerUpdates["updated_at"] = time.Now()
					// Check if the answer exists and belongs to this question
					var answer models.Answer
					result := tx.Where("id = ? AND question_id = ?", a.ID, questionID).First(&answer)
					if result.Error != nil {
						return fmt.Errorf("Answer ID %d not found for this question", a.ID)
					}

					if err := tx.Model(&answer).Updates(answerUpdates).Error; err != nil {
						return err
					}
				}
			}
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating question: "+err.Error())
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, userID, "Update Question", fmt.Sprintf("Updated question ID %d in test ID %d", questionID, testID))

	utils.RespondWithSuccess(w, http.StatusOK, "Question updated successfully", nil)
}

// DeleteQuestion deletes a question and its answers
func (h *AdminHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID and question ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["test_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	questionID, err := strconv.Atoi(vars["question_id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to modify this test")
		return
	}

	// Check if question exists and belongs to the test
	var question models.Question
	if err := h.DB.Where("id = ? AND test_id = ?", questionID, testID).First(&question).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Question not found in this test")
		return
	}

	// Delete question and answers in a transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete student responses for this question
		if err := tx.Exec(`
			DELETE FROM student_responses 
			WHERE question_id = ?
		`, questionID).Error; err != nil {
			return err
		}

		// Delete answers for this question
		if err := tx.Where("question_id = ?", questionID).Delete(&models.Answer{}).Error; err != nil {
			return err
		}

		// Delete the question
		if err := tx.Delete(&question).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting question: "+err.Error())
		return
	}

	// Log the action
	dashboardUtils.LogAction(h.DB, userID, "Delete Question", fmt.Sprintf("Deleted question ID %d from test ID %d", questionID, testID))

	utils.RespondWithSuccess(w, http.StatusOK, "Question deleted successfully", nil)
}

// GetTestStatistics returns detailed statistics for a test
func (h *AdminHandler) GetTestStatistics(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := dashboardUtils.GetUserIDFromContext(r.Context())
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

	// Check if test exists and belongs to the user
	var test models.Test
	if err := h.DB.First(&test, testID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Check if the user is the creator of the test or an admin
	userRole, _ := dashboardUtils.GetUserRoleFromContext(r.Context())
	if test.CreatorID != userID && userRole != "admin" {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to view statistics for this test")
		return
	}

	// Get overall statistics
	var overallStats struct {
		TotalAttempts     int     `json:"total_attempts"`
		CompletedAttempts int     `json:"completed_attempts"`
		AverageScore      float64 `json:"average_score"`
		HighestScore      int     `json:"highest_score"`
		LowestScore       int     `json:"lowest_score"`
		AverageDuration   int     `json:"average_duration"` // In seconds
	}

	h.DB.Raw(`
		SELECT 
			COUNT(*) as total_attempts,
			SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_attempts,
			COALESCE(AVG(CASE WHEN completed = true THEN score ELSE NULL END), 0) as average_score,
			COALESCE(MAX(CASE WHEN completed = true THEN score ELSE 0 END), 0) as highest_score,
			COALESCE(MIN(CASE WHEN completed = true THEN score ELSE 0 END), 0) as lowest_score,
			COALESCE(AVG(CASE WHEN completed = true AND end_time IS NOT NULL 
				THEN EXTRACT(EPOCH FROM (end_time - start_time)) ELSE NULL END), 0) as average_duration
		FROM test_attempts
		WHERE test_id = ?
	`, testID).Scan(&overallStats)

	// Get question-specific statistics
	var questionStats []struct {
		QuestionID       int     `json:"question_id"`
		QuestionText     string  `json:"question_text"`
		Position         int     `json:"position"`
		CorrectCount     int     `json:"correct_count"`
		AttemptedCount   int     `json:"attempted_count"`
		CorrectPercent   float64 `json:"correct_percent"`
		AverageTimeSpent int     `json:"average_time_spent"` // In seconds
	}

	h.DB.Raw(`
		SELECT 
			q.id as question_id,
			q.question_text,
			q.position,
			COUNT(sr.id) as attempted_count,
			SUM(CASE WHEN sr.is_correct = true THEN 1 ELSE 0 END) as correct_count,
			CASE WHEN COUNT(sr.id) > 0 
				THEN (SUM(CASE WHEN sr.is_correct = true THEN 1 ELSE 0 END) * 100.0 / COUNT(sr.id)) 
				ELSE 0 END as correct_percent,
			COALESCE(AVG(sr.time_spent), 0) as average_time_spent
		FROM questions q
		LEFT JOIN student_responses sr ON q.id = sr.question_id
		WHERE q.test_id = ?
		GROUP BY q.id, q.question_text, q.position
		ORDER BY q.position
	`, testID).Scan(&questionStats)

	// Get student performance
	var studentPerformance []struct {
		StudentID    int    `json:"student_id"`
		StudentName  string `json:"student_name"`
		AttemptCount int    `json:"attempt_count"`
		HighestScore int    `json:"highest_score"`
		LastAttempt  string `json:"last_attempt"`
	}

	h.DB.Raw(`
		SELECT 
			s.id as student_id,
			s.student_fio as student_name,
			COUNT(ta.id) as attempt_count,
			MAX(ta.score) as highest_score,
			MAX(ta.start_time) as last_attempt
		FROM test_attempts ta
		JOIN students s ON ta.student_id = s.id
		WHERE ta.test_id = ?
		GROUP BY s.id, s.student_fio
		ORDER BY highest_score DESC, last_attempt DESC
	`, testID).Scan(&studentPerformance)

	response := map[string]interface{}{
		"test_info": map[string]interface{}{
			"id":         test.ID,
			"title":      test.Title,
			"subject":    test.Subject,
			"is_active":  test.IsActive,
			"created_at": test.CreatedAt,
		},
		"overall_stats":       overallStats,
		"question_stats":      questionStats,
		"student_performance": studentPerformance,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test statistics retrieved successfully", response)
}
