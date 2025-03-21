package utils

import (
	"TeacherJournal/app/tickets/models"
	"log"
	"time"

	"gorm.io/gorm"
)

// LogAction records an action in the system log
func LogAction(db *gorm.DB, userID int, action, details string) {
	logEntry := models.TicketHistory{
		UserID:     userID,
		FieldName:  action,
		NewValue:   details,
		ChangeTime: time.Now(),
	}

	result := db.Create(&logEntry)
	if result.Error != nil {
		log.Printf("Error logging action: %v", result.Error)
	}
}

// LogTicketAction logs actions specific to tickets
func LogTicketAction(db *gorm.DB, ticketID int, userID int, action, details string) {
	// Update ticket last activity time
	db.Model(&models.Ticket{}).
		Where("id = ?", ticketID).
		Update("last_activity", time.Now())

	// Log the action
	logEntry := models.TicketHistory{
		TicketID:   ticketID,
		UserID:     userID,
		FieldName:  action,
		NewValue:   details,
		ChangeTime: time.Now(),
	}

	result := db.Create(&logEntry)
	if result.Error != nil {
		log.Printf("Error logging ticket action: %v", result.Error)
	}
}
