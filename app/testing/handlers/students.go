package handlers

import (
	"TeacherJournal/app/dashboard/models"
	dashboardUtils "TeacherJournal/app/dashboard/utils"
	testingModels "TeacherJournal/app/testing/models"
	"TeacherJournal/app/testing/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// StudentHandler handles student-related requests
type StudentHandler struct {
	DB *gorm.DB
}

// NewStudentHandler creates a new StudentHandler
func NewStudentHandler(database *gorm.DB) *StudentHandler {
	return &StudentHandler{
		DB: database,
	}
}

// RegisterRequest defines the request structure for student registration
type RegisterRequest struct {
	FIO       string `json:"fio"`
	GroupName string `json:"group_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

// LoginRequest defines the request structure for student login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse defines the response structure for successful login
type LoginResponse struct {
	Token     string `json:"token"`
	StudentID int    `json:"student_id"`
	FIO       string `json:"fio"`
	GroupName string `json:"group_name"`
}

// Register handles student registration
func (h *StudentHandler) Register(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.FIO == "" || req.GroupName == "" || req.Email == "" || req.Password == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	// Check if email already exists
	var existingStudentInfo testingModels.StudentInfo
	if err := h.DB.Where("email = ?", req.Email).First(&existingStudentInfo).Error; err == nil {
		utils.RespondWithError(w, http.StatusConflict, "Email already registered")
		return
	}

	// Start transaction
	tx := h.DB.Begin()

	// Check if student with this FIO already exists in the group
	var existingStudent models.Student
	studentExists := false
	err := tx.Where("student_fio = ? AND group_name = ?", req.FIO, req.GroupName).First(&existingStudent).Error
	if err == nil {
		studentExists = true
	}

	var studentID int

	if !studentExists {
		// Find teacher ID for this group
		var teacherID int
		err := tx.Raw(`
			SELECT DISTINCT teacher_id
			FROM (
				SELECT teacher_id FROM lessons WHERE group_name = ?
				UNION
				SELECT teacher_id FROM students WHERE group_name = ?
			) AS combined
		`, req.GroupName, req.GroupName).Scan(&teacherID).Error

		if err != nil || teacherID == 0 {
			tx.Rollback()
			utils.RespondWithError(w, http.StatusNotFound, "Group not found or has no assigned teacher")
			return
		}

		// Create new student
		newStudent := models.Student{
			TeacherID:  teacherID,
			GroupName:  req.GroupName,
			StudentFIO: req.FIO,
		}

		if err := tx.Create(&newStudent).Error; err != nil {
			tx.Rollback()
			utils.RespondWithError(w, http.StatusInternalServerError, "Error creating student")
			return
		}

		studentID = newStudent.ID
	} else {
		studentID = existingStudent.ID
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		utils.RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}

	// Create student info
	studentInfo := testingModels.StudentInfo{
		StudentID: studentID,
		Email:     req.Email,
		Password:  string(hashedPassword),
	}

	if err := tx.Create(&studentInfo).Error; err != nil {
		tx.Rollback()
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating student info")
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error committing transaction")
		return
	}

	// Generate token for the student
	token, err := utils.GenerateStudentJWT(studentID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	// Format response
	response := LoginResponse{
		Token:     token,
		StudentID: studentID,
		FIO:       req.FIO,
		GroupName: req.GroupName,
	}

	// Log action
	dashboardUtils.LogAction(h.DB, studentID, "Student Registration",
		fmt.Sprintf("Student registered: %s, Group: %s", req.FIO, req.GroupName))

	utils.RespondWithSuccess(w, http.StatusCreated, "Student registered successfully", response)
}

// Login handles student login
func (h *StudentHandler) Login(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Find student info by email
	var studentInfo testingModels.StudentInfo
	if err := h.DB.Where("email = ?", req.Email).First(&studentInfo).Error; err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(studentInfo.Password), []byte(req.Password)); err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Get student details
	var student models.Student
	if err := h.DB.Where("id = ?", studentInfo.StudentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving student details")
		return
	}

	// Generate token for the student
	token, err := utils.GenerateStudentJWT(studentInfo.StudentID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	// Format response
	response := LoginResponse{
		Token:     token,
		StudentID: studentInfo.StudentID,
		FIO:       student.StudentFIO,
		GroupName: student.GroupName,
	}

	// Log action
	dashboardUtils.LogAction(h.DB, studentInfo.StudentID, "Student Login",
		fmt.Sprintf("Student logged in: %s, Group: %s", student.StudentFIO, student.GroupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Login successful", response)
}

// GetAvailableTests retrieves tests available to the student
func (h *StudentHandler) GetAvailableTests(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get student details
	var student models.Student
	if err := h.DB.Where("id = ?", studentID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Find available tests for this student's group
	var tests []struct {
		ID              int       `json:"id"`
		Title           string    `json:"title"`
		Subject         string    `json:"subject"`
		Description     string    `json:"description"`
		MaxAttempts     int       `json:"max_attempts"`
		TimePerQuestion int       `json:"time_per_question"`
		CreatedAt       time.Time `json:"created_at"`
		UpdatedAt       time.Time `json:"updated_at"`
		TeacherID       int       `json:"teacher_id"`
		TeacherName     string    `json:"teacher_name"`
		QuestionCount   int       `json:"question_count"`
		AttemptsMade    int       `json:"attempts_made"`
		BestScore       float64   `json:"best_score"`
	}

	query := `
		SELECT 
			t.id, t.title, t.subject, t.description, t.max_attempts, t.time_per_question, 
			t.created_at, t.updated_at, t.teacher_id, u.fio as teacher_name,
			(SELECT COUNT(*) FROM questions WHERE test_id = t.id) as question_count,
			(SELECT COUNT(*) FROM test_attempts WHERE test_id = t.id AND student_id = ?) as attempts_made,
			COALESCE((SELECT MAX(score) FROM test_attempts WHERE test_id = t.id AND student_id = ? AND completed = true), 0) as best_score
		FROM tests t
		JOIN test_group_access tga ON t.id = tga.test_id
		JOIN users u ON t.teacher_id = u.id
		WHERE tga.group_name = ? AND t.active = true
		ORDER BY t.created_at DESC
	`

	if err := h.DB.Raw(query, studentID, studentID, student.GroupName).Scan(&tests).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving tests")
		return
	}

	// Format response
	type TestResponse struct {
		ID               int       `json:"id"`
		Title            string    `json:"title"`
		Subject          string    `json:"subject"`
		Description      string    `json:"description"`
		MaxAttempts      int       `json:"max_attempts"`
		TimePerQuestion  int       `json:"time_per_question"`
		CreatedAt        time.Time `json:"created_at"`
		UpdatedAt        time.Time `json:"updated_at"`
		TeacherName      string    `json:"teacher_name"`
		QuestionCount    int       `json:"question_count"`
		AttemptsMade     int       `json:"attempts_made"`
		AttemptsPossible int       `json:"attempts_possible"`
		BestScore        float64   `json:"best_score"`
		CanTake          bool      `json:"can_take"`
	}

	var response []TestResponse
	for _, test := range tests {
		attemptsPossible := test.MaxAttempts - test.AttemptsMade
		if attemptsPossible < 0 {
			attemptsPossible = 0
		}

		response = append(response, TestResponse{
			ID:               test.ID,
			Title:            test.Title,
			Subject:          test.Subject,
			Description:      test.Description,
			MaxAttempts:      test.MaxAttempts,
			TimePerQuestion:  test.TimePerQuestion,
			CreatedAt:        test.CreatedAt,
			UpdatedAt:        test.UpdatedAt,
			TeacherName:      test.TeacherName,
			QuestionCount:    test.QuestionCount,
			AttemptsMade:     test.AttemptsMade,
			AttemptsPossible: attemptsPossible,
			BestScore:        test.BestScore,
			CanTake:          test.AttemptsMade < test.MaxAttempts,
		})
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Available tests retrieved successfully", response)
}

// GetAttemptHistory retrieves the student's test attempt history
func (h *StudentHandler) GetAttemptHistory(w http.ResponseWriter, r *http.Request) {
	// Get student ID from context
	studentID, err := utils.GetStudentIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get optional query parameters
	subject := r.URL.Query().Get("subject")
	completed := r.URL.Query().Get("completed")

	// Build query
	query := h.DB.Table("test_attempts ta").
		Select(`
			ta.id, ta.test_id, t.title, t.subject, ta.started_at, ta.finished_at, 
			ta.total_time, ta.score, ta.correct_answers, ta.total_questions, ta.completed
		`).
		Joins("JOIN tests t ON ta.test_id = t.id").
		Where("ta.student_id = ?", studentID)

	// Apply filters
	if subject != "" {
		query = query.Where("t.subject = ?", subject)
	}

	if completed != "" {
		isCompleted := strings.ToLower(completed) == "true"
		query = query.Where("ta.completed = ?", isCompleted)
	}

	// Get attempts
	var attempts []struct {
		ID             int        `json:"id"`
		TestID         int        `json:"test_id"`
		Title          string     `json:"title"`
		Subject        string     `json:"subject"`
		StartedAt      time.Time  `json:"started_at"`
		FinishedAt     *time.Time `json:"finished_at"`
		TotalTime      int        `json:"total_time"`
		Score          float64    `json:"score"`
		CorrectAnswers int        `json:"correct_answers"`
		TotalQuestions int        `json:"total_questions"`
		Completed      bool       `json:"completed"`
	}

	if err := query.Order("ta.started_at DESC").Find(&attempts).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving test attempts")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Test attempt history retrieved successfully", attempts)
}
