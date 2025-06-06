package db

import (
	"TeacherJournal/app/tickets/models"
	"TeacherJournal/config"
	"fmt"
	"log"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TicketDB is the global database instance for the ticket system
var TicketDB *gorm.DB

// InitTicketDB initializes the ticket system database
func InitTicketDB() *gorm.DB {
	var err error

	// Create a new GORM DB connection - using the same connection string as main app
	TicketDB, err = gorm.Open(postgres.Open(config.DBConnectionString), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database for ticket system:", err)
	}

	// Get underlying SQL DB to set connection pool settings
	sqlDB, err := TicketDB.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB for ticket system:", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)

	// Auto-migrate the schema
	err = TicketDB.AutoMigrate(
		&models.Ticket{},
		&models.TicketComment{},
		&models.TicketAttachment{},
		&models.TicketHistory{},
		&models.TicketSubscription{},
	)

	if err != nil {
		log.Fatal("Failed to auto-migrate ticket system database:", err)
	}

	log.Println("Ticket system database initialized successfully")
	return TicketDB
}

// GetTicketByID retrieves a ticket by ID
func GetTicketByID(db *gorm.DB, ticketID int) (models.Ticket, error) {
	var ticket models.Ticket
	result := db.First(&ticket, ticketID)
	return ticket, result.Error
}

// GetTicketComments retrieves all comments for a ticket
func GetTicketComments(db *gorm.DB, ticketID int, includeInternal bool) ([]models.TicketComment, error) {
	var comments []models.TicketComment

	query := db.Where("ticket_id = ?", ticketID)
	if !includeInternal {
		query = query.Where("is_internal = ?", false)
	}

	result := query.Order("created_at ASC").Find(&comments)
	return comments, result.Error
}

// GetTicketAttachments retrieves all attachments for a ticket
func GetTicketAttachments(db *gorm.DB, ticketID int) ([]models.TicketAttachment, error) {
	var attachments []models.TicketAttachment
	result := db.Where("ticket_id = ?", ticketID).Find(&attachments)
	return attachments, result.Error
}

// CreateTicket creates a new ticket
func CreateTicket(db *gorm.DB, ticket *models.Ticket) error {
	// Validate required fields
	if ticket.CreatedBy == 0 {
		return fmt.Errorf("creator ID is required when creating a ticket")
	}

	// Ensure default values are set
	if ticket.Status == "" {
		ticket.Status = "New"
	}
	if ticket.Priority == "" {
		ticket.Priority = "Medium"
	}

	// Set timestamps
	now := time.Now()
	ticket.CreatedAt = now
	ticket.UpdatedAt = now
	ticket.LastActivity = now

	// Start a transaction
	return db.Transaction(func(tx *gorm.DB) error {
		// Create the ticket
		if err := tx.Create(ticket).Error; err != nil {
			return err
		}

		// Create a subscription for the ticket creator
		subscription := models.TicketSubscription{
			TicketID:   ticket.ID,
			UserID:     ticket.CreatedBy,
			Subscribed: true,
		}

		if err := tx.Create(&subscription).Error; err != nil {
			return err
		}

		return nil
	})
}

// UpdateTicket updates an existing ticket
func UpdateTicket(db *gorm.DB, ticketID int, userID int, updates map[string]interface{}) error {
	// Get the current ticket state for history
	var ticket models.Ticket
	if err := db.First(&ticket, ticketID).Error; err != nil {
		return err
	}

	// Start a transaction for the update
	return db.Transaction(func(tx *gorm.DB) error {
		// Apply the updates
		if err := tx.Model(&models.Ticket{}).Where("id = ?", ticketID).Updates(updates).Error; err != nil {
			return err
		}

		// Record history for each changed field
		for field, newValue := range updates {
			var oldValue interface{}

			switch field {
			case "title":
				oldValue = ticket.Title
			case "description":
				oldValue = ticket.Description
			case "status":
				oldValue = ticket.Status
			case "priority":
				oldValue = ticket.Priority
			case "category":
				oldValue = ticket.Category
			case "assigned_to":
				oldValue = ticket.AssignedTo
			}

			// Record the change in history
			history := models.TicketHistory{
				TicketID:   ticketID,
				UserID:     userID,
				FieldName:  field,
				OldValue:   toString(oldValue),
				NewValue:   toString(newValue),
				ChangeTime: time.Now(),
			}

			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}

		// Update the ticket's UpdatedAt timestamp
		updates["updated_at"] = time.Now()
		updates["last_activity"] = time.Now()

		return nil
	})
}

// AddTicketComment adds a comment to a ticket
func AddTicketComment(db *gorm.DB, comment *models.TicketComment) error {
	// Set creation time
	comment.CreatedAt = time.Now()

	// Create the comment
	if err := db.Create(comment).Error; err != nil {
		return err
	}

	// Update ticket last activity
	db.Model(&models.Ticket{}).
		Where("id = ?", comment.TicketID).
		Updates(map[string]interface{}{
			"last_activity": time.Now(),
			"updated_at":    time.Now(),
		})

	return nil
}

// GetUserTickets retrieves tickets created by or assigned to a user
func GetUserTickets(db *gorm.DB, userID int, status string, role string, sortBy string) ([]models.Ticket, error) {
	var tickets []models.Ticket
	query := db.Model(&models.Ticket{})

	// For regular users, only show their own tickets
	if role != "admin" {
		query = query.Where("creator_id = ?", userID)
	} else {
		// For admins, show all tickets or tickets assigned to them
		if status == "assigned" {
			query = query.Where("assigned_to = ?", userID)
		}
	}

	// Filter by status if specified
	if status != "" && status != "all" && status != "assigned" {
		query = query.Where("status = ?", status)
	}

	// Apply sorting based on the sortBy parameter
	switch sortBy {
	case "status_asc":
		query = query.Order("status ASC")
	case "status_desc":
		query = query.Order("status DESC")
	case "priority_asc":
		query = query.Order("priority ASC")
	case "priority_desc":
		query = query.Order("priority DESC")
	case "created_asc":
		query = query.Order("created_at ASC")
	case "created_desc":
		query = query.Order("created_at DESC")
	default:
		// Default sorting by last activity, most recent first
		query = query.Order("last_activity DESC")
	}

	// Execute the query
	result := query.Find(&tickets)
	return tickets, result.Error
}

// GetTicketHistory retrieves the history of changes for a ticket
func GetTicketHistory(db *gorm.DB, ticketID int) ([]models.TicketHistory, error) {
	var history []models.TicketHistory
	result := db.Where("ticket_id = ?", ticketID).Order("change_time DESC").Find(&history)
	return history, result.Error
}

// SubscribeToTicket subscribes a user to ticket updates
func SubscribeToTicket(db *gorm.DB, ticketID int, userID int, subscribed bool) error {
	var subscription models.TicketSubscription

	// Check if subscription already exists
	result := db.Where("ticket_id = ? AND user_id = ?", ticketID, userID).First(&subscription)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new subscription
		subscription = models.TicketSubscription{
			TicketID:   ticketID,
			UserID:     userID,
			Subscribed: subscribed,
		}
		return db.Create(&subscription).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing subscription
	return db.Model(&subscription).Update("subscribed", subscribed).Error
}

// DeleteTicket marks a ticket as deleted
func DeleteTicket(db *gorm.DB, ticketID int) error {
	// In a real-world application, consider soft deletes instead of hard deletes
	return db.Delete(&models.Ticket{}, ticketID).Error
}

// Helper function to convert any value to string
func toString(value interface{}) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case *int:
		if v == nil {
			return ""
		}
		return strconv.Itoa(*v)
	case time.Time:
		return v.Format(time.RFC3339)
	default:
		return fmt.Sprintf("%v", v)
	}
}
