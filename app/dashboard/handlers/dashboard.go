package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"net/http"
	"time"

	"gorm.io/gorm"
)

// DashboardHandler handles dashboard-related requests
type DashboardHandler struct {
	DB *gorm.DB
}

// NewDashboardHandler creates a new DashboardHandler
func NewDashboardHandler(database *gorm.DB) *DashboardHandler {
	return &DashboardHandler{
		DB: database,
	}
}

// GetStats returns dashboard statistics for the current user
func (h *DashboardHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// If user is a free user, return limited stats
	if userRole == "free" {
		utils.RespondWithSuccess(w, http.StatusOK, "Dashboard stats retrieved", map[string]interface{}{
			"subscription_required": true,
		})
		return
	}

	// Determine timeframe filters
	timeframe := r.URL.Query().Get("timeframe")
	var dateFrom time.Time
	now := time.Now()
       switch timeframe {
       case "week":
               dateFrom = now.AddDate(0, 0, -7)
       case "semester":
               dateFrom = now.AddDate(0, -6, 0)
       case "year":
               // academic year starts on September 1
               if now.Month() >= time.September {
                       dateFrom = time.Date(now.Year(), time.September, 1, 0, 0, 0, 0, now.Location())
               } else {
                       dateFrom = time.Date(now.Year()-1, time.September, 1, 0, 0, 0, 0, now.Location())
               }
       case "month":
               fallthrough
       default:
               dateFrom = now.AddDate(0, -1, 0)
       }

	dateStr := dateFrom.Format("2006-01-02")

	// Get lesson statistics
	var totalLessons int64
	var totalHours int64

	lessonQuery := h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ?", userID).
		Where("date >= ?", dateStr)

	// Count total lessons
	lessonQuery.Count(&totalLessons)

	// Sum total hours
	lessonQuery.
		Select("COALESCE(SUM(hours), 0) as total_hours").
		Pluck("total_hours", &totalHours)

	// Get subject statistics
	var subjectCounts []struct {
		Subject string
		Count   int
	}

	h.DB.Model(&models.Lesson{}).
		Select("subject, COUNT(*) as count").
		Where("teacher_id = ?", userID).
		Group("subject").
		Find(&subjectCounts)

	// Convert to map
	subjects := make(map[string]int)
	for _, sc := range subjectCounts {
		subjects[sc.Subject] = sc.Count
	}

	// Get groups
	var groups []string
	h.DB.Raw(`
		SELECT DISTINCT group_name 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? 
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ?
		) AS combined_groups 
		ORDER BY group_name
	`, userID, userID).Scan(&groups)

	// Return statistics
	utils.RespondWithSuccess(w, http.StatusOK, "Dashboard stats retrieved", map[string]interface{}{
		"total_lessons": totalLessons,
		"total_hours":   totalHours,
		"subjects":      subjects,
		"groups":        groups,
		"has_lessons":   totalLessons > 0,
	})
}
