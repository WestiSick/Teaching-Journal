package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
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

// StudentDetailResponse is the standard format for detailed student data returned in API responses
type StudentDetailResponse struct {
	ID        int    `json:"id"`
	FIO       string `json:"fio"`
	GroupName string `json:"group_name"`
}

// GetStudents returns all students for the current user, with optional group filter
func (h *StudentHandler) GetStudents(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Optional query parameter for filtering by group
	groupName := r.URL.Query().Get("group")

	// Build query
	query := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio, group_name").
		Where("teacher_id = ?", userID)

	// Apply group filter if provided
	if groupName != "" {
		query = query.Where("group_name = ?", groupName)
	}

	// Get students
	var students []StudentDetailResponse
	if err := query.Order("student_fio").Find(&students).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Students retrieved successfully", students)
}

// GetStudent returns a specific student by ID
func (h *StudentHandler) GetStudent(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get student ID from URL
	vars := mux.Vars(r)
	studentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid student ID")
		return
	}

	// Get student from database
	var student StudentDetailResponse
	if err := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio, group_name").
		Where("id = ? AND teacher_id = ?", studentID, userID).
		First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Get additional information - attendance statistics, lab grades if needed
	// For now, just return the basic info
	utils.RespondWithSuccess(w, http.StatusOK, "Student retrieved successfully", student)
}

// CreateStudentRequest defines the request body for creating a student
type CreateStudentRequest struct {
	FIO       string `json:"fio"`
	GroupName string `json:"group_name"`
}

// CreateStudent creates a new student
func (h *StudentHandler) CreateStudent(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req CreateStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.FIO == "" || req.GroupName == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Student name and group are required")
		return
	}

	// Check if group exists
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? AND group_name = ?
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ? AND group_name = ?
		) AS combined_groups
	`, userID, req.GroupName, userID, req.GroupName).Count(&count)

	if count == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Group not found")
		return
	}

	// Create student
	student := models.Student{
		TeacherID:  userID,
		GroupName:  req.GroupName,
		StudentFIO: req.FIO,
	}

	if err := h.DB.Create(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating student")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Create Student",
		fmt.Sprintf("Created student %s in group %s", req.FIO, req.GroupName))

	utils.RespondWithSuccess(w, http.StatusCreated, "Student created successfully", map[string]interface{}{
		"id": student.ID,
	})
}

// UpdateStudentRequest defines the request body for updating a student
type UpdateStudentRequest struct {
	FIO       string `json:"fio,omitempty"`
	GroupName string `json:"group_name,omitempty"`
}

// UpdateStudent updates an existing student
func (h *StudentHandler) UpdateStudent(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get student ID from URL
	vars := mux.Vars(r)
	studentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid student ID")
		return
	}

	// Parse request body
	var req UpdateStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Get current student info for logging
	var currentStudent models.Student
	if err := h.DB.Where("id = ? AND teacher_id = ?", studentID, userID).First(&currentStudent).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Create updates map
	updates := make(map[string]interface{})

	// Add FIO update if provided
	if req.FIO != "" {
		updates["student_fio"] = req.FIO
	}

	// Check and add group update if provided
	if req.GroupName != "" && req.GroupName != currentStudent.GroupName {
		// Verify the new group exists
		var count int64
		h.DB.Raw(`
			SELECT COUNT(*) 
			FROM (
				SELECT group_name FROM lessons WHERE teacher_id = ? AND group_name = ?
				UNION 
				SELECT group_name FROM students WHERE teacher_id = ? AND group_name = ?
			) AS combined_groups
		`, userID, req.GroupName, userID, req.GroupName).Count(&count)

		if count == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "New group not found")
			return
		}

		updates["group_name"] = req.GroupName
	}

	// If no updates provided
	if len(updates) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "No updates provided")
		return
	}

	// Update student
	if err := h.DB.Model(&models.Student{}).
		Where("id = ? AND teacher_id = ?", studentID, userID).
		Updates(updates).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating student")
		return
	}

	// Log the action
	logDetails := "Updated student ID " + strconv.Itoa(studentID) + ": "
	if req.FIO != "" {
		logDetails += "name to " + req.FIO
	}
	if req.GroupName != "" && req.GroupName != currentStudent.GroupName {
		if req.FIO != "" {
			logDetails += ", "
		}
		logDetails += "moved from group " + currentStudent.GroupName + " to " + req.GroupName
	}

	utils.LogAction(h.DB, userID, "Update Student", logDetails)

	utils.RespondWithSuccess(w, http.StatusOK, "Student updated successfully", nil)
}

// DeleteStudent deletes a student
func (h *StudentHandler) DeleteStudent(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get student ID from URL
	vars := mux.Vars(r)
	studentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid student ID")
		return
	}

	// Get student info for logging before deletion
	var student models.Student
	if err := h.DB.Where("id = ? AND teacher_id = ?", studentID, userID).First(&student).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Delete student
	if err := h.DB.Where("id = ? AND teacher_id = ?", studentID, userID).Delete(&models.Student{}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting student")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Student",
		fmt.Sprintf("Deleted student %s (ID: %d) from group %s", student.StudentFIO, studentID, student.GroupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Student deleted successfully", nil)
}
