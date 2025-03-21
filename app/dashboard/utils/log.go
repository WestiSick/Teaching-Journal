package utils

import (
	"TeacherJournal/app/dashboard/models"
	"log"

	"gorm.io/gorm"
)

// LogAction records an action in the system log
func LogAction(db *gorm.DB, userID int, action, details string) {
	logEntry := models.Log{
		UserID:  userID,
		Action:  action,
		Details: details,
	}

	result := db.Create(&logEntry)
	if result.Error != nil {
		log.Printf("Error logging action: %v", result.Error)
	}
}
