package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/tealeg/xlsx"
	"gorm.io/gorm"
)

// AttendanceHandler handles attendance-related requests
type AttendanceHandler struct {
	DB *gorm.DB
}

// NewAttendanceHandler creates a new AttendanceHandler
func NewAttendanceHandler(database *gorm.DB) *AttendanceHandler {
	return &AttendanceHandler{
		DB: database,
	}
}

// AttendanceRecordResponse is the standard format for attendance summary data
type AttendanceRecordResponse struct {
	LessonID         int     `json:"lesson_id"`
	Date             string  `json:"date"`
	Subject          string  `json:"subject"`
	GroupName        string  `json:"group_name"`
	TotalStudents    int     `json:"total_students"`
	AttendedStudents int     `json:"attended_students"`
	AttendanceRate   float64 `json:"attendance_rate"`
}

// GetAttendance returns all attendance records for the current user
func (h *AttendanceHandler) GetAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Optional query parameters for filtering
	groupParam := r.URL.Query().Get("group")
	subjectParam := r.URL.Query().Get("subject")
	dateFromParam := r.URL.Query().Get("date_from")
	dateToParam := r.URL.Query().Get("date_to")

	// Build base query
	query := fmt.Sprintf(`
		SELECT l.id as lesson_id, l.date, l.subject, l.group_name, 
			(SELECT COUNT(*) FROM students s WHERE s.teacher_id = ? AND s.group_name = l.group_name) as total_students,
			(SELECT COUNT(*) FROM attendances a WHERE a.lesson_id = l.id AND a.attended = 1) as attended_students
		FROM lessons l
		WHERE l.teacher_id = ? AND EXISTS (SELECT 1 FROM attendances a WHERE a.lesson_id = l.id)
	`)

	args := []interface{}{userID, userID}

	// Apply filters
	if groupParam != "" {
		query += " AND l.group_name = ?"
		args = append(args, groupParam)
	}
	if subjectParam != "" {
		query += " AND l.subject = ?"
		args = append(args, subjectParam)
	}
	if dateFromParam != "" {
		query += " AND l.date >= ?"
		args = append(args, dateFromParam)
	}
	if dateToParam != "" {
		query += " AND l.date <= ?"
		args = append(args, dateToParam)
	}

	// Add ordering
	query += " ORDER BY l.date DESC"

	// Execute query
	var records []AttendanceRecordResponse
	if err := h.DB.Raw(query, args...).Scan(&records).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving attendance records")
		return
	}

	// Calculate attendance rates
	for i := range records {
		if records[i].TotalStudents > 0 {
			records[i].AttendanceRate = float64(records[i].AttendedStudents) / float64(records[i].TotalStudents) * 100
		} else {
			records[i].AttendanceRate = 0
		}

		// Format date to a more readable format
		if date, err := time.Parse("2006-01-02", records[i].Date); err == nil {
			records[i].Date = date.Format("02.01.2006")
		}
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Attendance records retrieved successfully", records)
}

// StudentAttendanceResponse is the format for individual student attendance
type StudentAttendanceResponse struct {
	ID       int    `json:"id"`
	FIO      string `json:"fio"`
	Attended bool   `json:"attended"`
}

// GetLessonAttendance returns attendance for a specific lesson
func (h *AttendanceHandler) GetLessonAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["lessonId"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Verify the lesson belongs to this teacher
	var groupName string
	err = h.DB.Model(&models.Lesson{}).
		Select("group_name").
		Where("id = ? AND teacher_id = ?", lessonID, userID).
		Pluck("group_name", &groupName).Error

	if err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found or access denied")
		return
	}

	// Get lesson details
	var lesson struct {
		ID        int    `json:"id"`
		Date      string `json:"date"`
		Subject   string `json:"subject"`
		GroupName string `json:"group_name"`
		Topic     string `json:"topic"`
		Type      string `json:"type"`
	}

	if err := h.DB.Model(&models.Lesson{}).
		Select("id, date, subject, group_name, topic, type").
		Where("id = ?", lessonID).
		First(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lesson details")
		return
	}

	// Format the date
	if date, err := time.Parse("2006-01-02", lesson.Date); err == nil {
		lesson.Date = date.Format("02.01.2006")
	}

	// Get all students in the group with their attendance status
	var students []StudentAttendanceResponse

	// Note the use of "attendances" table name instead of "attendance"
	err = h.DB.Raw(`
		SELECT s.id, s.student_fio as fio, COALESCE(a.attended, 0) as attended
		FROM students s
		LEFT JOIN attendances a ON s.id = a.student_id AND a.lesson_id = ?
		WHERE s.teacher_id = ? AND s.group_name = ?
		ORDER BY s.student_fio
	`, lessonID, userID, groupName).Scan(&students).Error

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students attendance")
		return
	}

	// Calculate statistics
	totalStudents := len(students)
	attendedStudents := 0
	for _, s := range students {
		if s.Attended {
			attendedStudents++
		}
	}

	attendanceRate := 0.0
	if totalStudents > 0 {
		attendanceRate = float64(attendedStudents) / float64(totalStudents) * 100
	}

	// Prepare response
	response := struct {
		Lesson           interface{} `json:"lesson"`
		Students         interface{} `json:"students"`
		TotalStudents    int         `json:"total_students"`
		AttendedStudents int         `json:"attended_students"`
		AttendanceRate   float64     `json:"attendance_rate"`
	}{
		Lesson:           lesson,
		Students:         students,
		TotalStudents:    totalStudents,
		AttendedStudents: attendedStudents,
		AttendanceRate:   attendanceRate,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lesson attendance retrieved successfully", response)
}

// SaveAttendanceRequest defines the request body for saving attendance
type SaveAttendanceRequest struct {
	AttendedStudentIDs []int `json:"attended_student_ids"`
}

// SaveAttendance saves attendance records for a lesson
func (h *AttendanceHandler) SaveAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["lessonId"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Parse request body
	var req SaveAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Verify the lesson belongs to this teacher
	var groupName string
	err = h.DB.Model(&models.Lesson{}).
		Select("group_name").
		Where("id = ? AND teacher_id = ?", lessonID, userID).
		Pluck("group_name", &groupName).Error

	if err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found or access denied")
		return
	}

	// Start transaction
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete existing attendance records - note the table name "attendances"
		if err := tx.Where("lesson_id = ?", lessonID).Delete(&models.Attendance{}).Error; err != nil {
			return err
		}

		// Create a map for faster lookup
		attendedMap := make(map[int]bool)
		for _, id := range req.AttendedStudentIDs {
			attendedMap[id] = true
		}

		// Get all students in this group
		var students []models.Student
		if err := tx.Where("teacher_id = ? AND group_name = ?", userID, groupName).Find(&students).Error; err != nil {
			return err
		}

		// Insert new attendance records
		var attendanceRecords []models.Attendance

		for _, student := range students {
			attended := 0
			if attendedMap[student.ID] {
				attended = 1
			}

			attendanceRecords = append(attendanceRecords, models.Attendance{
				LessonID:  lessonID,
				StudentID: student.ID,
				Attended:  attended,
			})
		}

		// Bulk insert all attendance records
		if len(attendanceRecords) > 0 {
			return tx.Create(&attendanceRecords).Error
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error saving attendance")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Save Attendance",
		fmt.Sprintf("Saved attendance for lesson ID %d, group %s", lessonID, groupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Attendance saved successfully", nil)
}

// DeleteAttendance deletes attendance records for a lesson
func (h *AttendanceHandler) DeleteAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["lessonId"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Verify the lesson belongs to this teacher
	var lesson models.Lesson
	if err := h.DB.Where("id = ? AND teacher_id = ?", lessonID, userID).First(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found or access denied")
		return
	}

	// Delete attendance records - note the table name "attendances"
	if err := h.DB.Where("lesson_id = ?", lessonID).Delete(&models.Attendance{}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting attendance records")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Attendance",
		fmt.Sprintf("Deleted attendance for lesson ID %d, group %s", lessonID, lesson.GroupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Attendance deleted successfully", nil)
}

// ExportAttendance exports attendance data to Excel
func (h *AttendanceHandler) ExportAttendance(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get export mode
	exportMode := r.URL.Query().Get("mode")
	if exportMode != "group" && exportMode != "lesson" {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid export mode. Use 'group' or 'lesson'")
		return
	}

	// Create Excel file
	file := xlsx.NewFile()

	// Perform export based on mode
	if exportMode == "group" {
		// Export by group
		err = h.exportAttendanceByGroup(userID, file)
	} else {
		// Export by lesson
		err = h.exportAttendanceByLesson(userID, file)
	}

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error exporting attendance data")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Export Attendance",
		fmt.Sprintf("Exported attendance data in %s mode", exportMode))

	// Set headers for file download
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=attendance.xlsx")

	// Write file to response
	if err := file.Write(w); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error writing Excel file")
		return
	}
}

// Helper function to export attendance by group
func (h *AttendanceHandler) exportAttendanceByGroup(teacherID int, file *xlsx.File) error {
	// Get all subjects taught by this teacher with attendance
	var subjects []string
	err := h.DB.Raw(`
        SELECT DISTINCT l.subject
        FROM lessons l
        JOIN attendances a ON l.id = a.lesson_id
        WHERE l.teacher_id = ?
        ORDER BY l.subject
    `, teacherID).Scan(&subjects).Error

	if err != nil {
		log.Printf("Error fetching subjects: %v", err)
		return err
	}

	// Process each subject
	for _, subject := range subjects {
		// Create a worksheet for this subject
		sheet, err := file.AddSheet(subject)
		if err != nil {
			log.Printf("Error creating worksheet for subject %s: %v", subject, err)
			return err
		}

		// Get all lessons for this subject with attendance
		type LessonInfo struct {
			ID      int
			Date    string
			DateFmt string
			Group   string
			Topic   string
		}

		var lessons []LessonInfo
		err = h.DB.Raw(`
            SELECT l.id, l.date, l.group_name as Group, l.topic
            FROM lessons l
            WHERE l.teacher_id = ? AND l.subject = ? AND EXISTS (
                SELECT 1 FROM attendances a WHERE a.lesson_id = l.id
            )
            ORDER BY l.date
        `, teacherID, subject).Scan(&lessons).Error

		if err != nil {
			log.Printf("Error fetching lessons for subject %s: %v", subject, err)
			return err
		}

		// Format dates
		for i := range lessons {
			date, err := time.Parse("2006-01-02", lessons[i].Date)
			if err == nil {
				lessons[i].DateFmt = date.Format("02.01.2006")
			} else {
				lessons[i].DateFmt = lessons[i].Date
			}
		}

		if len(lessons) == 0 {
			// No lessons with attendance for this subject
			headerRow := sheet.AddRow()
			headerRow.AddCell().SetString("No attendance data available for this subject")
			continue
		}

		// Group lessons by date
		lessonsByDate := make(map[string][]LessonInfo)
		var dates []string
		var formattedDates []string

		for _, lesson := range lessons {
			// Keep track of unique dates in order
			if _, exists := lessonsByDate[lesson.Date]; !exists {
				dates = append(dates, lesson.Date)
				formattedDates = append(formattedDates, lesson.DateFmt)
			}
			lessonsByDate[lesson.Date] = append(lessonsByDate[lesson.Date], lesson)
		}

		// Create header row
		headerRow := sheet.AddRow()
		headerRow.AddCell().SetString("Group")
		headerRow.AddCell().SetString("Student")

		for _, formattedDate := range formattedDates {
			headerCell := headerRow.AddCell()
			headerCell.SetString(formattedDate)
		}

		// Get all groups for this subject
		var groups []string
		err = h.DB.Raw(`
            SELECT DISTINCT l.group_name
            FROM lessons l
            WHERE l.teacher_id = ? AND l.subject = ? AND EXISTS (
                SELECT 1 FROM attendances a WHERE a.lesson_id = l.id
            )
            ORDER BY l.group_name
        `, teacherID, subject).Scan(&groups).Error

		if err != nil {
			log.Printf("Error fetching groups for subject %s: %v", subject, err)
			return err
		}

		// For each group
		for _, group := range groups {
			// Get all students in this group
			var students []struct {
				ID         int
				StudentFIO string
			}

			err = h.DB.Raw(`
                SELECT id, student_fio
                FROM students
                WHERE teacher_id = ? AND group_name = ?
                ORDER BY student_fio
            `, teacherID, group).Scan(&students).Error

			if err != nil {
				log.Printf("Error fetching students for group %s: %v", group, err)
				return err
			}

			var firstStudent = true
			// For each student
			for _, student := range students {
				row := sheet.AddRow()

				// Only show group name for first student in group
				if firstStudent {
					row.AddCell().SetString(group)
					firstStudent = false
				} else {
					row.AddCell().SetString("")
				}

				row.AddCell().SetString(student.StudentFIO)

				// For each date
				for _, dateStr := range dates {
					// Find all lessons for this date and group
					var attended bool
					var lessonFound bool

					for _, lesson := range lessonsByDate[dateStr] {
						if lesson.Group == group {
							lessonFound = true

							// Check attendance
							var attendanceValue int
							err := h.DB.Raw(`
                                SELECT COALESCE(attended, 0)
                                FROM attendances
                                WHERE lesson_id = ? AND student_id = ?
                            `, lesson.ID, student.ID).Scan(&attendanceValue).Error

							if err == nil && attendanceValue == 1 {
								attended = true
								break
							}
						}
					}

					attendanceCell := row.AddCell()
					if lessonFound {
						if attended {
							attendanceCell.SetString("✓") // Present
						} else {
							attendanceCell.SetString("✗") // Absent
						}
					} else {
						attendanceCell.SetString("-") // No lesson for this group on this date
					}
				}
			}
		}
	}

	return nil
}

// Helper function to export attendance by lesson
func (h *AttendanceHandler) exportAttendanceByLesson(teacherID int, file *xlsx.File) error {
	// Get all groups for this teacher with attendance data
	var groups []string
	err := h.DB.Raw(`
		SELECT DISTINCT l.group_name
		FROM lessons l
		JOIN attendances a ON l.id = a.lesson_id
		WHERE l.teacher_id = ?
		ORDER BY l.group_name
	`, teacherID).Scan(&groups).Error

	if err != nil {
		return err
	}

	// Process each group
	for _, group := range groups {
		// Create a worksheet for this group
		sheet, err := file.AddSheet(group)
		if err != nil {
			return err
		}

		// Get all lessons for this group with attendance
		type LessonInfo struct {
			ID      int
			Subject string
			Topic   string
			Date    string
			DateFmt string
		}

		var lessons []LessonInfo
		err = h.DB.Raw(`
			SELECT l.id, l.subject, l.topic, l.date
			FROM lessons l
			WHERE l.teacher_id = ? AND l.group_name = ? AND EXISTS (
				SELECT 1 FROM attendances a WHERE a.lesson_id = l.id
			)
			ORDER BY l.date
		`, teacherID, group).Scan(&lessons).Error

		if err != nil {
			return err
		}

		// Format dates
		for i := range lessons {
			date, err := time.Parse("2006-01-02", lessons[i].Date)
			if err == nil {
				lessons[i].DateFmt = date.Format("02.01.2006")
			} else {
				lessons[i].DateFmt = lessons[i].Date
			}
		}

		if len(lessons) == 0 {
			// No lessons with attendance for this group
			headerRow := sheet.AddRow()
			headerRow.AddCell().SetString("No attendance data available for this group")
			continue
		}

		// Create header row with student name and lesson details
		headerRow := sheet.AddRow()
		headerRow.AddCell().SetString("Student")

		for _, lesson := range lessons {
			headerCell := headerRow.AddCell()
			headerCell.SetString(fmt.Sprintf("%s: %s (%s)", lesson.Subject, lesson.Topic, lesson.DateFmt))
		}

		// Get all students in this group
		var students []struct {
			ID         int
			StudentFIO string
		}

		err = h.DB.Raw(`
			SELECT id, student_fio
			FROM students
			WHERE teacher_id = ? AND group_name = ?
			ORDER BY student_fio
		`, teacherID, group).Scan(&students).Error

		if err != nil {
			return err
		}

		// For each student, create a row with attendance for each lesson
		for _, student := range students {
			row := sheet.AddRow()
			row.AddCell().SetString(student.StudentFIO)

			// Add attendance for each lesson
			for _, lesson := range lessons {
				var attended int
				err := h.DB.Raw(`
					SELECT COALESCE(attended, 0)
					FROM attendances
					WHERE lesson_id = ? AND student_id = ?
				`, lesson.ID, student.ID).Scan(&attended).Error

				attendanceCell := row.AddCell()
				if err == nil && attended == 1 {
					attendanceCell.SetString("✓") // Present
				} else {
					attendanceCell.SetString("✗") // Absent
				}
			}
		}
	}

	return nil
}
