package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	scheduleModels "TeacherJournal/app/schedule/models"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Global variables
var (
	activeJobs = make(map[string]*scheduleModels.AsyncJob)
	jobsMutex  sync.Mutex
)

// Map of class type abbreviations to full names
var classTypeMap = map[string]string{
	"пр":  "Практика",
	"лек": "Лекция",
	"лаб": "Лабораторная работа",
}

// ScheduleHandler handles schedule-related requests
type ScheduleHandler struct {
	DB *gorm.DB
}

// NewScheduleHandler creates a new ScheduleHandler
func NewScheduleHandler(database *gorm.DB) *ScheduleHandler {
	return &ScheduleHandler{
		DB: database,
	}
}

// GetSchedule returns schedule for a specific teacher and date
func (h *ScheduleHandler) GetSchedule(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get query parameters
	teacher := r.URL.Query().Get("teacher")
	date := r.URL.Query().Get("date")
	endDate := r.URL.Query().Get("endDate")

	// Validate required parameters
	if teacher == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Teacher name is required")
		return
	}

	if date == "" {
		// Default to current date if not provided
		date = time.Now().Format("2006-01-02")
	}

	// Check if we need to fetch a date range
	isDateRange := endDate != "" && endDate != date

	// Variables to collect results
	var scheduleItems []scheduleModels.ScheduleItem
	var debugInfo strings.Builder
	var totalResponseSize int
	var totalItemCount int
	var baseCount int = 0

	if isDateRange {
		// Parse dates for calculations
		startDateParsed, err := time.Parse("2006-01-02", date)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid start date format. Use YYYY-MM-DD.")
			return
		}

		endDateParsed, err := time.Parse("2006-01-02", endDate)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid end date format. Use YYYY-MM-DD.")
			return
		}

		// Check that end date is not before start date
		if endDateParsed.Before(startDateParsed) {
			utils.RespondWithError(w, http.StatusBadRequest, "End date cannot be before start date")
			return
		}

		// Calculate number of 14-day periods to fetch
		totalDays := endDateParsed.Sub(startDateParsed).Hours() / 24
		numPeriods := int(totalDays/14) + 1

		debugInfo.WriteString(fmt.Sprintf("Requesting schedule for %d days (%d periods of 14 days)\n\n", int(totalDays)+1, numPeriods))

		// Process each period
		currentDate := startDateParsed
		for i := 0; i < numPeriods; i++ {
			currentDateStr := currentDate.Format("2006-01-02")

			// If we've gone past the end date, stop
			if currentDate.After(endDateParsed) {
				break
			}

			debugInfo.WriteString(fmt.Sprintf("=== Request #%d: %s ===\n", i+1, currentDateStr))

			// Fetch schedule from API
			apiDebugInfo, htmlContent, err := fetchDirectSchedule(teacher, currentDateStr)
			if err != nil {
				debugInfo.WriteString(fmt.Sprintf("Error fetching schedule for %s: %v\n", currentDateStr, err))
				// Continue with next period
				currentDate = currentDate.AddDate(0, 0, 14)
				continue
			}

			debugInfo.WriteString(apiDebugInfo)
			totalResponseSize += len(htmlContent)

			// Decode HTML entities
			decodedHTML := html.UnescapeString(htmlContent)

			// Parse schedule items from HTML with base count for continuous numbering
			_, newCount, periodItems := parseScheduleHTML(decodedHTML, userID, h.DB, baseCount)
			baseCount = newCount // Update base count for next period

			// Filter items that are beyond the requested end date
			var filteredItems []scheduleModels.ScheduleItem
			for _, item := range periodItems {
				itemDate, err := time.Parse("2006-01-02", item.Date)
				if err != nil {
					continue
				}

				if !itemDate.After(endDateParsed) {
					filteredItems = append(filteredItems, item)
				}
			}

			// Add filtered items to result
			scheduleItems = append(scheduleItems, filteredItems...)
			totalItemCount += len(filteredItems)

			// Move to next period
			currentDate = currentDate.AddDate(0, 0, 14)
		}

		debugInfo.WriteString(fmt.Sprintf("\n=== Total: found %d items for the entire period ===\n", totalItemCount))

	} else {
		// Fetch schedule for a single date
		apiDebugInfo, htmlContent, err := fetchDirectSchedule(teacher, date)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch schedule from API")
			return
		}

		// Decode HTML entities
		decodedHTML := html.UnescapeString(htmlContent)

		// Parse schedule items from HTML
		_, itemCount, items := parseScheduleHTML(decodedHTML, userID, h.DB, baseCount)

		scheduleItems = items
		totalResponseSize = len(htmlContent)
		totalItemCount = itemCount
		debugInfo.WriteString(apiDebugInfo)
	}

	// Sort schedule items by date and time
	sort.Slice(scheduleItems, func(i, j int) bool {
		if scheduleItems[i].Date == scheduleItems[j].Date {
			return scheduleItems[i].Time < scheduleItems[j].Time
		}
		return scheduleItems[i].Date < scheduleItems[j].Date
	})

	// Create response
	response := scheduleModels.ScheduleResponse{
		ScheduleItems: scheduleItems,
		ResponseSize:  totalResponseSize,
		ItemCount:     totalItemCount,
		DebugInfo:     debugInfo.String(),
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Schedule retrieved successfully", response)
}

// StartAsyncFetch starts asynchronous fetching of schedule for a date range
func (h *ScheduleHandler) StartAsyncFetch(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req scheduleModels.AsyncFetchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate request
	if req.Teacher == "" || req.StartDate == "" || req.EndDate == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Teacher, startDate, and endDate are required")
		return
	}

	// Generate a unique job ID
	jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())

	// Start the async job
	go startAsyncJob(jobID, req.Teacher, req.StartDate, req.EndDate, userID, h.DB)

	// Return job ID to client
	utils.RespondWithSuccess(w, http.StatusOK, "Async fetch started", map[string]string{
		"jobID": jobID,
	})
}

// GetProgress returns the progress of an async fetch job
func (h *ScheduleHandler) GetProgress(w http.ResponseWriter, r *http.Request) {
	// Get job ID from URL
	vars := mux.Vars(r)
	jobID := vars["jobID"]

	// Check if job exists
	jobsMutex.Lock()
	job, exists := activeJobs[jobID]
	jobsMutex.Unlock()

	if !exists {
		utils.RespondWithError(w, http.StatusNotFound, "Job not found")
		return
	}

	// Create progress response
	progress := scheduleModels.ProgressResponse{
		JobID:        job.ID,
		Progress:     job.Progress,
		Status:       job.Status,
		TotalPeriods: job.TotalPeriods,
		Completed:    job.Completed,
		ItemCount:    job.Result.ItemCount,
		Finished:     job.Finished,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Progress retrieved", progress)
}

// GetResults returns the results of a completed async fetch job
func (h *ScheduleHandler) GetResults(w http.ResponseWriter, r *http.Request) {
	// Get job ID from URL
	vars := mux.Vars(r)
	jobID := vars["jobID"]

	// Check if job exists
	jobsMutex.Lock()
	job, exists := activeJobs[jobID]
	jobsMutex.Unlock()

	if !exists {
		utils.RespondWithError(w, http.StatusNotFound, "Job not found")
		return
	}

	// Check if job is finished
	if !job.Finished {
		utils.RespondWithError(w, http.StatusPreconditionFailed, "Job is still in progress")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Results retrieved successfully", job.Result)
}

// AddLesson adds a single lesson to the system
func (h *ScheduleHandler) AddLesson(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body directly into ScheduleItem
	var scheduleItem scheduleModels.ScheduleItem
	if err := json.NewDecoder(r.Body).Decode(&scheduleItem); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Check if lesson is already in the system
	if scheduleItem.InSystem {
		utils.RespondWithError(w, http.StatusConflict, "Lesson is already in the system")
		return
	}

	groups := scheduleItem.Groups
	if len(groups) == 0 {
		groups = strings.Split(scheduleItem.Group, ",")
	}

	cleaned := []string{}
	for _, g := range groups {
		grp := strings.TrimSpace(g)
		if grp != "" {
			cleaned = append(cleaned, grp)
		}
	}

	if len(cleaned) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Group name is required")
		return
	}

	groupField := strings.Join(cleaned, ", ")

	var existingCount int64
	h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ? AND date = ? AND group_name = ? AND subject = ?",
			userID, scheduleItem.Date, groupField, scheduleItem.Subject).
		Count(&existingCount)
	if existingCount > 0 {
		utils.RespondWithError(w, http.StatusConflict, "Lesson already exists")
		return
	}

	lesson := models.Lesson{
		TeacherID:  userID,
		GroupName:  groupField,
		Groups:     pq.StringArray(cleaned),
		Subject:    scheduleItem.Subject,
		Topic:      "Импортировано из расписания",
		Hours:      2,
		Date:       scheduleItem.Date,
		Type:       scheduleItem.ClassType,
		Auditorium: scheduleItem.Auditorium,
	}

	if err := h.DB.Create(&lesson).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add lesson")
		return
	}

	addedCount := 1

	utils.LogAction(h.DB, userID, "Import Lesson from Schedule",
		fmt.Sprintf("Added %d lessons from schedule", addedCount))

	utils.RespondWithSuccess(w, http.StatusCreated, "Lesson added successfully", map[string]interface{}{
		"added": addedCount,
	})
}

// AddAllLessons adds multiple lessons to the system
func (h *ScheduleHandler) AddAllLessons(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req scheduleModels.AddAllLessonsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Check if there are lessons to add
	if len(req.ScheduleItems) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "No lessons to add")
		return
	}

	// Track results
	successfullyAdded := 0
	failedToAdd := 0
	duplicatesSkipped := 0
	var lessonsToAdd []models.Lesson

	// Process each schedule item
	for _, item := range req.ScheduleItems {
		groups := item.Groups
		if len(groups) == 0 {
			groups = strings.Split(item.Group, ",")
		}

		cleaned := []string{}
		for _, g := range groups {
			grp := strings.TrimSpace(g)
			if grp != "" {
				cleaned = append(cleaned, grp)
			}
		}

		if len(cleaned) == 0 {
			continue
		}

		groupField := strings.Join(cleaned, ", ")

		var existingCount int64
		h.DB.Model(&models.Lesson{}).
			Where("teacher_id = ? AND date = ? AND group_name = ? AND subject = ?",
				userID, item.Date, groupField, item.Subject).
			Count(&existingCount)

		if existingCount > 0 {
			duplicatesSkipped++
			continue
		}

		lesson := models.Lesson{
			TeacherID:  userID,
			GroupName:  groupField,
			Groups:     pq.StringArray(cleaned),
			Subject:    item.Subject,
			Topic:      "Импортировано из расписания",
			Hours:      2,
			Date:       item.Date,
			Type:       item.ClassType,
			Auditorium: item.Auditorium,
		}

		lessonsToAdd = append(lessonsToAdd, lesson)
	}

	// If no new lessons to add after duplicate check
	if len(lessonsToAdd) == 0 {
		utils.RespondWithSuccess(w, http.StatusOK, "All lessons already exist in the system", map[string]interface{}{
			"duplicatesSkipped": duplicatesSkipped,
		})
		return
	}

	// Add lessons in batches
	batchSize := 20
	totalBatches := (len(lessonsToAdd) + batchSize - 1) / batchSize

	for i := 0; i < totalBatches; i++ {
		start := i * batchSize
		end := start + batchSize
		if end > len(lessonsToAdd) {
			end = len(lessonsToAdd)
		}

		currentBatch := lessonsToAdd[start:end]

		// Create transaction for batch
		tx := h.DB.Begin()
		batchSuccess := 0

		for _, lesson := range currentBatch {
			if err := tx.Create(&lesson).Error; err != nil {
				failedToAdd++
			} else {
				batchSuccess++
			}
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			failedToAdd += len(currentBatch)
		} else {
			successfullyAdded += batchSuccess
		}
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Import All Lessons from Schedule",
		fmt.Sprintf("Added %d lessons from schedule (failed: %d, duplicates: %d)",
			successfullyAdded, failedToAdd, duplicatesSkipped))

	utils.RespondWithSuccess(w, http.StatusOK, "Lessons added successfully", map[string]interface{}{
		"added":             successfullyAdded,
		"failed":            failedToAdd,
		"duplicatesSkipped": duplicatesSkipped,
	})
}

// startAsyncJob starts an asynchronous job to fetch schedule data
func startAsyncJob(jobID, teacher, startDate, endDate string, userID int, database *gorm.DB) {
	// Initialize new job
	job := &scheduleModels.AsyncJob{
		ID:          jobID,
		TeacherName: teacher,
		StartDate:   startDate,
		EndDate:     endDate,
		Progress:    0,
		Status:      "Initializing...",
		ClientChans: make(map[chan scheduleModels.ProgressResponse]bool),
		Result: scheduleModels.AsyncJobResult{
			JobID:         jobID,
			TeacherName:   teacher,
			StartDate:     startDate,
			EndDate:       endDate,
			ScheduleItems: []scheduleModels.ScheduleItem{},
			Status:        "running",
		},
		LastUpdated: time.Now(),
	}

	// Register job in global map
	jobsMutex.Lock()
	activeJobs[jobID] = job
	jobsMutex.Unlock()

	// Parse dates for calculations
	startDateParsed, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		job.Status = fmt.Sprintf("Error: %v", err)
		job.Result.Status = "error"
		job.Result.DebugInfo = fmt.Sprintf("Error parsing start date: %v", err)
		job.Progress = 100
		job.Finished = true
		return
	}

	endDateParsed, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		job.Status = fmt.Sprintf("Error: %v", err)
		job.Result.Status = "error"
		job.Result.DebugInfo = fmt.Sprintf("Error parsing end date: %v", err)
		job.Progress = 100
		job.Finished = true
		return
	}

	// Check that end date is not before start date
	if endDateParsed.Before(startDateParsed) {
		job.Status = "Error: End date cannot be before start date"
		job.Result.Status = "error"
		job.Result.DebugInfo = "Error: End date cannot be before start date"
		job.Progress = 100
		job.Finished = true
		return
	}

	// Calculate number of 14-day periods to fetch
	totalDays := endDateParsed.Sub(startDateParsed).Hours() / 24
	numPeriods := int(totalDays/14) + 1
	job.TotalPeriods = numPeriods

	job.Status = fmt.Sprintf("Starting fetch for %d periods", numPeriods)
	job.Progress = 5

	// Prepare for collecting results
	var debugInfo strings.Builder
	var allScheduleItems []scheduleModels.ScheduleItem
	totalResponseSize := 0
	totalItemCount := 0
	var baseCount int = 0 // Initialize base count for continuous numbering

	debugInfo.WriteString(fmt.Sprintf("Requesting schedule for %d days (%d periods of 14 days)\n\n", int(totalDays)+1, numPeriods))

	// Process each period
	currentDate := startDateParsed
	for i := 0; i < numPeriods; i++ {
		if job.Finished {
			return // Stop if job is canceled
		}

		// Update progress
		job.Status = fmt.Sprintf("Loading period %d of %d", i+1, numPeriods)
		job.Progress = 5 + (i * 90 / numPeriods) // 5% at start, 95% at end
		job.Completed = i

		// Format current date for API request
		currentDateStr := currentDate.Format("2006-01-02")

		// If we've gone past the end date, stop
		if currentDate.After(endDateParsed) {
			break
		}

		debugInfo.WriteString(fmt.Sprintf("=== Request #%d: %s ===\n", i+1, currentDateStr))

		// Add delay to avoid API rate limiting
		time.Sleep(500 * time.Millisecond)

		// Fetch schedule from API
		apiDebugInfo, htmlContent, err := fetchDirectSchedule(teacher, currentDateStr)
		if err != nil {
			debugInfo.WriteString(fmt.Sprintf("Error fetching schedule for %s: %v\n", currentDateStr, err))
			// Continue with next period
			currentDate = currentDate.AddDate(0, 0, 14)
			continue
		}

		debugInfo.WriteString(apiDebugInfo)
		totalResponseSize += len(htmlContent)

		// Decode HTML entities
		decodedHTML := html.UnescapeString(htmlContent)

		// Parse schedule items from HTML with base count for continuous numbering
		_, newCount, periodItems := parseScheduleHTML(decodedHTML, userID, database, baseCount)
		baseCount = newCount // Update base count for next period

		// Filter items that are beyond the requested end date
		var filteredItems []scheduleModels.ScheduleItem
		for _, item := range periodItems {
			itemDate, err := time.Parse("2006-01-02", item.Date)
			if err != nil {
				continue
			}

			if !itemDate.After(endDateParsed) {
				filteredItems = append(filteredItems, item)
			}
		}

		// Add filtered items to result
		allScheduleItems = append(allScheduleItems, filteredItems...)
		totalItemCount += len(filteredItems)

		// Update intermediate result
		job.Result.ItemCount = totalItemCount

		// Move to next period
		currentDate = currentDate.AddDate(0, 0, 14)
	}

	debugInfo.WriteString(fmt.Sprintf("\n=== Total: found %d items for the entire period ===\n", totalItemCount))

	// Sort all items by date and time
	sort.Slice(allScheduleItems, func(i, j int) bool {
		if allScheduleItems[i].Date == allScheduleItems[j].Date {
			return allScheduleItems[i].Time < allScheduleItems[j].Time
		}
		return allScheduleItems[i].Date < allScheduleItems[j].Date
	})

	// Save results in job
	job.Result.DebugInfo = debugInfo.String()
	job.Result.ResponseSize = totalResponseSize
	job.Result.ItemCount = totalItemCount
	job.Result.ScheduleItems = allScheduleItems
	job.Result.Status = "completed"
	job.Result.CompletionTime = time.Now().Format("2006-01-02 15:04:05")

	// Update job status
	job.Status = "Fetch completed"
	job.Progress = 100
	job.Finished = true

	// Keep result for some time, then delete
	go func() {
		time.Sleep(1 * time.Hour)
		jobsMutex.Lock()
		delete(activeJobs, jobID)
		jobsMutex.Unlock()
	}()
}

// parseScheduleHTML extracts schedule information from HTML response
// Обновлено: добавлен параметр baseCount для непрерывной нумерации и извлечение аудитории
func parseScheduleHTML(html string, userID int, database *gorm.DB, baseCount int) (string, int, []scheduleModels.ScheduleItem) {
	var result strings.Builder
	itemCount := baseCount // Начинаем с переданного базового счетчика, а не с 0
	var scheduleItems []scheduleModels.ScheduleItem

	// Check for empty HTML
	if html == "" {
		return result.String(), itemCount, scheduleItems
	}

	// Regular expression for finding day blocks
	dayBlockRegex := regexp.MustCompile(`(?s)<div[^>]*margin-bottom: 25px[^>]*>\s*<div>\s*<strong>(\d+) ([а-яА-Я]+) (\d{4})</strong>\s*</div>\s*<div>\s*([а-яА-Я]+)\s*</div>\s*<table>(.*?)</table>\s*</div>`)
	dayBlocks := dayBlockRegex.FindAllStringSubmatch(html, -1)

	if len(dayBlocks) == 0 {
		return result.String(), itemCount, scheduleItems
	}

	for _, dayBlock := range dayBlocks {
		if len(dayBlock) < 6 {
			continue
		}

		day := dayBlock[1]
		monthRussian := strings.ToLower(dayBlock[2])
		year := dayBlock[3]
		scheduleTable := dayBlock[5]

		// Skip days with no classes
		if strings.Contains(scheduleTable, "Нет пар") {
			continue
		}

		// Get numeric month
		var month string
		switch monthRussian {
		case "января":
			month = "01"
		case "февраля":
			month = "02"
		case "марта":
			month = "03"
		case "апреля":
			month = "04"
		case "мая":
			month = "05"
		case "июня":
			month = "06"
		case "июля":
			month = "07"
		case "августа":
			month = "08"
		case "сентября":
			month = "09"
		case "октября":
			month = "10"
		case "ноября":
			month = "11"
		case "декабря":
			month = "12"
		default:
			continue
		}

		// Format date as YYYY-MM-DD for DB and DD.MM.YYYY for display
		dbFormatDate := fmt.Sprintf("%s-%s-%s", year, month, day)

		// Find all classes in this day's schedule
		classRegex := regexp.MustCompile(`(?s)<tr>\s*<td[^>]*>(\d+:\d+-\d+:\d+)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>`)
		classes := classRegex.FindAllStringSubmatch(scheduleTable, -1)

		if len(classes) == 0 {
			// No classes found for this day
			continue
		}

		for _, class := range classes {
			if len(class) < 3 {
				continue
			}

			// Get class time
			classTime := class[1]

			// Get class details
			classContent := class[2]

			// Find class type and subject name
			subjectRegex := regexp.MustCompile(`(лаб|пр|лек)\.\s+([^<\r\n]+)`)
			subjectMatch := subjectRegex.FindStringSubmatch(classContent)

			if len(subjectMatch) < 3 {
				continue
			}

			classType := subjectMatch[1]
			subjectName := strings.TrimSpace(subjectMatch[2])

			// Get full class type name
			classTypeFull, ok := classTypeMap[classType]
			if !ok {
				classTypeFull = classType + "."
			}

			// Find all groups (e.g., ИС1-227-ОТ)
			groupRegex := regexp.MustCompile(`([А-Я]+\d+-\d+-[А-Я]{2})`)
			groupMatches := groupRegex.FindAllStringSubmatch(classContent, -1)

			groups := []string{}
			for _, match := range groupMatches {
				if len(match) >= 2 {
					groups = append(groups, match[1])
				}
			}

			// Skip if no groups found
			if len(groups) == 0 {
				continue
			}

			// Find subgroup (e.g., 1 п.г. or 2 п.г.)
			subgroupRegex := regexp.MustCompile(`(\d+)\s+п\.г\.`)
			subgroupMatch := subgroupRegex.FindStringSubmatch(classContent)

			subgroup := "Вся группа"
			if len(subgroupMatch) >= 2 {
				subgroup = fmt.Sprintf("%s п.г.", subgroupMatch[1])
			}

			// For lectures, usually no subgroup is specified
			if classType == "лек" && len(subgroupMatch) == 0 {
				subgroup = "Поток"
			}

			// Find auditorium information
			auditoriumRegex := regexp.MustCompile(`<a href="https://vgltu.ru/map/rasp\?auditory=([^"]+)">([^<]+)</a>`)
			auditoriumMatch := auditoriumRegex.FindStringSubmatch(classContent)

			auditorium := ""
			if len(auditoriumMatch) >= 3 {
				auditorium = auditoriumMatch[2] // Use the text content of the link
			}

			// Create unique ID for this class using continuous counter
			lessonID := fmt.Sprintf("lesson_%d", itemCount)

			// Determine if this lesson already exists for all groups
			allExist := true
			for _, grp := range groups {
				groupName := grp
				if subgroup != "Вся группа" && subgroup != "Поток" {
					groupName = fmt.Sprintf("%s %s", groupName, subgroup)
				}

				var existingCount int64
				database.Model(&models.Lesson{}).
					Where("teacher_id = ? AND date = ? AND group_name = ? AND subject = ?",
						userID, dbFormatDate, groupName, subjectName).
					Count(&existingCount)
				if existingCount == 0 {
					allExist = false
				}
			}

			// Create schedule item with all groups joined
			scheduleItem := scheduleModels.ScheduleItem{
				ID:         lessonID,
				Date:       dbFormatDate,
				Time:       classTime,
				ClassType:  classTypeFull,
				Subject:    subjectName,
				Group:      strings.Join(groups, ", "),
				Groups:     groups,
				Subgroup:   subgroup,
				Auditorium: auditorium,
				InSystem:   allExist,
			}

			scheduleItems = append(scheduleItems, scheduleItem)

			itemCount++ // Increment counter for next item
		}
	}

	return result.String(), itemCount, scheduleItems
}

// fetchDirectSchedule makes a direct request to the schedule API
func fetchDirectSchedule(teacher, date string) (string, string, error) {
	var debugBuilder strings.Builder

	// URL-encode teacher name
	encodedTeacher := url.QueryEscape(teacher)

	// API URL
	apiURL := fmt.Sprintf("https://kis.vgltu.ru/schedule?teacher=%s&date=%s", encodedTeacher, date)
	debugBuilder.WriteString(fmt.Sprintf("Fetching URL: %s\n", apiURL))

	// Create HTTP client with settings
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Create request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return debugBuilder.String(), "", fmt.Errorf("error creating request: %w", err)
	}

	// Add headers
	req.Header.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
	req.Header.Add("Accept-Language", "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3")
	req.Header.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	// Execute request
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making API request: %v", err)
		return debugBuilder.String(), "", fmt.Errorf("error making API request: %w", err)
	}
	defer resp.Body.Close()

	// Log response status
	debugBuilder.WriteString(fmt.Sprintf("Response status: %s\n", resp.Status))

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response: %v", err)
		return debugBuilder.String(), "", fmt.Errorf("error reading response: %w", err)
	}

	// Convert to string
	content := string(body)
	debugBuilder.WriteString(fmt.Sprintf("\nResponse length: %d bytes\n", len(content)))

	// Check for empty response
	if content == "" {
		log.Printf("Empty response received from API")
		return debugBuilder.String(), "", fmt.Errorf("empty response received from API")
	}

	return debugBuilder.String(), content, nil
}

// TestAuth is a simple endpoint to test authentication
func (h *ScheduleHandler) TestAuth(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role for response
	userRole, _ := utils.GetUserRoleFromContext(r.Context())

	utils.RespondWithSuccess(w, http.StatusOK, "Authentication successful", map[string]interface{}{
		"userID": userID,
		"role":   userRole,
	})
}
