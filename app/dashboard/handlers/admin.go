package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// AdminHandler handles admin-related requests
type AdminHandler struct {
	DB *gorm.DB
}

// NewAdminHandler creates a new AdminHandler
func NewAdminHandler(database *gorm.DB) *AdminHandler {
	return &AdminHandler{
		DB: database,
	}
}

// UserResponse is the standard format for user data returned in API responses
type UserResponse struct {
	ID    int    `json:"id"`
	FIO   string `json:"fio"`
	Login string `json:"login"`
	Role  string `json:"role"`
}

// GetUsers returns all users for admin management
func (h *AdminHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get all users
	var users []UserResponse
	if err := h.DB.Model(&models.User{}).
		Select("id, fio, login, role").
		Order("fio").
		Find(&users).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving users")
		return
	}

	// Count lessons and get stats for each teacher
	type TeacherStats struct {
		ID           int            `json:"id"`
		FIO          string         `json:"fio"`
		Login        string         `json:"login"`
		Role         string         `json:"role"`
		TotalLessons int            `json:"total_lessons"`
		TotalHours   int            `json:"total_hours"`
		Subjects     map[string]int `json:"subjects"`
	}

	var response []interface{}
	for _, user := range users {
		// If user is a teacher, get additional stats
		if user.Role == "teacher" || user.Role == "free" {
			var totalLessons int64
			var totalHours int64

			// Count lessons
			h.DB.Model(&models.Lesson{}).
				Where("teacher_id = ?", user.ID).
				Count(&totalLessons)

			// Sum hours
			h.DB.Model(&models.Lesson{}).
				Where("teacher_id = ?", user.ID).
				Select("COALESCE(SUM(hours), 0)").
				Pluck("COALESCE(SUM(hours), 0)", &totalHours)

			// Get subject counts
			var subjectCounts []struct {
				Subject string
				Count   int
			}
			h.DB.Model(&models.Lesson{}).
				Select("subject, COUNT(*) as count").
				Where("teacher_id = ?", user.ID).
				Group("subject").
				Find(&subjectCounts)

			// Create subjects map
			subjects := make(map[string]int)
			for _, sc := range subjectCounts {
				subjects[sc.Subject] = sc.Count
			}

			// Add teacher with stats
			response = append(response, TeacherStats{
				ID:           user.ID,
				FIO:          user.FIO,
				Login:        user.Login,
				Role:         user.Role,
				TotalLessons: int(totalLessons),
				TotalHours:   int(totalHours),
				Subjects:     subjects,
			})
		} else {
			// Add admin without additional stats
			response = append(response, user)
		}
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Admin View Users", "Viewed all users list")

	utils.RespondWithSuccess(w, http.StatusOK, "Users retrieved successfully", response)
}

// UpdateUserRoleRequest defines the request body for updating a user's role
type UpdateUserRoleRequest struct {
	Role string `json:"role"`
}

// UpdateUserRole updates a user's role
func (h *AdminHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user ID from URL
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Parse request body
	var req UpdateUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate role
	if req.Role != "teacher" && req.Role != "admin" && req.Role != "free" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid role. Must be 'teacher', 'admin', or 'free'")
		return
	}

	// Get user info for logging
	var user models.User
	if err := h.DB.Select("fio, role").Where("id = ?", userID).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	// Update user role
	if err := h.DB.Model(&models.User{}).
		Where("id = ?", userID).
		Update("role", req.Role).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating user role")
		return
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin Update User Role",
		fmt.Sprintf("Changed role of user %s (ID: %d) from %s to %s", user.FIO, userID, user.Role, req.Role))

	utils.RespondWithSuccess(w, http.StatusOK, "User role updated successfully", nil)
}

// DeleteUser deletes a user and all their associated data
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user ID from URL
	vars := mux.Vars(r)
	userID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Check if trying to delete self
	if adminID == userID {
		utils.RespondWithError(w, http.StatusBadRequest, "Cannot delete your own account")
		return
	}

	// Get user info for logging
	var user models.User
	if err := h.DB.Select("fio").Where("id = ?", userID).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	// Delete user data using transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete lessons first (due to foreign key constraints)
		if err := tx.Where("teacher_id = ?", userID).Delete(&models.Lesson{}).Error; err != nil {
			return err
		}

		// Delete students
		if err := tx.Where("teacher_id = ?", userID).Delete(&models.Student{}).Error; err != nil {
			return err
		}

		// Delete lab settings
		if err := tx.Where("teacher_id = ?", userID).Delete(&models.LabSettings{}).Error; err != nil {
			return err
		}

		// Delete lab grades
		if err := tx.Where("teacher_id = ?", userID).Delete(&models.LabGrade{}).Error; err != nil {
			return err
		}

		// Delete shared links
		if err := tx.Where("teacher_id = ?", userID).Delete(&models.SharedLabLink{}).Error; err != nil {
			return err
		}

		// Delete user
		if err := tx.Where("id = ?", userID).Delete(&models.User{}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting user")
		return
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin Delete User",
		fmt.Sprintf("Deleted user %s (ID: %d)", user.FIO, userID))

	utils.RespondWithSuccess(w, http.StatusOK, "User deleted successfully", nil)
}

// LogResponse is the standard format for log data returned in API responses
type LogResponse struct {
	ID        int       `json:"id"`
	UserID    int       `json:"user_id"`
	UserFIO   string    `json:"user_fio"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	Timestamp time.Time `json:"timestamp"`
}

// GetLogs returns system logs
func (h *AdminHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Optional query parameters
	userIDFilter := r.URL.Query().Get("user_id")
	actionFilter := r.URL.Query().Get("action")
	fromDate := r.URL.Query().Get("from_date")
	toDate := r.URL.Query().Get("to_date")

	// Pagination parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20 // Default limit
	}

	offset := (page - 1) * limit

	// Build base query
	query := h.DB.Table("logs").
		Select("logs.id, logs.user_id, users.fio as user_fio, logs.action, logs.details, logs.timestamp").
		Joins("JOIN users ON logs.user_id = users.id")

	// Apply filters
	if userIDFilter != "" {
		userID, err := strconv.Atoi(userIDFilter)
		if err == nil {
			query = query.Where("logs.user_id = ?", userID)
		}
	}

	if actionFilter != "" {
		query = query.Where("logs.action LIKE ?", "%"+actionFilter+"%")
	}

	if fromDate != "" {
		query = query.Where("logs.timestamp >= ?", fromDate)
	}

	if toDate != "" {
		query = query.Where("logs.timestamp <= ?", toDate)
	}

	// Get total count for pagination
	var totalCount int64
	countQuery := query
	if err := countQuery.Count(&totalCount).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error counting logs")
		return
	}

	// Get paginated logs
	var logs []LogResponse
	if err := query.Order("logs.timestamp DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving logs")
		return
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin View Logs",
		fmt.Sprintf("Viewed system logs (page %d, limit %d)", page, limit))

	// Calculate pagination info
	totalPages := (int(totalCount) + limit - 1) / limit // Ceiling division

	paginationInfo := struct {
		CurrentPage int   `json:"current_page"`
		TotalPages  int   `json:"total_pages"`
		TotalItems  int64 `json:"total_items"`
		Limit       int   `json:"limit"`
		HasNext     bool  `json:"has_next"`
		HasPrev     bool  `json:"has_prev"`
	}{
		CurrentPage: page,
		TotalPages:  totalPages,
		TotalItems:  totalCount,
		Limit:       limit,
		HasNext:     page < totalPages,
		HasPrev:     page > 1,
	}

	response := struct {
		Logs       []LogResponse `json:"logs"`
		Pagination interface{}   `json:"pagination"`
	}{
		Logs:       logs,
		Pagination: paginationInfo,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Logs retrieved successfully", response)
}

// GetTeacherGroups gets groups for a specific teacher (admin view)
func (h *AdminHandler) GetTeacherGroups(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get teacher ID from URL
	vars := mux.Vars(r)
	teacherID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid teacher ID")
		return
	}

	// Check if teacher exists
	var teacher models.User
	if err := h.DB.Select("id, fio").Where("id = ?", teacherID).First(&teacher).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Teacher not found")
		return
	}

	// Get groups for this teacher
	var groupNames []string
	if err := h.DB.Raw(`
		SELECT DISTINCT group_name 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? 
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ?
		) AS combined_groups 
		ORDER BY group_name
	`, teacherID, teacherID).Scan(&groupNames).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving groups")
		return
	}

	// Get details for each group
	type GroupDetails struct {
		Name         string `json:"name"`
		StudentCount int    `json:"student_count"`
		Students     []struct {
			ID  int    `json:"id"`
			FIO string `json:"fio"`
		} `json:"students"`
	}

	var groups []GroupDetails
	for _, groupName := range groupNames {
		var group GroupDetails
		group.Name = groupName

		// Get student count
		var count int64
		h.DB.Model(&models.Student{}).
			Where("teacher_id = ? AND group_name = ?", teacherID, groupName).
			Count(&count)
		group.StudentCount = int(count)

		// Get students
		if err := h.DB.Model(&models.Student{}).
			Select("id, student_fio as fio").
			Where("teacher_id = ? AND group_name = ?", teacherID, groupName).
			Order("student_fio").
			Find(&group.Students).Error; err != nil {
			continue // Skip on error
		}

		groups = append(groups, group)
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin View Teacher Groups",
		fmt.Sprintf("Viewed groups for teacher %s (ID: %d)", teacher.FIO, teacherID))

	response := struct {
		TeacherID   int            `json:"teacher_id"`
		TeacherName string         `json:"teacher_name"`
		Groups      []GroupDetails `json:"groups"`
	}{
		TeacherID:   teacherID,
		TeacherName: teacher.FIO,
		Groups:      groups,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Teacher groups retrieved successfully", response)
}

// AddGroupRequest defines the request body for adding a group to a teacher
type AddGroupRequest struct {
	GroupName string   `json:"group_name"`
	Students  []string `json:"students,omitempty"`
}

// AddTeacherGroup adds a new group to a teacher
func (h *AdminHandler) AddTeacherGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get teacher ID from URL
	vars := mux.Vars(r)
	teacherID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid teacher ID")
		return
	}

	// Check if teacher exists
	var teacher models.User
	if err := h.DB.Select("id, fio").Where("id = ?", teacherID).First(&teacher).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Teacher not found")
		return
	}

	// Parse request body
	var req AddGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate group name
	if req.GroupName == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Group name is required")
		return
	}

	// Check if group already exists for this teacher
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? 
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ?
		) AS combined_groups
		WHERE group_name = ?`,
		teacherID, teacherID, req.GroupName).Count(&count)

	if count > 0 {
		utils.RespondWithError(w, http.StatusConflict, "Group with this name already exists for this teacher")
		return
	}

	// Add students if provided
	var addedStudents int
	for _, studentFIO := range req.Students {
		if studentFIO != "" {
			student := models.Student{
				TeacherID:  teacherID,
				GroupName:  req.GroupName,
				StudentFIO: studentFIO,
			}

			if err := h.DB.Create(&student).Error; err == nil {
				addedStudents++
			}
		}
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin Add Teacher Group",
		fmt.Sprintf("Added group %s for teacher %s (ID: %d) with %d students", req.GroupName, teacher.FIO, teacherID, addedStudents))

	utils.RespondWithSuccess(w, http.StatusCreated, "Group added successfully", map[string]interface{}{
		"group_name":     req.GroupName,
		"students_added": addedStudents,
	})
}

// GetTeacherAttendance gets attendance records for a specific teacher
func (h *AdminHandler) GetTeacherAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get teacher ID from URL
	vars := mux.Vars(r)
	teacherID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid teacher ID")
		return
	}

	// Check if teacher exists
	var teacher models.User
	if err := h.DB.Select("id, fio").Where("id = ?", teacherID).First(&teacher).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Teacher not found")
		return
	}

	// Optional query parameters for filtering
	groupParam := r.URL.Query().Get("group")
	subjectParam := r.URL.Query().Get("subject")

	// Build query
	query := fmt.Sprintf(`
		SELECT l.id as lesson_id, l.date, l.subject, l.group_name, l.topic, l.type,
			(SELECT COUNT(*) FROM students s WHERE s.teacher_id = ? AND s.group_name = l.group_name) as total_students,
			(SELECT COUNT(*) FROM attendances a WHERE a.lesson_id = l.id AND a.attended = 1) as attended_students
		FROM lessons l
		WHERE l.teacher_id = ? AND EXISTS (SELECT 1 FROM attendances a WHERE a.lesson_id = l.id)
	`)

	args := []interface{}{teacherID, teacherID}

	// Apply filters
	if groupParam != "" {
		query += " AND l.group_name = ?"
		args = append(args, groupParam)
	}
	if subjectParam != "" {
		query += " AND l.subject = ?"
		args = append(args, subjectParam)
	}

	// Add ordering
	query += " ORDER BY l.date DESC"

	// Get attendance records
	type AttendanceRecord struct {
		LessonID         int     `json:"lesson_id"`
		Date             string  `json:"date"`
		Subject          string  `json:"subject"`
		GroupName        string  `json:"group_name"`
		Topic            string  `json:"topic"`
		Type             string  `json:"type"`
		TotalStudents    int     `json:"total_students"`
		AttendedStudents int     `json:"attended_students"`
		AttendanceRate   float64 `json:"attendance_rate"`
	}

	var records []AttendanceRecord
	if err := h.DB.Raw(query, args...).Scan(&records).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving attendance records")
		return
	}

	// Format dates and calculate attendance rates
	for i := range records {
		if date, err := time.Parse("2006-01-02", records[i].Date); err == nil {
			records[i].Date = date.Format("02.01.2006")
		}

		if records[i].TotalStudents > 0 {
			records[i].AttendanceRate = float64(records[i].AttendedStudents) / float64(records[i].TotalStudents) * 100
		}
	}

	// Get groups for filter options
	var groups []string
	h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ?", teacherID).
		Distinct("group_name").
		Order("group_name").
		Pluck("group_name", &groups)

	// Get subjects for filter options
	var subjects []string
	h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ?", teacherID).
		Distinct("subject").
		Order("subject").
		Pluck("subject", &subjects)

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin View Teacher Attendance",
		fmt.Sprintf("Viewed attendance for teacher %s (ID: %d)", teacher.FIO, teacherID))

	response := struct {
		TeacherID   int                `json:"teacher_id"`
		TeacherName string             `json:"teacher_name"`
		Attendance  []AttendanceRecord `json:"attendance"`
		Groups      []string           `json:"groups"`
		Subjects    []string           `json:"subjects"`
	}{
		TeacherID:   teacherID,
		TeacherName: teacher.FIO,
		Attendance:  records,
		Groups:      groups,
		Subjects:    subjects,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Teacher attendance retrieved successfully", response)
}

// GetTeacherLabs gets lab information for a specific teacher
func (h *AdminHandler) GetTeacherLabs(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context to log the action
	adminID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get teacher ID from URL
	vars := mux.Vars(r)
	teacherID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid teacher ID")
		return
	}

	// Check if teacher exists
	var teacher models.User
	if err := h.DB.Select("id, fio").Where("id = ?", teacherID).First(&teacher).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Teacher not found")
		return
	}

	// Get subjects for this teacher
	var subjects []string
	if err := h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ?", teacherID).
		Distinct("subject").
		Order("subject").
		Pluck("subject", &subjects).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving subjects")
		return
	}

	// For each subject, get groups and lab settings
	type SubjectGroup struct {
		Subject string `json:"subject"`
		Groups  []struct {
			GroupName    string  `json:"group_name"`
			TotalLabs    int     `json:"total_labs"`
			GroupAverage float64 `json:"group_average"`
		} `json:"groups"`
	}

	var response []SubjectGroup
	for _, subject := range subjects {
		sg := SubjectGroup{
			Subject: subject,
		}

		// Get groups for this subject
		var groupNames []string
		if err := h.DB.Model(&models.Lesson{}).
			Where("teacher_id = ? AND subject = ?", teacherID, subject).
			Distinct("group_name").
			Order("group_name").
			Pluck("group_name", &groupNames).Error; err != nil {
			continue // Skip on error
		}

		for _, groupName := range groupNames {
			// Get lab settings
			totalLabs := 5 // Default
			var settings models.LabSettings
			if err := h.DB.Where("teacher_id = ? AND subject = ? AND group_name = ?",
				teacherID, subject, groupName).First(&settings).Error; err == nil {
				totalLabs = settings.TotalLabs
			}

			// Get average grade
			var avgGrade float64
			h.DB.Raw(`
				SELECT COALESCE(AVG(lg.grade), 0) 
				FROM lab_grades lg
				JOIN students s ON lg.student_id = s.id
				WHERE lg.teacher_id = ? AND lg.subject = ? AND s.group_name = ?
			`, teacherID, subject, groupName).Scan(&avgGrade)

			sg.Groups = append(sg.Groups, struct {
				GroupName    string  `json:"group_name"`
				TotalLabs    int     `json:"total_labs"`
				GroupAverage float64 `json:"group_average"`
			}{
				GroupName:    groupName,
				TotalLabs:    totalLabs,
				GroupAverage: avgGrade,
			})
		}

		if len(sg.Groups) > 0 {
			response = append(response, sg)
		}
	}

	// Log the action
	utils.LogAction(h.DB, adminID, "Admin View Teacher Labs",
		fmt.Sprintf("Viewed lab information for teacher %s (ID: %d)", teacher.FIO, teacherID))

	data := struct {
		TeacherID   int            `json:"teacher_id"`
		TeacherName string         `json:"teacher_name"`
		Subjects    []SubjectGroup `json:"subjects"`
	}{
		TeacherID:   teacherID,
		TeacherName: teacher.FIO,
		Subjects:    response,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Teacher lab information retrieved successfully", data)
}
