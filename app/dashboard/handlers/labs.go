package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/tealeg/xlsx"
	"gorm.io/gorm"
)

// LabHandler handles lab-related requests
type LabHandler struct {
	DB *gorm.DB
}

// NewLabHandler creates a new LabHandler
func NewLabHandler(database *gorm.DB) *LabHandler {
	return &LabHandler{
		DB: database,
	}
}

// SubjectGroupResponse represents a subject with its associated groups
type SubjectGroupResponse struct {
	Subject string `json:"subject"`
	Groups  []struct {
		Name         string  `json:"name"`
		StudentCount int     `json:"student_count"`
		TotalLabs    int     `json:"total_labs"`
		GroupAverage float64 `json:"group_average"`
	} `json:"groups"`
}

// GetAllLabs returns all lab groups by subject for the current user
func (h *LabHandler) GetAllLabs(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subjects for this teacher
	var subjects []string
	if err := h.DB.Model(&models.Lesson{}).
		Distinct("subject").
		Where("teacher_id = ?", userID).
		Order("subject").
		Pluck("subject", &subjects).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving subjects")
		return
	}

	// Get all groups with student counts
	type GroupInfo struct {
		Name         string
		StudentCount int
	}

	var groups []GroupInfo
	if err := h.DB.Raw(`
		SELECT g.group_name as name, COUNT(s.id) as student_count
		FROM (
			SELECT DISTINCT group_name
			FROM students
			WHERE teacher_id = ?
		) g
		LEFT JOIN students s ON g.group_name = s.group_name AND s.teacher_id = ?
		GROUP BY g.group_name
		ORDER BY g.group_name
	`, userID, userID).Scan(&groups).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving groups")
		return
	}

	// Create a map of groups by name for quick lookup
	groupMap := make(map[string]GroupInfo)
	for _, g := range groups {
		groupMap[g.Name] = g
	}

	// For each subject, find groups that have lessons in this subject
	var response []SubjectGroupResponse
	for _, subject := range subjects {
		sg := SubjectGroupResponse{
			Subject: subject,
		}

		// Get groups for this subject
		var groupNames []string
		if err := h.DB.Model(&models.Lesson{}).
			Distinct("group_name").
			Where("teacher_id = ? AND subject = ?", userID, subject).
			Order("group_name").
			Pluck("group_name", &groupNames).Error; err != nil {
			continue // Skip on error
		}

		// For each group, get lab settings and average
		for _, groupName := range groupNames {
			if groupInfo, exists := groupMap[groupName]; exists {
				// Get default total labs (5) or from settings if exists
				totalLabs := 5
				var settings models.LabSettings
				if err := h.DB.Where("teacher_id = ? AND subject = ? AND group_name = ?",
					userID, subject, groupName).First(&settings).Error; err == nil {
					totalLabs = settings.TotalLabs
				}

				// Get average grade
				var avgGrade float64
				h.DB.Raw(`
					SELECT COALESCE(AVG(lg.grade), 0) 
					FROM lab_grades lg
					JOIN students s ON lg.student_id = s.id
					WHERE lg.teacher_id = ? AND lg.subject = ? AND s.group_name = ?
				`, userID, subject, groupName).Scan(&avgGrade)

				sg.Groups = append(sg.Groups, struct {
					Name         string  `json:"name"`
					StudentCount int     `json:"student_count"`
					TotalLabs    int     `json:"total_labs"`
					GroupAverage float64 `json:"group_average"`
				}{
					Name:         groupName,
					StudentCount: groupInfo.StudentCount,
					TotalLabs:    totalLabs,
					GroupAverage: avgGrade,
				})
			}
		}

		// Only add subject if it has groups
		if len(sg.Groups) > 0 {
			response = append(response, sg)
		}
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lab groups retrieved successfully", response)
}

// StudentLabSummary represents a student's lab grades
type StudentLabSummary struct {
	StudentID  int     `json:"student_id"`
	StudentFIO string  `json:"student_fio"`
	Grades     []int   `json:"grades"`
	Average    float64 `json:"average"`
}

// GetLabGrades returns lab grades for a specific subject and group
func (h *LabHandler) GetLabGrades(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject and group from URL
	vars := mux.Vars(r)
	subject := vars["subject"]
	groupName := vars["group"]

	// Get lab settings (or defaults)
	totalLabs := 5 // Default
	var settings models.LabSettings
	if err := h.DB.Where("teacher_id = ? AND subject = ? AND group_name = ?",
		userID, subject, groupName).First(&settings).Error; err == nil {
		totalLabs = settings.TotalLabs
	}

	// Get students in this group
	var students []struct {
		ID  int
		FIO string
	}
	if err := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio").
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Order("student_fio").
		Find(&students).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students")
		return
	}

	// Get lab grades for each student
	var summaries []StudentLabSummary
	var totalGradeSum float64
	var totalGradeCount int

	for _, student := range students {
		// Get student's lab grades
		var labGrades []struct {
			LabNumber int
			Grade     int
		}

		if err := h.DB.Model(&models.LabGrade{}).
			Select("lab_number, grade").
			Where("student_id = ? AND subject = ?", student.ID, subject).
			Order("lab_number").
			Find(&labGrades).Error; err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lab grades")
			return
		}

		// Create a map of lab number to grade
		gradeMap := make(map[int]int)
		var gradeSum int
		var gradeCount int

		for _, lg := range labGrades {
			gradeMap[lg.LabNumber] = lg.Grade
			gradeSum += lg.Grade
			gradeCount++

			totalGradeSum += float64(lg.Grade)
			totalGradeCount++
		}

		// Create grades array filled with zeros initially
		grades := make([]int, totalLabs)
		for i := 0; i < totalLabs; i++ {
			labNumber := i + 1
			if grade, ok := gradeMap[labNumber]; ok {
				grades[i] = grade
			} else {
				grades[i] = 0 // No grade yet
			}
		}

		// Calculate average
		studentAverage := 0.0
		if gradeCount > 0 {
			studentAverage = float64(gradeSum) / float64(gradeCount)
		}

		summaries = append(summaries, StudentLabSummary{
			StudentID:  student.ID,
			StudentFIO: student.FIO,
			Grades:     grades,
			Average:    studentAverage,
		})
	}

	// Calculate group average
	groupAverage := 0.0
	if totalGradeCount > 0 {
		groupAverage = totalGradeSum / float64(totalGradeCount)
	}

	// Create response
	response := struct {
		Subject      string              `json:"subject"`
		GroupName    string              `json:"group_name"`
		TotalLabs    int                 `json:"total_labs"`
		Students     []StudentLabSummary `json:"students"`
		GroupAverage float64             `json:"group_average"`
	}{
		Subject:      subject,
		GroupName:    groupName,
		TotalLabs:    totalLabs,
		Students:     summaries,
		GroupAverage: groupAverage,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lab grades retrieved successfully", response)
}

// UpdateLabSettingsRequest defines the request body for updating lab settings
type UpdateLabSettingsRequest struct {
	TotalLabs int `json:"total_labs"`
}

// UpdateLabSettings updates lab settings for a specific subject and group
func (h *LabHandler) UpdateLabSettings(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject and group from URL
	vars := mux.Vars(r)
	subject := vars["subject"]
	groupName := vars["group"]

	// Parse request body
	var req UpdateLabSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.TotalLabs < 1 {
		utils.RespondWithError(w, http.StatusBadRequest, "Total labs must be at least 1")
		return
	}

	// Check if settings already exist
	var count int64
	h.DB.Model(&models.LabSettings{}).
		Where("teacher_id = ? AND group_name = ? AND subject = ?",
			userID, groupName, subject).
		Count(&count)

	var err2 error
	if count > 0 {
		// Update existing settings
		err2 = h.DB.Model(&models.LabSettings{}).
			Where("teacher_id = ? AND group_name = ? AND subject = ?",
				userID, groupName, subject).
			Update("total_labs", req.TotalLabs).Error
	} else {
		// Insert new settings
		newSettings := models.LabSettings{
			TeacherID: userID,
			GroupName: groupName,
			Subject:   subject,
			TotalLabs: req.TotalLabs,
		}
		err2 = h.DB.Create(&newSettings).Error
	}

	if err2 != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating lab settings")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Update Lab Settings",
		fmt.Sprintf("Updated lab settings for %s, %s: %d labs", subject, groupName, req.TotalLabs))

	utils.RespondWithSuccess(w, http.StatusOK, "Lab settings updated successfully", nil)
}

// UpdateLabGradesRequest defines the request body for updating lab grades
type UpdateLabGradesRequest struct {
	Grades []struct {
		StudentID int `json:"student_id"`
		LabNumber int `json:"lab_number"`
		Grade     int `json:"grade"`
	} `json:"grades"`
}

// UpdateLabGrades updates lab grades for a specific subject and group
func (h *LabHandler) UpdateLabGrades(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject and group from URL
	vars := mux.Vars(r)
	subject := vars["subject"]
	groupName := vars["group"]

	// Parse request body
	var req UpdateLabGradesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Verify all students belong to this teacher and group
	for _, grade := range req.Grades {
		var count int64
		h.DB.Model(&models.Student{}).
			Where("id = ? AND teacher_id = ? AND group_name = ?", grade.StudentID, userID, groupName).
			Count(&count)

		if count == 0 {
			utils.RespondWithError(w, http.StatusBadRequest,
				fmt.Sprintf("Student with ID %d not found or doesn't belong to this group", grade.StudentID))
			return
		}

		// Validate grade
		if grade.Grade < 0 || grade.Grade > 5 {
			utils.RespondWithError(w, http.StatusBadRequest, "Grade must be between 0 and 5")
			return
		}

		// Validate lab number
		if grade.LabNumber < 1 {
			utils.RespondWithError(w, http.StatusBadRequest, "Lab number must be at least 1")
			return
		}
	}

	// Save all grades in a transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		for _, g := range req.Grades {
			// Check if grade already exists
			var count int64
			tx.Model(&models.LabGrade{}).
				Where("student_id = ? AND subject = ? AND lab_number = ?",
					g.StudentID, subject, g.LabNumber).
				Count(&count)

			if count > 0 {
				// Update existing grade
				if err := tx.Model(&models.LabGrade{}).
					Where("student_id = ? AND subject = ? AND lab_number = ?",
						g.StudentID, subject, g.LabNumber).
					Update("grade", g.Grade).Error; err != nil {
					return err
				}
			} else {
				// Insert new grade
				newGrade := models.LabGrade{
					StudentID: g.StudentID,
					TeacherID: userID,
					Subject:   subject,
					LabNumber: g.LabNumber,
					Grade:     g.Grade,
				}
				if err := tx.Create(&newGrade).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating lab grades")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Update Lab Grades",
		fmt.Sprintf("Updated %d lab grades for %s, %s", len(req.Grades), subject, groupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Lab grades updated successfully", nil)
}

// ExportLabGrades exports lab grades to Excel
func (h *LabHandler) ExportLabGrades(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject and group from URL
	vars := mux.Vars(r)
	subject := vars["subject"]
	groupName := vars["group"]

	// Get lab summary
	totalLabs := 5 // Default
	var settings models.LabSettings
	if err := h.DB.Where("teacher_id = ? AND subject = ? AND group_name = ?",
		userID, subject, groupName).First(&settings).Error; err == nil {
		totalLabs = settings.TotalLabs
	}

	// Get students in this group
	var students []struct {
		ID  int
		FIO string
	}
	if err := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio").
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Order("student_fio").
		Find(&students).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students")
		return
	}

	// Create Excel file
	file := xlsx.NewFile()
	sheet, err := file.AddSheet(fmt.Sprintf("%s", groupName))
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating Excel sheet")
		return
	}

	// Add header row
	header := sheet.AddRow()
	header.AddCell().SetString("ФИО")

	// Add columns for each lab
	for i := 1; i <= totalLabs; i++ {
		header.AddCell().SetString(fmt.Sprintf("%d", i))
	}

	// Add average column
	header.AddCell().SetString("Средний балл")

	// Add student rows with their grades
	var totalGradeSum float64
	var totalGradeCount int

	for _, student := range students {
		row := sheet.AddRow()
		row.AddCell().SetString(student.FIO)

		// Get student's lab grades
		var labGrades []struct {
			LabNumber int
			Grade     int
		}

		if err := h.DB.Model(&models.LabGrade{}).
			Select("lab_number, grade").
			Where("student_id = ? AND subject = ?", student.ID, subject).
			Order("lab_number").
			Find(&labGrades).Error; err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lab grades")
			return
		}

		// Create a map of lab number to grade
		gradeMap := make(map[int]int)
		var gradeSum int
		var gradeCount int

		for _, lg := range labGrades {
			gradeMap[lg.LabNumber] = lg.Grade
			gradeSum += lg.Grade
			gradeCount++

			totalGradeSum += float64(lg.Grade)
			totalGradeCount++
		}

		// Add grades for each lab
		for i := 1; i <= totalLabs; i++ {
			cell := row.AddCell()
			if grade, ok := gradeMap[i]; ok && grade > 0 {
				cell.SetInt(grade)
			}
			// If grade is 0 or not set, leave cell empty
		}

		// Add average
		avgCell := row.AddCell()
		if gradeCount > 0 {
			avgCell.SetString(fmt.Sprintf("%.2f", float64(gradeSum)/float64(gradeCount)))
		} else {
			avgCell.SetString("")
		}
	}

	// Add group average row
	if len(students) > 0 {
		avgRow := sheet.AddRow()
		avgRow.AddCell().SetString("Средний балл группы")

		// Empty cells for each lab
		for i := 0; i < totalLabs; i++ {
			avgRow.AddCell().SetString("")
		}

		// Group average in the last cell
		groupAvg := 0.0
		if totalGradeCount > 0 {
			groupAvg = totalGradeSum / float64(totalGradeCount)
		}
		avgRow.AddCell().SetString(fmt.Sprintf("%.2f", groupAvg))
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Export Lab Grades",
		fmt.Sprintf("Exported lab grades for %s, %s", subject, groupName))

	// Set headers for file download
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=lab_grades_%s_%s.xlsx", subject, groupName))

	// Write the file to the response
	if err := file.Write(w); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error writing Excel file")
		return
	}
}

// ShareLabGradesRequest defines the request body for sharing lab grades
type ShareLabGradesRequest struct {
	ExpirationDays int `json:"expiration_days"`
}

// ShareLabGrades generates a shareable link for lab grades
func (h *LabHandler) ShareLabGrades(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject and group from URL
	vars := mux.Vars(r)
	subject := vars["subject"]
	groupName := vars["group"]

	// Parse request body
	var req ShareLabGradesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Set default expiration to 7 days if not specified
	if req.ExpirationDays <= 0 {
		req.ExpirationDays = 7
	}

	// Generate a secure random token
	token, err := generateToken(16)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	// Create a new shared link record
	expiresAt := time.Now().AddDate(0, 0, req.ExpirationDays)
	sharedLink := models.SharedLabLink{
		Token:       token,
		TeacherID:   userID,
		GroupName:   groupName,
		Subject:     subject,
		CreatedAt:   time.Now(),
		ExpiresAt:   &expiresAt,
		AccessCount: 0,
	}

	// Save to database
	if err := h.DB.Create(&sharedLink).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating shared link")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Share Lab Grades",
		fmt.Sprintf("Created shared link for %s, %s with expiration days: %d", subject, groupName, req.ExpirationDays))

	// Construct the full URL
	// In production, get the base URL from configuration
	baseURL := fmt.Sprintf("%s://%s", r.URL.Scheme, r.Host)
	if baseURL == "://" {
		baseURL = "http://localhost:8080" // Default for local development
	}
	shareURL := fmt.Sprintf("%s/api/labs/shared/%s", baseURL, token)

	utils.RespondWithSuccess(w, http.StatusOK, "Lab grades shared successfully", map[string]interface{}{
		"share_url":     shareURL,
		"token":         token,
		"expiration":    expiresAt.Format(time.RFC3339),
		"expires_after": req.ExpirationDays,
	})
}

// Enhanced GetSharedLabGrades function for app/dashboard/handlers/labs.go
// This adds better error handling and logging

// GetSharedLabGrades returns the shared lab grades for a specific token
func (h *LabHandler) GetSharedLabGrades(w http.ResponseWriter, r *http.Request) {
	// Get token from URL
	vars := mux.Vars(r)
	token := vars["token"]

	// Log the request for debugging
	log.Printf("GetSharedLabGrades called with token: %s", token)

	// Get the shared link details
	var link models.SharedLabLink
	if err := h.DB.Where("token = ?", token).First(&link).Error; err != nil {
		log.Printf("Error finding shared link with token '%s': %v", token, err)
		utils.RespondWithError(w, http.StatusNotFound, "Shared link not found or has expired")
		return
	}

	// Log the found link details for debugging
	log.Printf("Found shared link: Subject=%s, Group=%s, TeacherID=%d",
		link.Subject, link.GroupName, link.TeacherID)

	// Check if link has expired
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		log.Printf("Shared link with token '%s' has expired: %v", token, link.ExpiresAt)
		utils.RespondWithError(w, http.StatusGone, "Shared link has expired")
		return
	}

	// Increment access count
	h.DB.Model(&link).UpdateColumn("access_count", gorm.Expr("access_count + 1"))

	// Get teacher info
	var teacher models.User
	if err := h.DB.Select("id, fio").Where("id = ?", link.TeacherID).First(&teacher).Error; err != nil {
		log.Printf("Error retrieving teacher info for ID %d: %v", link.TeacherID, err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving teacher information")
		return
	}

	// Get lab summary similar to GetLabGrades but for the shared link
	totalLabs := 5 // Default
	var settings models.LabSettings
	if err := h.DB.Where("teacher_id = ? AND subject = ? AND group_name = ?",
		link.TeacherID, link.Subject, link.GroupName).First(&settings).Error; err == nil {
		totalLabs = settings.TotalLabs
	} else {
		log.Printf("Using default lab count. No settings found for Teacher=%d, Subject=%s, Group=%s: %v",
			link.TeacherID, link.Subject, link.GroupName, err)
	}

	// Get students in this group
	var students []struct {
		ID  int
		FIO string
	}
	if err := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio").
		Where("teacher_id = ? AND group_name = ?", link.TeacherID, link.GroupName).
		Order("student_fio").
		Find(&students).Error; err != nil {
		log.Printf("Error retrieving students: %v", err)
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students")
		return
	}

	log.Printf("Found %d students for group %s", len(students), link.GroupName)

	// Get lab grades for each student (similar to GetLabGrades)
	var summaries []StudentLabSummary
	var totalGradeSum float64
	var totalGradeCount int

	for _, student := range students {
		// Get student's lab grades
		var labGrades []struct {
			LabNumber int
			Grade     int
		}

		if err := h.DB.Model(&models.LabGrade{}).
			Select("lab_number, grade").
			Where("student_id = ? AND subject = ?", student.ID, link.Subject).
			Order("lab_number").
			Find(&labGrades).Error; err != nil {
			log.Printf("Error retrieving lab grades for student %d: %v", student.ID, err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lab grades")
			return
		}

		// Create a map of lab number to grade
		gradeMap := make(map[int]int)
		var gradeSum int
		var gradeCount int

		for _, lg := range labGrades {
			gradeMap[lg.LabNumber] = lg.Grade
			gradeSum += lg.Grade
			gradeCount++

			totalGradeSum += float64(lg.Grade)
			totalGradeCount++
		}

		// Create grades array filled with zeros initially
		grades := make([]int, totalLabs)
		for i := 0; i < totalLabs; i++ {
			labNumber := i + 1
			if grade, ok := gradeMap[labNumber]; ok {
				grades[i] = grade
			} else {
				grades[i] = 0 // No grade yet
			}
		}

		// Calculate average
		studentAverage := 0.0
		if gradeCount > 0 {
			studentAverage = float64(gradeSum) / float64(gradeCount)
		}

		summaries = append(summaries, StudentLabSummary{
			StudentID:  student.ID,
			StudentFIO: student.FIO,
			Grades:     grades,
			Average:    studentAverage,
		})
	}

	// Calculate group average
	groupAverage := 0.0
	if totalGradeCount > 0 {
		groupAverage = totalGradeSum / float64(totalGradeCount)
	}

	// Prepare response with additional shared link info
	response := struct {
		SharedBy     string              `json:"shared_by"`
		Subject      string              `json:"subject"`
		GroupName    string              `json:"group_name"`
		TotalLabs    int                 `json:"total_labs"`
		Students     []StudentLabSummary `json:"students"`
		GroupAverage float64             `json:"group_average"`
		CreatedAt    time.Time           `json:"created_at"`
		ExpiresAt    *time.Time          `json:"expires_at,omitempty"`
		AccessCount  int                 `json:"access_count"`
	}{
		SharedBy:     teacher.FIO,
		Subject:      link.Subject,
		GroupName:    link.GroupName,
		TotalLabs:    totalLabs,
		Students:     summaries,
		GroupAverage: groupAverage,
		CreatedAt:    link.CreatedAt,
		ExpiresAt:    link.ExpiresAt,
		AccessCount:  link.AccessCount,
	}

	log.Printf("Successfully returned shared lab grades for token '%s' (Subject=%s, Group=%s)",
		token, link.Subject, link.GroupName)
	utils.RespondWithSuccess(w, http.StatusOK, "Shared lab grades retrieved successfully", response)
}

// SharedLinkResponse contains information about a shared link
type SharedLinkResponse struct {
	Token       string     `json:"token"`
	Subject     string     `json:"subject"`
	GroupName   string     `json:"group_name"`
	ShareURL    string     `json:"share_url"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	IsExpired   bool       `json:"is_expired"`
	AccessCount int        `json:"access_count"`
}

// GetSharedLinks returns all shared links created by the current user
func (h *LabHandler) GetSharedLinks(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get all shared links created by this user
	var links []models.SharedLabLink
	if err := h.DB.Where("teacher_id = ?", userID).Order("created_at DESC").Find(&links).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving shared links")
		return
	}

	// Prepare response with additional information
	var response []SharedLinkResponse
	now := time.Now()

	// Construct the base URL
	baseURL := fmt.Sprintf("%s://%s", r.URL.Scheme, r.Host)
	if baseURL == "://" {
		baseURL = "http://localhost:8080" // Default for local development
	}

	for _, link := range links {
		isExpired := false
		if link.ExpiresAt != nil && link.ExpiresAt.Before(now) {
			isExpired = true
		}

		response = append(response, SharedLinkResponse{
			Token:       link.Token,
			Subject:     link.Subject,
			GroupName:   link.GroupName,
			ShareURL:    fmt.Sprintf("%s/api/labs/shared/%s", baseURL, link.Token),
			CreatedAt:   link.CreatedAt,
			ExpiresAt:   link.ExpiresAt,
			IsExpired:   isExpired,
			AccessCount: link.AccessCount,
		})
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Shared links retrieved successfully", response)
}

// DeleteSharedLink deletes a shared link
func (h *LabHandler) DeleteSharedLink(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get token from URL
	vars := mux.Vars(r)
	token := vars["token"]

	// Verify the link belongs to this user
	var link models.SharedLabLink
	if err := h.DB.Where("token = ? AND teacher_id = ?", token, userID).First(&link).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Shared link not found or access denied")
		return
	}

	// Delete the link
	if err := h.DB.Where("token = ? AND teacher_id = ?", token, userID).Delete(&models.SharedLabLink{}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting shared link")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Shared Link",
		fmt.Sprintf("Deleted shared link for %s, %s", link.Subject, link.GroupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Shared link deleted successfully", nil)
}

// Helper function to generate a secure random token
func generateToken(length int) (string, error) {
	buffer := make([]byte, length)
	_, err := rand.Read(buffer)
	if err != nil {
		return "", err
	}

	// Convert to base64 and remove URL-unsafe characters
	token := base64.URLEncoding.EncodeToString(buffer)
	return token[:length], nil
}
