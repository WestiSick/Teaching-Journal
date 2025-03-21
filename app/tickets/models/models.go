package models

import (
	"time"
)

// Ticket represents a support ticket in the system
type Ticket struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	Title        string    `gorm:"not null;type:varchar(255)" json:"title"`
	Description  string    `gorm:"not null;type:text" json:"description"`
	Status       string    `gorm:"not null;default:'New';type:varchar(50)" json:"status"`      // New, Open, InProgress, Resolved, Closed
	Priority     string    `gorm:"not null;default:'Medium';type:varchar(50)" json:"priority"` // Low, Medium, High, Critical
	Category     string    `gorm:"not null;type:varchar(100)" json:"category"`                 // Technical, Administrative, Account, Feature, Bug, Other
	CreatedBy    int       `gorm:"column:creator_id;not null" json:"created_by"`               // UserID from main app
	AssignedTo   *int      `gorm:"column:assigned_to" json:"assigned_to,omitempty"`            // UserID from main app, can be null
	CreatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	LastActivity time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"last_activity"`
}

// TicketComment represents a comment on a ticket
type TicketComment struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	TicketID   int       `gorm:"not null" json:"ticket_id"`
	Ticket     Ticket    `gorm:"foreignKey:TicketID" json:"-"`
	UserID     int       `gorm:"not null" json:"user_id"` // UserID from main app
	Content    string    `gorm:"type:text;not null" json:"content"`
	CreatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	IsInternal bool      `gorm:"not null;default:false" json:"is_internal"` // For internal notes visible only to staff
}

// TicketAttachment represents a file attached to a ticket
type TicketAttachment struct {
	ID          int           `gorm:"primaryKey" json:"id"`
	TicketID    int           `gorm:"not null" json:"ticket_id"`
	Ticket      Ticket        `gorm:"foreignKey:TicketID" json:"-"`
	CommentID   *int          `gorm:"default:null" json:"comment_id,omitempty"` // Can be attached to a comment or directly to a ticket
	Comment     TicketComment `gorm:"foreignKey:CommentID" json:"-"`
	FileName    string        `gorm:"not null" json:"file_name"`
	FilePath    string        `gorm:"not null" json:"file_path"` // Server path where file is stored
	FileSize    int64         `gorm:"not null" json:"file_size"`
	ContentType string        `gorm:"not null" json:"content_type"`
	UploadedBy  int           `gorm:"not null" json:"uploaded_by"` // UserID from main app
	UploadedAt  time.Time     `gorm:"not null;default:CURRENT_TIMESTAMP" json:"uploaded_at"`
}

// TicketHistory records all changes to a ticket
type TicketHistory struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	TicketID   int       `gorm:"not null" json:"ticket_id"`
	Ticket     Ticket    `gorm:"foreignKey:TicketID" json:"-"`
	UserID     int       `gorm:"not null" json:"user_id"`    // UserID who made the change
	FieldName  string    `gorm:"not null" json:"field_name"` // Which field was changed
	OldValue   string    `gorm:"type:text" json:"old_value"`
	NewValue   string    `gorm:"type:text" json:"new_value"`
	ChangeTime time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"change_time"`
}

// TicketSubscription allows users to subscribe to ticket updates
type TicketSubscription struct {
	ID         int    `gorm:"primaryKey" json:"id"`
	TicketID   int    `gorm:"not null" json:"ticket_id"`
	Ticket     Ticket `gorm:"foreignKey:TicketID" json:"-"`
	UserID     int    `gorm:"not null" json:"user_id"` // UserID from main app
	Subscribed bool   `gorm:"not null;default:true" json:"subscribed"`
}

// UserInfo contains basic user information
type UserInfo struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// TicketStats contains ticket statistics
type TicketStats struct {
	Total          int64 `json:"total"`
	New            int64 `json:"new"`
	Open           int64 `json:"open"`
	InProgress     int64 `json:"in_progress"`
	Resolved       int64 `json:"resolved"`
	Closed         int64 `json:"closed"`
	AssignedToUser int64 `json:"assigned_to_user"`
	CreatedByUser  int64 `json:"created_by_user"`
}
