package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/tests/utils"
	"encoding/json"
	"net/http"
	"strconv"

	"gorm.io/gorm"
)

// StudentHandler handles student registration and authentication
type StudentHandler struct {
	DB *gorm.DB
}

// NewStudentHandler creates a new StudentHandler
func NewStudentHandler(database *gorm.DB) *StudentHandler {
	return &StudentHandler{
		DB: database,
	}
}

// RegisterStudentRequest defines the request body for student registration
type RegisterStudentRequest struct {
	FIO       string `json:"fio"`
	Email     string `json:"email"`
	GroupName string `json:"group_name"`
}

// RegisterStudent registers a student or updates their information
func (h *StudentHandler) RegisterStudent(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req RegisterStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.FIO == "" || req.Email == "" || req.GroupName == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	// Check if group exists
	var groupCount int64
	err := h.DB.Model(&models.Lesson{}).
		Where("group_name = ?", req.GroupName).
		Count(&groupCount).Error

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error checking group: "+err.Error())
		return
	}

	if groupCount == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Group not found")
		return
	}

	// Handle transaction for adding/updating the student
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// First check if this student already exists by FIO in any group
		var existingStudents []models.Student
		if err := tx.Where("student_fio = ?", req.FIO).Find(&existingStudents).Error; err != nil {
			return err
		}

		// Check if the email column exists in the students table
		// If not, we need to create it first
		if !tx.Migrator().HasColumn(&models.Student{}, "email") {
			if err := tx.Exec("ALTER TABLE students ADD COLUMN email VARCHAR(255)").Error; err != nil {
				return err
			}
		}

		// Update email using SQL directly since the Student model might not have the Email field yet
		if len(existingStudents) > 0 {
			if err := tx.Exec("UPDATE students SET email = ? WHERE student_fio = ?", req.Email, req.FIO).Error; err != nil {
				return err
			}

			// Check if the student is already in the requested group
			var studentInGroup models.Student
			result := tx.Where("student_fio = ? AND group_name = ?", req.FIO, req.GroupName).First(&studentInGroup)

			if result.Error != nil {
				// Student is not in this group yet, so add them to all teachers of this group
				var teacherIDs []int
				if err := tx.Model(&models.Lesson{}).
					Where("group_name = ?", req.GroupName).
					Distinct("teacher_id").
					Pluck("teacher_id", &teacherIDs).Error; err != nil {
					return err
				}

				// Add student to each teacher's group
				for _, teacherID := range teacherIDs {
					// Create the student with SQL to include the email field
					if err := tx.Exec(
						"INSERT INTO students (teacher_id, group_name, student_fio, email) VALUES (?, ?, ?, ?)",
						teacherID, req.GroupName, req.FIO, req.Email,
					).Error; err != nil {
						return err
					}
				}
			}
		} else {
			// Student doesn't exist yet, create new student entries for all teachers of this group
			var teacherIDs []int
			if err := tx.Model(&models.Lesson{}).
				Where("group_name = ?", req.GroupName).
				Distinct("teacher_id").
				Pluck("teacher_id", &teacherIDs).Error; err != nil {
				return err
			}

			if len(teacherIDs) == 0 {
				return gorm.ErrRecordNotFound
			}

			// Add student to each teacher's group
			for _, teacherID := range teacherIDs {
				// Create the student with SQL to include the email field
				if err := tx.Exec(
					"INSERT INTO students (teacher_id, group_name, student_fio, email) VALUES (?, ?, ?, ?)",
					teacherID, req.GroupName, req.FIO, req.Email,
				).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusBadRequest, "No teachers found for this group")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error registering student: "+err.Error())
		}
		return
	}

	// Fetch the created/updated student to return their ID
	var student struct {
		ID         int    `json:"id"`
		StudentFIO string `json:"student_fio"`
		GroupName  string `json:"group_name"`
		Email      string `json:"email"`
	}

	h.DB.Raw("SELECT id, student_fio, group_name, email FROM students WHERE student_fio = ? AND group_name = ? LIMIT 1",
		req.FIO, req.GroupName).Scan(&student)

	utils.RespondWithSuccess(w, http.StatusOK, "Student registered successfully", map[string]interface{}{
		"student_id": student.ID,
		"fio":        student.StudentFIO,
		"email":      student.Email,
		"group":      student.GroupName,
	})
}

// StudentLoginRequest defines the request body for student login
type StudentLoginRequest struct {
	FIO   string `json:"fio"`
	Email string `json:"email"`
}

// LoginStudent authenticates a student by their FIO and email
func (h *StudentHandler) LoginStudent(w http.ResponseWriter, r *http.Request) {
	// Parse request body
	var req StudentLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.FIO == "" || req.Email == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Name and email are required")
		return
	}

	// Check if student exists with matching FIO and email
	var student struct {
		ID         int    `json:"id"`
		StudentFIO string `json:"student_fio"`
		GroupName  string `json:"group_name"`
		Email      string `json:"email"`
	}

	result := h.DB.Raw(
		"SELECT id, student_fio, group_name, email FROM students WHERE student_fio = ? AND email = ? LIMIT 1",
		req.FIO, req.Email,
	).Scan(&student)

	if result.RowsAffected == 0 {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid credentials or student not found")
		return
	}

	// Return student info
	utils.RespondWithSuccess(w, http.StatusOK, "Student authenticated successfully", map[string]interface{}{
		"student_id": student.ID,
		"fio":        student.StudentFIO,
		"email":      student.Email,
		"group":      student.GroupName,
	})
}

// GetStudentInfoByID retrieves a student's information by ID
func (h *StudentHandler) GetStudentInfoByID(w http.ResponseWriter, r *http.Request) {
	// Get student ID from query params
	studentIDStr := r.URL.Query().Get("student_id")
	studentID, err := strconv.Atoi(studentIDStr)
	if err != nil || studentID <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Valid student ID is required")
		return
	}

	// Fetch student information using raw SQL to avoid issues with the Email field
	var student struct {
		ID         int    `json:"id"`
		StudentFIO string `json:"student_fio"`
		GroupName  string `json:"group_name"`
		TeacherID  int    `json:"teacher_id"`
		Email      string `json:"email"`
	}

	result := h.DB.Raw(
		"SELECT id, student_fio, group_name, teacher_id, email FROM students WHERE id = ? LIMIT 1",
		studentID,
	).Scan(&student)

	if result.RowsAffected == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "Student not found")
		return
	}

	// Return student info
	utils.RespondWithSuccess(w, http.StatusOK, "Student information retrieved", map[string]interface{}{
		"student_id": student.ID,
		"fio":        student.StudentFIO,
		"email":      student.Email,
		"group":      student.GroupName,
		"teacher_id": student.TeacherID,
	})
}
