package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
	"github.com/tealeg/xlsx"
	"gorm.io/gorm"

	"github.com/xuri/excelize/v2"
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
	ID        int            `json:"id"`
	GroupName string         `json:"group_name"`
	Groups    pq.StringArray `json:"groups"`
	Subject   string         `json:"subject"`
	Topic     string         `json:"topic"`
	Hours     int            `json:"hours"`
	Date      string         `json:"date"`
	Type      string         `json:"type"`
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
		query = query.Where("? = ANY (groups)", group)
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
		fmt.Sprintf("Created %s: %s, %s, %s, %d hours", req.Type, req.Subject, req.GroupName, req.Topic, req.Hours))

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
		query = query.Where("? = ANY (groups)", groupFilter)
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
		Where("teacher_id = ? AND ? = ANY (groups)", userID, groupName).
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

// ExportWorkloadJournal exports teacher's workload journal to Excel
func (h *LessonHandler) ExportWorkloadJournal(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get teacher information
	var teacher models.User
	if err := h.DB.First(&teacher, userID).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving teacher information")
		return
	}

	// Get filter parameters
	subjectFilter := r.URL.Query().Get("subject")
	groupFilter := r.URL.Query().Get("group")
	fromDateFilter := r.URL.Query().Get("from_date")
	toDateFilter := r.URL.Query().Get("to_date")

	// Открываем шаблон титула через excelize, чтобы сохранить все объединения и стили
	var f *excelize.File
	templatePaths := []string{
		"/app/dashboard/tmp_excel/workload_titul.xlsx",
		"app/dashboard/tmp_excel/workload_titul.xlsx",
		"app/dashboard/tmp_excel/WorkLoad_Titul.xlsx",
	}
	for _, p := range templatePaths {
		ff, openErr := excelize.OpenFile(p)
		if openErr == nil {
			f = ff
			break
		}
	}
	if f == nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error opening workload title template")
		return
	}
	defer func() { _ = f.Close() }()

	// Заполним плейсхолдеры на титуле
	academicYear := func() string {
		now := time.Now()
		y := now.Year()
		if now.Month() >= 9 {
			return fmt.Sprintf("%d-%d", y, y+1)
		}
		return fmt.Sprintf("%d-%d", y-1, y)
	}()

	query := h.DB.Model(&models.Lesson{}).Where("teacher_id = ?", userID)
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}
	var totalHours int
	var totalLessons int64
	query.Count(&totalLessons)
	_ = query.Select("SUM(hours)").Row().Scan(&totalHours)

	periodText := h.buildPeriodText(fromDateFilter, toDateFilter)
	placeholders := map[string]string{
		"{{FIO}}":           teacher.FIO,
		"{{YEAR}}":          academicYear,
		"{{PERIOD}}":        periodText,
		"{{SUBJECT}}":       subjectFilter,
		"{{GROUP}}":         groupFilter,
		"{{TOTAL_HOURS}}":   fmt.Sprintf("%d", totalHours),
		"{{TOTAL_LESSONS}}": fmt.Sprintf("%d", totalLessons),
		"{{GENERATED_AT}}":  time.Now().Format("02.01.2006 15:04"),
	}
	if err := h.fillTitlePlaceholdersX(f, placeholders); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error filling title placeholders")
		return
	}

	// Создаём листы с данными (excelize)
	if err := h.createWorkloadJournalX(userID, teacher, subjectFilter, groupFilter, fromDateFilter, toDateFilter, f); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating workload journal")
		return
	}

	// Имя файла и лог
	fileName := fmt.Sprintf("workload_journal_%s.xlsx", teacher.FIO)
	utils.LogAction(h.DB, userID, "Export Workload Journal", "Exported workload journal to Excel")

	// Отдаём файл в ответ, сохраняя форматирование
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))

	buf, err := f.WriteToBuffer()
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error writing Excel file")
		return
	}
	_, _ = w.Write(buf.Bytes())
}

// createWorkloadJournal creates the workload journal sheet in the Excel file
func (h *LessonHandler) createWorkloadJournal(userID int, teacher models.User, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, file *xlsx.File) error {
	// We use the provided template file as base. Do not remove or recreate the title sheet.

	// Create main workload sheet
	if err := h.createMainWorkloadSheet(userID, teacher, subjectFilter, groupFilter, fromDateFilter, toDateFilter, file); err != nil {
		return err
	}

	// Create summary sheet
	if err := h.createSummarySheet(userID, teacher, subjectFilter, groupFilter, fromDateFilter, toDateFilter, file); err != nil {
		return err
	}

	return nil
}

// createMainWorkloadSheet creates the main workload sheet in the Excel file
func (h *LessonHandler) createMainWorkloadSheet(userID int, teacher models.User, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, file *xlsx.File) error {
	sheet, err := file.AddSheet("Рабочая нагрузка")
	if err != nil {
		return err
	}

	// avoid unused parameter warning
	_ = teacher

	// Set column widths
	_ = sheet.SetColWidth(0, 0, 12) // A - Date
	_ = sheet.SetColWidth(1, 1, 30) // B - Subject
	_ = sheet.SetColWidth(2, 2, 20) // C - Group
	_ = sheet.SetColWidth(3, 3, 40) // D - Topic
	_ = sheet.SetColWidth(4, 4, 20) // E - Type
	_ = sheet.SetColWidth(5, 5, 10) // F - Hours

	// Add header row
	header := sheet.AddRow()
	header.AddCell().SetString("Дата")
	header.AddCell().SetString("Предмет")
	header.AddCell().SetString("Группа")
	header.AddCell().SetString("Тема")
	header.AddCell().SetString("Тип занятия")
	header.AddCell().SetString("Часы")

	// Apply header style
	for _, cell := range header.Cells {
		cell.SetStyle(h.getHeaderStyle())
	}

	// Build query for lessons
	query := h.DB.Table("lessons").Where("teacher_id = ?", userID)

	// Apply filters
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}

	// Get lessons
	var lessons []models.Lesson
	if err := query.Order("date ASC").Find(&lessons).Error; err != nil {
		return err
	}

	// Add data rows
	for i, lesson := range lessons {
		row := sheet.AddRow()

		// Format date
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

		// Apply alternating row style
		if i%2 == 1 {
			for _, cell := range row.Cells {
				cell.SetStyle(h.getAlternateRowStyle())
			}
		} else {
			for _, cell := range row.Cells {
				cell.SetStyle(h.getDataStyle())
			}
		}
	}

	return nil
}

// createSummarySheet creates the summary sheet in the Excel file
func (h *LessonHandler) createSummarySheet(userID int, teacher models.User, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, file *xlsx.File) error {
	sheet, err := file.AddSheet("Сводная информация")
	if err != nil {
		return err
	}

	// avoid unused parameter warning
	_ = teacher

	// Set column widths
	_ = sheet.SetColWidth(0, 0, 30) // A
	_ = sheet.SetColWidth(1, 1, 15) // B

	// Add header row
	header := sheet.AddRow()
	header.AddCell().SetString("Параметр")
	header.AddCell().SetString("Значение")

	// Apply header style
	for _, cell := range header.Cells {
		cell.SetStyle(h.getHeaderStyle())
	}

	// Build query with filters
	query := h.DB.Model(&models.Lesson{}).Where("teacher_id = ?", userID)

	// Apply filters
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}

	// Calculate total hours and lessons with filters applied
	var totalHours int
	var totalLessons int64
	query.Count(&totalLessons)
	_ = query.Select("SUM(hours)").Row().Scan(&totalHours)

	// Add data rows
	data := [][]interface{}{
		{"Общее количество часов", totalHours},
		{"Общее количество занятий", totalLessons},
	}

	for _, d := range data {
		row := sheet.AddRow()
		row.AddCell().SetString(fmt.Sprintf("%v", d[0]))

		// Handle different types properly
		switch v := d[1].(type) {
		case int:
			row.AddCell().SetInt(v)
		case int64:
			row.AddCell().SetInt(int(v))
		default:
			row.AddCell().SetString(fmt.Sprintf("%v", v))
		}
	}

	return nil
}

// buildPeriodText формирует строку периода по фильтрам
func (h *LessonHandler) buildPeriodText(from, to string) string {
	if from != "" && to != "" {
		fd, _ := time.Parse("2006-01-02", from)
		td, _ := time.Parse("2006-01-02", to)
		return fmt.Sprintf("с %s по %s", fd.Format("02.01.2006"), td.Format("02.01.2006"))
	}
	if from != "" {
		fd, _ := time.Parse("2006-01-02", from)
		return fmt.Sprintf("с %s", fd.Format("02.01.2006"))
	}
	if to != "" {
		td, _ := time.Parse("2006-01-02", to)
		return fmt.Sprintf("по %s", td.Format("02.01.2006"))
	}
	return ""
}

// fillTitlePlaceholdersX заменяет плейсхолдеры в шаблоне на значения, сохраняя стили и о��ъединения
func (h *LessonHandler) fillTitlePlaceholdersX(f *excelize.File, mapping map[string]string) error {
	for _, sheet := range f.GetSheetList() {
		rows, err := f.GetRows(sheet)
		if err != nil {
			continue
		}
		for rIdx, row := range rows {
			for cIdx, val := range row {
				replacement, ok := mapping[val]
				newVal := val
				replaced := false
				if ok {
					newVal = replacement
					replaced = true
				} else {
					for ph, rv := range mapping {
						if strings.Contains(newVal, ph) {
							newVal = strings.ReplaceAll(newVal, ph, rv)
							replaced = true
						}
					}
				}
				if replaced {
					col, _ := excelize.ColumnNumberToName(cIdx + 1)
					cell := fmt.Sprintf("%s%d", col, rIdx+1)
					if err := f.SetCellValue(sheet, cell, newVal); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}

// Additional style methods for title sheet
func (h *LessonHandler) getAcademicYearStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Size: 12,
			Bold: true,
		},
		Alignment: xlsx.Alignment{
			Horizontal: "center",
		},
	}
}

func (h *LessonHandler) getInfoLabelStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Size: 11,
			Bold: true,
		},
		Alignment: xlsx.Alignment{
			Horizontal: "left",
		},
	}
}

func (h *LessonHandler) getInfoValueStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Size: 11,
		},
		Alignment: xlsx.Alignment{
			Horizontal: "left",
		},
	}
}

func (h *LessonHandler) getSectionHeaderStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Size: 12,
			Bold: true,
		},
		Alignment: xlsx.Alignment{
			Horizontal: "left",
		},
		Fill: xlsx.Fill{
			PatternType: "solid",
			FgColor:     "D0D0D0",
		},
	}
}

// Style helper methods
func (h *LessonHandler) getTitleStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Size: 14,
			Bold: true,
		},
		Alignment: xlsx.Alignment{
			Horizontal: "center",
		},
	}
}

func (h *LessonHandler) getHeaderStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Bold: true,
		},
		Fill: xlsx.Fill{
			PatternType: "solid",
			FgColor:     "E0E0E0",
		},
		Border: xlsx.Border{
			Left:   "thin",
			Right:  "thin",
			Top:    "thin",
			Bottom: "thin",
		},
		Alignment: xlsx.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	}
}

func (h *LessonHandler) getDataStyle() *xlsx.Style {
	return &xlsx.Style{
		Border: xlsx.Border{
			Left:   "thin",
			Right:  "thin",
			Top:    "thin",
			Bottom: "thin",
		},
	}
}

func (h *LessonHandler) getAlternateRowStyle() *xlsx.Style {
	return &xlsx.Style{
		Fill: xlsx.Fill{
			PatternType: "solid",
			FgColor:     "F8F8F8",
		},
		Border: xlsx.Border{
			Left:   "thin",
			Right:  "thin",
			Top:    "thin",
			Bottom: "thin",
		},
	}
}

func (h *LessonHandler) getSummaryStyle() *xlsx.Style {
	return &xlsx.Style{
		Font: xlsx.Font{
			Bold: true,
		},
		Fill: xlsx.Fill{
			PatternType: "solid",
			FgColor:     "D0D0D0",
		},
		Border: xlsx.Border{
			Left:   "thick",
			Right:  "thick",
			Top:    "thick",
			Bottom: "thick",
		},
	}
}

// createWorkloadJournalX — версия на excelize, добавляет листы с данными и сводку
func (h *LessonHandler) createWorkloadJournalX(userID int, teacher models.User, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, f *excelize.File) error {
	if err := h.createMainWorkloadSheetX(userID, subjectFilter, groupFilter, fromDateFilter, toDateFilter, f); err != nil {
		return err
	}
	if err := h.createSummarySheetX(userID, subjectFilter, groupFilter, fromDateFilter, toDateFilter, f); err != nil {
		return err
	}
	return nil
}

func (h *LessonHandler) createMainWorkloadSheetX(userID int, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, f *excelize.File) error {
	sheet := "Рабочая нагрузка"
	if idx, _ := f.GetSheetIndex(sheet); idx == -1 {
		_, _ = f.NewSheet(sheet)
	}
	// ширины колонок
	_ = f.SetColWidth(sheet, "A", "A", 12)
	_ = f.SetColWidth(sheet, "B", "B", 30)
	_ = f.SetColWidth(sheet, "C", "C", 20)
	_ = f.SetColWidth(sheet, "D", "D", 40)
	_ = f.SetColWidth(sheet, "E", "E", 20)
	_ = f.SetColWidth(sheet, "F", "F", 10)
	// заголовок
	headers := []string{"Дата", "Предмет", "Группа", "Тема", "Тип занятия", "Часы"}
	for i, htxt := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, htxt)
	}
	headStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	_ = f.SetCellStyle(sheet, "A1", "F1", headStyle)
	// данные
	query := h.DB.Table("lessons").Where("teacher_id = ?", userID)
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}
	var lessons []models.Lesson
	if err := query.Order("date ASC").Find(&lessons).Error; err != nil {
		return err
	}
	dataStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	altStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F8F8F8"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	for i, l := range lessons {
		row := i + 2
		formatted := l.Date
		if d, err := time.Parse("2006-01-02", l.Date); err == nil {
			formatted = d.Format("02.01.2006")
		}
		vals := []interface{}{formatted, l.Subject, l.GroupName, l.Topic, l.Type, l.Hours}
		for c, v := range vals {
			cell, _ := excelize.CoordinatesToCellName(c+1, row)
			_ = f.SetCellValue(sheet, cell, v)
		}
		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(6, row)
		if i%2 == 1 {
			_ = f.SetCellStyle(sheet, startCell, endCell, altStyle)
		} else {
			_ = f.SetCellStyle(sheet, startCell, endCell, dataStyle)
		}
	}
	return nil
}

func (h *LessonHandler) createSummarySheetX(userID int, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, f *excelize.File) error {
	sheet := "Сводная информация"
	if idx, _ := f.GetSheetIndex(sheet); idx == -1 {
		_, _ = f.NewSheet(sheet)
	}
	_ = f.SetColWidth(sheet, "A", "A", 30)
	_ = f.SetColWidth(sheet, "B", "B", 15)
	_ = f.SetCellValue(sheet, "A1", "Параметр")
	_ = f.SetCellValue(sheet, "B1", "Значение")
	headStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	_ = f.SetCellStyle(sheet, "A1", "B1", headStyle)
	query := h.DB.Model(&models.Lesson{}).Where("teacher_id = ?", userID)
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}
	var totalHours int
	var totalLessons int64
	query.Count(&totalLessons)
	_ = query.Select("SUM(hours)").Row().Scan(&totalHours)
	rows := [][]interface{}{
		{"Общее количество часов", totalHours},
		{"Общее количество занятий", totalLessons},
	}
	for i, r := range rows {
		row := i + 2
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), r[0])
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), r[1])
	}
	return nil
}

/*
// Исправление опечаток в строках
func (h *LessonHandler) createMainWorkloadSheetX(userID int, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, f *excelize.File) error {
	sheet := "Рабочая нагрузка"
	if idx, _ := f.GetSheetIndex(sheet); idx == -1 {
		_, _ = f.NewSheet(sheet)
	}
	// ширины колонок
	_ = f.SetColWidth(sheet, "A", "A", 12)
	_ = f.SetColWidth(sheet, "B", "B", 30)
	_ = f.SetColWidth(sheet, "C", "C", 20)
	_ = f.SetColWidth(sheet, "D", "D", 40)
	_ = f.SetColWidth(sheet, "E", "E", 20)
	_ = f.SetColWidth(sheet, "F", "F", 10)
	// заголовок
	headers := []string{"Дата", "Предмет", "Группа", "Тема", "Тип занятия", "Часы"}
	for i, htxt := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, htxt)
	}
	headStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	_ = f.SetCellStyle(sheet, "A1", "F1", headStyle)
	// данные
	query := h.DB.Table("lessons").Where("teacher_id = ?", userID)
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}
	var lessons []models.Lesson
	if err := query.Order("date ASC").Find(&lessons).Error; err != nil {
		return err
	}
	dataStyle, _ := f.NewStyle(&excelize.Style{
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	altStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#F8F8F8"}, Pattern: 1},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	for i, l := range lessons {
		row := i + 2
		formatted := l.Date
		if d, err := time.Parse("2006-01-02", l.Date); err == nil {
			formatted = d.Format("02.01.2006")
		}
		vals := []interface{}{formatted, l.Subject, l.GroupName, l.Topic, l.Type, l.Hours}
		for c, v := range vals {
			cell, _ := excelize.CoordinatesToCellName(c+1, row)
			_ = f.SetCellValue(sheet, cell, v)
		}
		startCell, _ := excelize.CoordinatesToCellName(1, row)
		endCell, _ := excelize.CoordinatesToCellName(6, row)
		if i%2 == 1 {
			_ = f.SetCellStyle(sheet, startCell, endCell, altStyle)
		} else {
			_ = f.SetCellStyle(sheet, startCell, endCell, dataStyle)
		}
	}
	return nil
}

func (h *LessonHandler) createSummarySheetX(userID int, subjectFilter, groupFilter, fromDateFilter, toDateFilter string, f *excelize.File) error {
	sheet := "Сводная информация"
	if idx, _ := f.GetSheetIndex(sheet); idx == -1 {
		_, _ = f.NewSheet(sheet)
	}
	_ = f.SetColWidth(sheet, "A", "A", 30)
	_ = f.SetColWidth(sheet, "B", "B", 15)
	_ = f.SetCellValue(sheet, "A1", "Параметр")
	_ = f.SetCellValue(sheet, "B1", "Значение")
	headStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
		},
	})
	_ = f.SetCellStyle(sheet, "A1", "B1", headStyle)
	query := h.DB.Model(&models.Lesson{}).Where("teacher_id = ?", userID)
	if subjectFilter != "" {
		query = query.Where("subject = ?", subjectFilter)
	}
	if groupFilter != "" {
		query = query.Where("group_name = ?", groupFilter)
	}
	if fromDateFilter != "" {
		query = query.Where("date >= ?", fromDateFilter)
	}
	if toDateFilter != "" {
		query = query.Where("date <= ?", toDateFilter)
	}
	var totalHours int
	var totalLessons int64
	query.Count(&totalLessons)
	_ = query.Select("SUM(hours)").Row().Scan(&totalHours)
	rows := [][]interface{}{
		{"Общее количество часов", totalHours},
		{"Общее количество занятий", totalLessons},
	}
	for i, r := range rows {
		row := i + 2
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), r[0])
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), r[1])
	}
	return nil
}
*/
