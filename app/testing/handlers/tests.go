package handlers

import (
	"TeacherJournal/app/dashboard/utils"
	"TeacherJournal/app/testing/models"
	testingUtils "TeacherJournal/app/testing/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// TestHandler handles test-related requests
type TestHandler struct {
	DB *gorm.DB
}

// NewTestHandler creates a new TestHandler
func NewTestHandler(database *gorm.DB) *TestHandler {
	return &TestHandler{
		DB: database,
	}
}

// TestRequest is the request structure for creating/updating a test
type TestRequest struct {
	Title           string   `json:"title"`
	Subject         string   `json:"subject"`
	Description     string   `json:"description"`
	MaxAttempts     int      `json:"max_attempts"`
	TimePerQuestion int      `json:"time_per_question"`
	Active          bool     `json:"active"`
	GroupsAllowed   []string `json:"groups_allowed"`
}

// TestResponse is the response structure for test data
type TestResponse struct {
	ID              int       `json:"id"`
	Title           string    `json:"title"`
	Subject         string    `json:"subject"`
	Description     string    `json:"description"`
	MaxAttempts     int       `json:"max_attempts"`
	TimePerQuestion int       `json:"time_per_question"`
	Active          bool      `json:"active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	QuestionsCount  int       `json:"questions_count"`
	GroupsAllowed   []string  `json:"groups_allowed"`
}

// QuestionRequest is the request structure for creating/updating a question
type QuestionRequest struct {
	QuestionText  string          `json:"question_text"`
	QuestionOrder int             `json:"question_order"`
	Answers       []AnswerRequest `json:"answers"`
}

// AnswerRequest is the request structure for creating/updating an answer
type AnswerRequest struct {
	AnswerText string `json:"answer_text"`
	IsCorrect  bool   `json:"is_correct"`
}

// QuestionResponse is the response structure for question data
type QuestionResponse struct {
	ID            int              `json:"id"`
	QuestionText  string           `json:"question_text"`
	QuestionOrder int              `json:"question_order"`
	Answers       []AnswerResponse `json:"answers"`
}

// AnswerResponse is the response structure for answer data
type AnswerResponse struct {
	ID         int    `json:"id"`
	AnswerText string `json:"answer_text"`
	IsCorrect  bool   `json:"is_correct"`
}

// GroupsRequest is the request structure for managing test group access
type GroupsRequest struct {
	Groups []string `json:"groups"`
}

// CreateTest creates a new test
func (h *TestHandler) CreateTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req TestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.Title == "" || req.Subject == "" {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Title and subject are required")
		return
	}

	// Set default values if needed
	if req.MaxAttempts <= 0 {
		req.MaxAttempts = 1
	}
	if req.TimePerQuestion <= 0 {
		req.TimePerQuestion = 60 // Default to 60 seconds
	}

	// Create new test
	test := models.Test{
		TeacherID:       userID,
		Title:           req.Title,
		Subject:         req.Subject,
		Description:     req.Description,
		MaxAttempts:     req.MaxAttempts,
		TimePerQuestion: req.TimePerQuestion,
		Active:          req.Active,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Start a transaction
	tx := h.DB.Begin()

	// Create the test
	if err := tx.Create(&test).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error creating test")
		return
	}

	// Add group access if provided
	if len(req.GroupsAllowed) > 0 {
		var groupAccess []models.TestGroupAccess
		for _, group := range req.GroupsAllowed {
			groupAccess = append(groupAccess, models.TestGroupAccess{
				TestID:    test.ID,
				GroupName: group,
			})
		}

		if err := tx.Create(&groupAccess).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error adding group access")
			return
		}
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Create Test", fmt.Sprintf("Created test '%s' for subject '%s'", req.Title, req.Subject))

	testingUtils.RespondWithSuccess(w, http.StatusCreated, "Test created successfully", map[string]interface{}{
		"id": test.ID,
	})
}

// GetTests retrieves all tests for the current teacher
func (h *TestHandler) GetTests(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Check if subject filter is provided
	subject := r.URL.Query().Get("subject")

	// Build query
	query := h.DB.Model(&models.Test{})

	// For admins, show all tests; for teachers, only show their own
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	// Apply subject filter if provided
	if subject != "" {
		query = query.Where("subject = ?", subject)
	}

	// Get tests
	var tests []models.Test
	if err := query.Order("created_at DESC").Find(&tests).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving tests")
		return
	}

	// Format response
	var response []TestResponse
	for _, test := range tests {
		// Get question count
		var questionCount int64
		h.DB.Model(&models.Question{}).Where("test_id = ?", test.ID).Count(&questionCount)

		// Get groups allowed
		var groupAccess []models.TestGroupAccess
		h.DB.Where("test_id = ?", test.ID).Find(&groupAccess)

		// Extract group names
		var groups []string
		for _, ga := range groupAccess {
			groups = append(groups, ga.GroupName)
		}

		response = append(response, TestResponse{
			ID:              test.ID,
			Title:           test.Title,
			Subject:         test.Subject,
			Description:     test.Description,
			MaxAttempts:     test.MaxAttempts,
			TimePerQuestion: test.TimePerQuestion,
			Active:          test.Active,
			CreatedAt:       test.CreatedAt,
			UpdatedAt:       test.UpdatedAt,
			QuestionsCount:  int(questionCount),
			GroupsAllowed:   groups,
		})
	}

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Tests retrieved successfully", response)
}

// GetTest retrieves a specific test by ID
func (h *TestHandler) GetTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Get test from database
	var test models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&test).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found")
		return
	}

	// Get questions with answers
	var questions []models.Question
	if err := h.DB.Where("test_id = ?", testID).Order("question_order").Find(&questions).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	// Get groups allowed for this test
	var groupAccess []models.TestGroupAccess
	h.DB.Where("test_id = ?", testID).Find(&groupAccess)

	// Extract group names
	var groups []string
	for _, ga := range groupAccess {
		groups = append(groups, ga.GroupName)
	}

	// Format questions and answers
	var questionResponses []QuestionResponse
	for _, q := range questions {
		// Get answers for this question
		var answers []models.Answer
		if err := h.DB.Where("question_id = ?", q.ID).Find(&answers).Error; err != nil {
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving answers")
			return
		}

		// Format answers
		var answerResponses []AnswerResponse
		for _, a := range answers {
			answerResponses = append(answerResponses, AnswerResponse{
				ID:         a.ID,
				AnswerText: a.AnswerText,
				IsCorrect:  a.IsCorrect,
			})
		}

		questionResponses = append(questionResponses, QuestionResponse{
			ID:            q.ID,
			QuestionText:  q.QuestionText,
			QuestionOrder: q.QuestionOrder,
			Answers:       answerResponses,
		})
	}

	// Format response
	response := struct {
		ID              int                `json:"id"`
		Title           string             `json:"title"`
		Subject         string             `json:"subject"`
		Description     string             `json:"description"`
		MaxAttempts     int                `json:"max_attempts"`
		TimePerQuestion int                `json:"time_per_question"`
		Active          bool               `json:"active"`
		CreatedAt       time.Time          `json:"created_at"`
		UpdatedAt       time.Time          `json:"updated_at"`
		Questions       []QuestionResponse `json:"questions"`
		GroupsAllowed   []string           `json:"groups_allowed"`
	}{
		ID:              test.ID,
		Title:           test.Title,
		Subject:         test.Subject,
		Description:     test.Description,
		MaxAttempts:     test.MaxAttempts,
		TimePerQuestion: test.TimePerQuestion,
		Active:          test.Active,
		CreatedAt:       test.CreatedAt,
		UpdatedAt:       test.UpdatedAt,
		Questions:       questionResponses,
		GroupsAllowed:   groups,
	}

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test retrieved successfully", response)
}

// UpdateTest updates an existing test
func (h *TestHandler) UpdateTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Parse request body
	var req TestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.Title == "" || req.Subject == "" {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Title and subject are required")
		return
	}

	// Set default values if needed
	if req.MaxAttempts <= 0 {
		req.MaxAttempts = 1
	}
	if req.TimePerQuestion <= 0 {
		req.TimePerQuestion = 60 // Default to 60 seconds
	}

	// Create transaction for updating test and group access
	tx := h.DB.Begin()

	// Update test
	if err := tx.Model(&existingTest).Updates(map[string]interface{}{
		"title":             req.Title,
		"subject":           req.Subject,
		"description":       req.Description,
		"max_attempts":      req.MaxAttempts,
		"time_per_question": req.TimePerQuestion,
		"active":            req.Active,
		"updated_at":        time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error updating test")
		return
	}

	// Update group access if provided
	if len(req.GroupsAllowed) > 0 {
		// Delete existing group access
		if err := tx.Where("test_id = ?", testID).Delete(&models.TestGroupAccess{}).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error updating group access")
			return
		}

		// Add new group access
		var groupAccess []models.TestGroupAccess
		for _, group := range req.GroupsAllowed {
			groupAccess = append(groupAccess, models.TestGroupAccess{
				TestID:    testID,
				GroupName: group,
			})
		}

		if err := tx.Create(&groupAccess).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error adding group access")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Update Test", fmt.Sprintf("Updated test '%s' (ID: %d)", req.Title, testID))

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test updated successfully", nil)
}

// DeleteTest deletes a test and all associated questions and answers
func (h *TestHandler) DeleteTest(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Get all questions to find associated answers
	var questions []models.Question
	if err := tx.Where("test_id = ?", testID).Find(&questions).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	// Delete all answers for each question
	for _, q := range questions {
		if err := tx.Where("question_id = ?", q.ID).Delete(&models.Answer{}).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting answers")
			return
		}
	}

	// Delete all questions
	if err := tx.Where("test_id = ?", testID).Delete(&models.Question{}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting questions")
		return
	}

	// Delete all group access
	if err := tx.Where("test_id = ?", testID).Delete(&models.TestGroupAccess{}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting group access")
		return
	}

	// Delete all student answers for this test's attempts
	var attempts []models.TestAttempt
	if err := tx.Where("test_id = ?", testID).Find(&attempts).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test attempts")
		return
	}

	for _, attempt := range attempts {
		if err := tx.Where("test_attempt_id = ?", attempt.ID).Delete(&models.StudentAnswer{}).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting student answers")
			return
		}
	}

	// Delete all test attempts
	if err := tx.Where("test_id = ?", testID).Delete(&models.TestAttempt{}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting test attempts")
		return
	}

	// Finally delete the test
	if err := tx.Delete(&existingTest).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting test")
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Test", fmt.Sprintf("Deleted test '%s' (ID: %d)", existingTest.Title, testID))

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test deleted successfully", nil)
}

// ToggleTestActive activates or deactivates a test
func (h *TestHandler) ToggleTestActive(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Parse request body to get active state
	var req struct {
		Active bool `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Update the active state
	if err := h.DB.Model(&existingTest).Updates(map[string]interface{}{
		"active":     req.Active,
		"updated_at": time.Now(),
	}).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error updating test")
		return
	}

	// Log the action
	action := "Activated"
	if !req.Active {
		action = "Deactivated"
	}
	utils.LogAction(h.DB, userID, "Toggle Test Active",
		fmt.Sprintf("%s test '%s' (ID: %d)", action, existingTest.Title, testID))

	testingUtils.RespondWithSuccess(w, http.StatusOK, fmt.Sprintf("Test %s successfully",
		map[bool]string{true: "activated", false: "deactivated"}[req.Active]), nil)
}

// AddQuestion adds a new question to a test
func (h *TestHandler) AddQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Parse request body
	var req QuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.QuestionText == "" {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Question text is required")
		return
	}

	// If question order is not specified, get the next order
	if req.QuestionOrder <= 0 {
		var maxOrder int
		h.DB.Model(&models.Question{}).Where("test_id = ?", testID).Select("COALESCE(MAX(question_order), 0)").Scan(&maxOrder)
		req.QuestionOrder = maxOrder + 1
	}

	// Start transaction
	tx := h.DB.Begin()

	// Create question
	question := models.Question{
		TestID:        testID,
		QuestionText:  req.QuestionText,
		QuestionOrder: req.QuestionOrder,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := tx.Create(&question).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error creating question")
		return
	}

	// Add answers if provided
	if len(req.Answers) > 0 {
		var answers []models.Answer
		for _, answerReq := range req.Answers {
			answers = append(answers, models.Answer{
				QuestionID: question.ID,
				AnswerText: answerReq.AnswerText,
				IsCorrect:  answerReq.IsCorrect,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			})
		}

		if err := tx.Create(&answers).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error creating answers")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Add Question",
		fmt.Sprintf("Added question to test '%s' (ID: %d)", existingTest.Title, testID))

	testingUtils.RespondWithSuccess(w, http.StatusCreated, "Question added successfully", map[string]interface{}{
		"id": question.ID,
	})
}

// UpdateQuestion updates an existing question
func (h *TestHandler) UpdateQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID and question ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}
	questionID, err := strconv.Atoi(vars["qid"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Check if question exists and belongs to this test
	var existingQuestion models.Question
	if err := h.DB.Where("id = ? AND test_id = ?", questionID, testID).First(&existingQuestion).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Question not found")
		return
	}

	// Parse request body
	var req QuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.QuestionText == "" {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Question text is required")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Update question
	if err := tx.Model(&existingQuestion).Updates(map[string]interface{}{
		"question_text":  req.QuestionText,
		"question_order": req.QuestionOrder,
		"updated_at":     time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error updating question")
		return
	}

	// Update answers if provided
	if len(req.Answers) > 0 {
		// Delete existing answers
		if err := tx.Where("question_id = ?", questionID).Delete(&models.Answer{}).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting existing answers")
			return
		}

		// Add new answers
		var answers []models.Answer
		for _, answerReq := range req.Answers {
			answers = append(answers, models.Answer{
				QuestionID: questionID,
				AnswerText: answerReq.AnswerText,
				IsCorrect:  answerReq.IsCorrect,
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			})
		}

		if err := tx.Create(&answers).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error creating answers")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Update Question",
		fmt.Sprintf("Updated question (ID: %d) for test '%s'", questionID, existingTest.Title))

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Question updated successfully", nil)
}

// DeleteQuestion deletes a question and its answers
func (h *TestHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID and question ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}
	questionID, err := strconv.Atoi(vars["qid"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid question ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Check if question exists and belongs to this test
	var existingQuestion models.Question
	if err := h.DB.Where("id = ? AND test_id = ?", questionID, testID).First(&existingQuestion).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Question not found")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Delete answers first
	if err := tx.Where("question_id = ?", questionID).Delete(&models.Answer{}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting answers")
		return
	}

	// Delete question
	if err := tx.Delete(&existingQuestion).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error deleting question")
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Question",
		fmt.Sprintf("Deleted question (ID: %d) from test '%s'", questionID, existingTest.Title))

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Question deleted successfully", nil)
}

// GetTestStatistics retrieves statistics for a test
func (h *TestHandler) GetTestStatistics(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Get basic test info
	var totalQuestions int64
	h.DB.Model(&models.Question{}).Where("test_id = ?", testID).Count(&totalQuestions)

	// Get attempt statistics
	var totalAttempts int64
	var completedAttempts int64
	var avgScore float64
	var avgTime float64

	h.DB.Model(&models.TestAttempt{}).Where("test_id = ?", testID).Count(&totalAttempts)
	h.DB.Model(&models.TestAttempt{}).Where("test_id = ? AND completed = ?", testID, true).Count(&completedAttempts)

	// Average score and time for completed attempts
	h.DB.Model(&models.TestAttempt{}).
		Where("test_id = ? AND completed = ?", testID, true).
		Select("COALESCE(AVG(score), 0) as avg_score").
		Scan(&avgScore)

	h.DB.Model(&models.TestAttempt{}).
		Where("test_id = ? AND completed = ?", testID, true).
		Select("COALESCE(AVG(total_time), 0) as avg_time").
		Scan(&avgTime)

	// Get question statistics
	type QuestionStat struct {
		QuestionID      int     `json:"question_id"`
		QuestionText    string  `json:"question_text"`
		CorrectPercent  float64 `json:"correct_percent"`
		AvgTimeToAnswer float64 `json:"avg_time_to_answer"`
		AttemptCount    int     `json:"attempt_count"`
	}

	var questionStats []QuestionStat
	var questions []models.Question

	// Get all questions for this test
	if err := h.DB.Where("test_id = ?", testID).Order("question_order").Find(&questions).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving questions")
		return
	}

	// Calculate statistics for each question
	for _, q := range questions {
		var stat QuestionStat
		stat.QuestionID = q.ID
		stat.QuestionText = q.QuestionText

		// Count how many times this question was attempted
		var attemptCount int64
		h.DB.Model(&models.StudentAnswer{}).
			Joins("JOIN test_attempts ON student_answers.test_attempt_id = test_attempts.id").
			Where("test_attempts.test_id = ? AND student_answers.question_id = ?", testID, q.ID).
			Count(&attemptCount)

		stat.AttemptCount = int(attemptCount)

		// Calculate percentage of correct answers
		var correctCount int64
		h.DB.Model(&models.StudentAnswer{}).
			Joins("JOIN test_attempts ON student_answers.test_attempt_id = test_attempts.id").
			Where("test_attempts.test_id = ? AND student_answers.question_id = ? AND student_answers.is_correct = ?", testID, q.ID, true).
			Count(&correctCount)

		if attemptCount > 0 {
			stat.CorrectPercent = float64(correctCount) / float64(attemptCount) * 100
		}

		// Calculate average time spent on this question
		var avgTimeSpent float64
		h.DB.Model(&models.StudentAnswer{}).
			Joins("JOIN test_attempts ON student_answers.test_attempt_id = test_attempts.id").
			Where("test_attempts.test_id = ? AND student_answers.question_id = ?", testID, q.ID).
			Select("COALESCE(AVG(time_spent), 0) as avg_time").
			Scan(&avgTimeSpent)

		stat.AvgTimeToAnswer = avgTimeSpent

		questionStats = append(questionStats, stat)
	}

	// Format response
	response := struct {
		TestID            int            `json:"test_id"`
		Title             string         `json:"title"`
		Subject           string         `json:"subject"`
		TotalQuestions    int            `json:"total_questions"`
		TotalAttempts     int            `json:"total_attempts"`
		CompletedAttempts int            `json:"completed_attempts"`
		AvgScore          float64        `json:"avg_score"`
		AvgTime           float64        `json:"avg_time"`
		QuestionStats     []QuestionStat `json:"question_stats"`
	}{
		TestID:            testID,
		Title:             existingTest.Title,
		Subject:           existingTest.Subject,
		TotalQuestions:    int(totalQuestions),
		TotalAttempts:     int(totalAttempts),
		CompletedAttempts: int(completedAttempts),
		AvgScore:          avgScore,
		AvgTime:           avgTime,
		QuestionStats:     questionStats,
	}

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test statistics retrieved successfully", response)
}

// GetTestAttempts retrieves all attempts for a test
func (h *TestHandler) GetTestAttempts(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Get attempts for this test
	var attempts []models.TestAttempt
	if err := h.DB.Where("test_id = ?", testID).Order("started_at DESC").Find(&attempts).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test attempts")
		return
	}

	// Format response with student names
	type AttemptResponse struct {
		ID             int        `json:"id"`
		StudentID      int        `json:"student_id"`
		StudentName    string     `json:"student_name"`
		GroupName      string     `json:"group_name"`
		StartedAt      time.Time  `json:"started_at"`
		FinishedAt     *time.Time `json:"finished_at,omitempty"`
		TotalTime      int        `json:"total_time"`
		Score          float64    `json:"score"`
		CorrectAnswers int        `json:"correct_answers"`
		TotalQuestions int        `json:"total_questions"`
		Completed      bool       `json:"completed"`
	}

	var response []AttemptResponse

	for _, attempt := range attempts {
		// Get student info
		var studentName string
		var groupName string
		h.DB.Raw(`
			SELECT s.student_fio, s.group_name 
			FROM students s 
			WHERE s.id = ?
		`, attempt.StudentID).Row().Scan(&studentName, &groupName)

		response = append(response, AttemptResponse{
			ID:             attempt.ID,
			StudentID:      attempt.StudentID,
			StudentName:    studentName,
			GroupName:      groupName,
			StartedAt:      attempt.StartedAt,
			FinishedAt:     attempt.FinishedAt,
			TotalTime:      attempt.TotalTime,
			Score:          attempt.Score,
			CorrectAnswers: attempt.CorrectAnswers,
			TotalQuestions: attempt.TotalQuestions,
			Completed:      attempt.Completed,
		})
	}

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test attempts retrieved successfully", response)
}

// ManageTestGroups manages which groups have access to a test
func (h *TestHandler) ManageTestGroups(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get test ID from URL
	vars := mux.Vars(r)
	testID, err := strconv.Atoi(vars["id"])
	if err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid test ID")
		return
	}

	// Check if test exists and user has access
	var existingTest models.Test
	query := h.DB.Where("id = ?", testID)

	// If not admin, restrict to tests created by this user
	if userRole != "admin" {
		query = query.Where("teacher_id = ?", userID)
	}

	if err := query.First(&existingTest).Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusNotFound, "Test not found or access denied")
		return
	}

	// Parse request body
	var req GroupsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		testingUtils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Delete existing group access
	if err := tx.Where("test_id = ?", testID).Delete(&models.TestGroupAccess{}).Error; err != nil {
		tx.Rollback()
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error updating group access")
		return
	}

	// Add new group access
	if len(req.Groups) > 0 {
		var groupAccess []models.TestGroupAccess
		for _, group := range req.Groups {
			groupAccess = append(groupAccess, models.TestGroupAccess{
				TestID:    testID,
				GroupName: group,
			})
		}

		if err := tx.Create(&groupAccess).Error; err != nil {
			tx.Rollback()
			testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error adding group access")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		testingUtils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Manage Test Groups",
		fmt.Sprintf("Updated group access for test '%s' (ID: %d)", existingTest.Title, testID))

	testingUtils.RespondWithSuccess(w, http.StatusOK, "Test group access updated successfully", nil)
}
