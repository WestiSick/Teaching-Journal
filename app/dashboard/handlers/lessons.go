package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"github.com/gorilla/mux"
	"github.com/tealeg/xlsx"
	"gorm.io/gorm"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// LessonHandler handles lesson-related requests
type LessonHandler struct {
	DB *gorm.DB
}

// NewLessonHandler creates a new LessonHandler
func NewLessonHandler(database *gorm.DB) *LessonHandler {
	return &LessonHandler{
		DB: database,
	}
}

// LessonResponse is the standard format for lesson data returned in API responses
type LessonResponse struct {
	ID        int    `json:"id"`
	GroupName string `json:"group_name"`
	Subject   string `json:"subject"`
	Topic     string `json:"topic"`
	Hours     int    `json:"hours"`
	Date      string `json:"date"`
	Type      string `json:"type"`
}

// GetLessons returns all lessons for the current user
func (h *LessonHandler) GetLessons(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Optional query parameters for filtering
	subject := r.URL.Query().Get("subject")
	group := r.URL.Query().Get("group")
	fromDate := r.URL.Query().Get("from_date")
	toDate := r.URL.Query().Get("to_date")

	// Build query
	query := h.DB.Model(&models.Lesson{}).Where("teacher_id = ?", userID)

	// Apply filters if provided
	if subject != "" {
		query = query.Where("subject = ?", subject)
	}
	if group != "" {
		query = query.Where("group_name = ?", group)
	}
	if fromDate != "" {
		query = query.Where("date >= ?", fromDate)
	}
	if toDate != "" {
		query = query.Where("date <= ?", toDate)
	}

	// Get lessons
	var lessons []LessonResponse
	if err := query.Order("date DESC").Find(&lessons).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lessons")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lessons retrieved successfully", lessons)
}

// GetLesson returns a specific lesson by ID
func (h *LessonHandler) GetLesson(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Get lesson from database
	var lesson LessonResponse
	if err := h.DB.Model(&models.Lesson{}).
		Where("id = ? AND teacher_id = ?", lessonID, userID).
		First(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lesson retrieved successfully", lesson)
}

// CreateLessonRequest defines the request body for creating a lesson
type CreateLessonRequest struct {
	GroupName string `json:"group_name"`
	Subject   string `json:"subject"`
	Topic     string `json:"topic"`
	Hours     int    `json:"hours"`
	Date      string `json:"date"`
	Type      string `json:"type"`
}

// CreateLesson creates a new lesson
func (h *LessonHandler) CreateLesson(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req CreateLessonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.GroupName == "" || req.Subject == "" || req.Topic == "" || req.Hours <= 0 || req.Date == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	// Normalize lesson type
	if req.Type != "Лекция" && req.Type != "Лабораторная работа" && req.Type != "Практика" {
		req.Type = "Лекция"
	}

	// Create lesson
	lesson := models.Lesson{
		TeacherID: userID,
		GroupName: req.GroupName,
		Subject:   req.Subject,
		Topic:     req.Topic,
		Hours:     req.Hours,
		Date:      req.Date,
		Type:      req.Type,
	}

	if err := h.DB.Create(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating lesson")
		return
	}

	// Log the creation
	utils.LogAction(h.DB, userID, "Create Lesson",
		fmt.Sprintf("Created %s: %s, %s, %s, %d hours", req.Type, req.Subject, req.GroupName, req.Topic))

	utils.RespondWithSuccess(w, http.StatusCreated, "Lesson created successfully", map[string]interface{}{
		"id": lesson.ID,
	})
}

// UpdateLesson updates an existing lesson
func (h *LessonHandler) UpdateLesson(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Verify lesson exists and belongs to user
	var count int64
	h.DB.Model(&models.Lesson{}).
		Where("id = ? AND teacher_id = ?", lessonID, userID).
		Count(&count)

	if count == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found or access denied")
		return
	}

	// Parse request body
	var req CreateLessonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.GroupName == "" || req.Subject == "" || req.Topic == "" || req.Hours <= 0 || req.Date == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	// Normalize lesson type
	if req.Type != "Лекция" && req.Type != "Лабораторная работа" && req.Type != "Практика" {
		req.Type = "Лекция"
	}

	// Update lesson
	if err := h.DB.Model(&models.Lesson{}).
		Where("id = ? AND teacher_id = ?", lessonID, userID).
		Updates(map[string]interface{}{
			"group_name": req.GroupName,
			"subject":    req.Subject,
			"topic":      req.Topic,
			"hours":      req.Hours,
			"date":       req.Date,
			"type":       req.Type,
		}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating lesson")
		return
	}

	// Log the update
	utils.LogAction(h.DB, userID, "Update Lesson",
		fmt.Sprintf("Updated lesson ID %d: %s, %s, %s", lessonID, req.Subject, req.GroupName, req.Topic))

	utils.RespondWithSuccess(w, http.StatusOK, "Lesson updated successfully", nil)
}

// DeleteLesson deletes a lesson
func (h *LessonHandler) DeleteLesson(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get lesson ID from URL
	vars := mux.Vars(r)
	lessonID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Get lesson details for logging before deletion
	var lesson models.Lesson
	if err := h.DB.Where("id = ? AND teacher_id = ?", lessonID, userID).First(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "Lesson not found or access denied")
		return
	}

	// Delete lesson
	if err := h.DB.Where("id = ? AND teacher_id = ?", lessonID, userID).Delete(&models.Lesson{}).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting lesson")
		return
	}

	// Log the deletion
	utils.LogAction(h.DB, userID, "Delete Lesson",
		fmt.Sprintf("Deleted lesson ID %d: %s, %s, %s", lessonID, lesson.Subject, lesson.GroupName, lesson.Topic))

	utils.RespondWithSuccess(w, http.StatusOK, "Lesson deleted successfully", nil)
}

// GetSubjects returns all subjects for the current user
func (h *LessonHandler) GetSubjects(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subjects
	var subjects []string
	if err := h.DB.Model(&models.Lesson{}).
		Distinct("subject").
		Where("teacher_id = ?", userID).
		Order("subject").
		Pluck("subject", &subjects).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving subjects")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Subjects retrieved successfully", subjects)
}

// GetLessonsBySubject returns lessons for a specific subject
func (h *LessonHandler) GetLessonsBySubject(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get subject from URL
	vars := mux.Vars(r)
	subject := vars["subject"]

	// Get lessons for this subject
	var lessons []LessonResponse
	if err := h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ? AND subject = ?", userID, subject).
		Order("date").
		Find(&lessons).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving lessons")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Lessons retrieved successfully", lessons)
}

// ExportLessons exports lessons data to Excel
func (h *LessonHandler) ExportLessons(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get filter parameters
	groupFilter := r.URL.Query().Get("group")
	subjectFilter := r.URL.Query().Get("subject")
	fromDateFilter := r.URL.Query().Get("from_date")
	toDateFilter := r.URL.Query().Get("to_date")

	// Create Excel file
	file := xlsx.NewFile()

	// Extract filter parameters for logging
	var filterDesc []string
	var fileName = "lessons_export"

	if groupFilter != "" {
		filterDesc = append(filterDesc, "group="+groupFilter)
		fileName += "_" + groupFilter
	}
	if subjectFilter != "" {
		filterDesc = append(filterDesc, "subject="+subjectFilter)
		fileName += "_" + subjectFilter
	}
	if fromDateFilter != "" {
		filterDesc = append(filterDesc, "from="+fromDateFilter)
	}
	if toDateFilter != "" {
		filterDesc = append(filterDesc, "to="+toDateFilter)
	}

	fileName += ".xlsx"

	// Determine if we're filtering for a specific group only
	isGroupSpecificExport := groupFilter != "" && subjectFilter == "" && fromDateFilter == "" && toDateFilter == ""

	// If exporting just for one group with no other filters, use the group-specific format
	var exportErr error
	if isGroupSpecificExport {
		// Export with group-specific format (simplified columns)
		exportErr = h.exportGroupLessons(userID, groupFilter, file)
	} else {
		// Export with all columns and apply any filters
		exportErr = h.exportFilteredLessons(userID, groupFilter, subjectFilter, fromDateFilter, toDateFilter, file)
	}

	if exportErr != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error exporting lessons")
		return
	}

	// Log the action
	logMessage := "Exported all lessons to Excel"
	if len(filterDesc) > 0 {
		logMessage = "Exported lessons with filters: " + strings.Join(filterDesc, ", ")
	}
	utils.LogAction(h.DB, userID, "Export Lessons", logMessage)

	// Set headers for file download
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))

	// Write the file to the response
	if err := file.Write(w); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error writing Excel file")
		return
	}
}

// exportFilteredLessons exports lessons with filters applied
func (h *LessonHandler) exportFilteredLessons(userID int, groupFilter, subjectFilter, fromDateFilter, toDateFilter string, file *xlsx.File) error {
	// Create sheet
	sheet, err := file.AddSheet("All Lessons")
	if err != nil {
		return err
	}

	// Build query for lessons
	query := h.DB.Table("lessons").Where("teacher_id = ?", userID)

	// Apply filters
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}

	// Get filtered lessons
	var lessons []struct {
		ID        int
		Date      string
		Subject   string
		GroupName string
		Topic     string
		Type      string
		Hours     int
	}

	if err := query.Order("date ASC, group_name ASC").Find(&lessons).Error; err != nil {
		return err
	}

	// Add header row
	header := sheet.AddRow()
	header.AddCell().SetString("Дата")
	header.AddCell().SetString("Предмет")
	header.AddCell().SetString("Группа")
	header.AddCell().SetString("Тема")
	header.AddCell().SetString("Тип")
	header.AddCell().SetString("Часы")

	// Add data rows
	for _, lesson := range lessons {
		row := sheet.AddRow()

		// Format date to DD.MM.YYYY
		formattedDate := lesson.Date
		if date, err := time.Parse("2006-01-02", lesson.Date); err == nil {
			formattedDate = date.Format("02.01.2006")
		}

		row.AddCell().SetString(formattedDate)
		row.AddCell().SetString(lesson.Subject)
		row.AddCell().SetString(lesson.GroupName)
		row.AddCell().SetString(lesson.Topic)
		row.AddCell().SetString(lesson.Type)
		row.AddCell().SetInt(lesson.Hours)
	}

	// Add summary row
	summaryRow := sheet.AddRow()
	summaryRow.AddCell().SetString("Всего:")

	// Calculate total number of lessons and hours
	totalLessons := len(lessons)
	var totalHours int
	for _, lesson := range lessons {
		totalHours += lesson.Hours
	}

	summaryRow.AddCell().SetString(fmt.Sprintf("%d занятий", totalLessons))
	summaryRow.AddCell().SetString("")
	summaryRow.AddCell().SetString("")
	summaryRow.AddCell().SetString("")
	summaryRow.AddCell().SetInt(totalHours)

	return nil
}

// exportGroupLessons exports lessons for a specific group
func (h *LessonHandler) exportGroupLessons(userID int, groupName string, file *xlsx.File) error {
	// Create sheet
	sheet, err := file.AddSheet("Group " + groupName)
	if err != nil {
		return err
	}

	// Get lessons for this group
	var lessons []struct {
		ID      int
		Date    string
		Subject string
		Topic   string
		Type    string
		Hours   int
	}

	if err := h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Order("date ASC, subject ASC").
		Find(&lessons).Error; err != nil {
		return err
	}

	// Add header row
	header := sheet.AddRow()
	header.AddCell().SetString("Дата")
	header.AddCell().SetString("Предмет")
	header.AddCell().SetString("Тема")
	header.AddCell().SetString("Тип")
	header.AddCell().SetString("Часы")

	// Add data rows
	for _, lesson := range lessons {
		row := sheet.AddRow()

		// Format date to DD.MM.YYYY
		formattedDate := lesson.Date
		if date, err := time.Parse("2006-01-02", lesson.Date); err == nil {
			formattedDate = date.Format("02.01.2006")
		}

		row.AddCell().SetString(formattedDate)
		row.AddCell().SetString(lesson.Subject)
		row.AddCell().SetString(lesson.Topic)
		row.AddCell().SetString(lesson.Type)
		row.AddCell().SetInt(lesson.Hours)
	}

	// Add summary row
	summaryRow := sheet.AddRow()
	summaryRow.AddCell().SetString("Всего:")

	// Calculate total number of lessons and hours
	totalLessons := len(lessons)
	var totalHours int
	for _, lesson := range lessons {
		totalHours += lesson.Hours
	}

	summaryRow.AddCell().SetString(fmt.Sprintf("%d занятий", totalLessons))
	summaryRow.AddCell().SetString("")
	summaryRow.AddCell().SetString("")
	summaryRow.AddCell().SetInt(totalHours)

	return nil
}
