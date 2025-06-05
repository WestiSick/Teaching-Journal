package models

import (
	"time"

	"github.com/lib/pq"
)

// User represents a user in the system
type User struct {
	ID       int    `gorm:"primaryKey"`
	FIO      string `gorm:"not null"`
	Login    string `gorm:"uniqueIndex;not null"`
	Password string `gorm:"not null"`
	Role     string `gorm:"not null"`
}

// Lesson represents a teaching lesson
type Lesson struct {
	ID         int            `gorm:"primaryKey"`
	TeacherID  int            `gorm:"index"`
	Teacher    User           `gorm:"foreignKey:TeacherID"`
	GroupName  string         `gorm:"not null"`
	Groups     pq.StringArray `gorm:"type:text[]" json:"groups"`
	Subject    string         `gorm:"not null"`
	Topic      string         `gorm:"not null"`
	Hours      int            `gorm:"not null"`
	Date       string         `gorm:"not null"`
	Type       string         `gorm:"not null;default:Лекция"`
	Auditorium string         `gorm:""`
}

// Student represents a student in a group
type Student struct {
	ID         int    `gorm:"primaryKey"`
	TeacherID  int    `gorm:"index"`
	Teacher    User   `gorm:"foreignKey:TeacherID"`
	GroupName  string `gorm:"not null;index"`
	StudentFIO string `gorm:"not null"`
}

// Attendance represents attendance record for a student
type Attendance struct {
	ID        int     `gorm:"primaryKey"`
	LessonID  int     `gorm:"index"`
	Lesson    Lesson  `gorm:"foreignKey:LessonID"`
	StudentID int     `gorm:"index"`
	Student   Student `gorm:"foreignKey:StudentID"`
	Attended  int     `gorm:"not null;default:0"`
}

// TableName overrides the table name to "attendances"
func (Attendance) TableName() string {
	return "attendances"
}

// Log represents a system log entry
type Log struct {
	ID        int       `gorm:"primaryKey"`
	UserID    int       `gorm:"index"`
	User      User      `gorm:"foreignKey:UserID"`
	Action    string    `gorm:"not null"`
	Details   string    `gorm:"not null"`
	Timestamp time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

// LabSettings represents settings for laboratory works
type LabSettings struct {
	ID        int    `gorm:"primaryKey"`
	TeacherID int    `gorm:"index"`
	Teacher   User   `gorm:"foreignKey:TeacherID"`
	GroupName string `gorm:"not null"`
	Subject   string `gorm:"not null"`
	TotalLabs int    `gorm:"not null;default:5"`
}

// LabGrade represents a grade for a lab work
type LabGrade struct {
	ID        int     `gorm:"primaryKey"`
	StudentID int     `gorm:"index"`
	Student   Student `gorm:"foreignKey:StudentID"`
	TeacherID int     `gorm:"index"`
	Teacher   User    `gorm:"foreignKey:TeacherID"`
	Subject   string  `gorm:"not null"`
	LabNumber int     `gorm:"not null"`
	Grade     int     `gorm:"not null"`
}

// UserNotificationSettings represents notification preferences for a user
type UserNotificationSettings struct {
	UserID              int  `gorm:"primaryKey"`
	User                User `gorm:"foreignKey:UserID"`
	NotifyNewTicket     bool `gorm:"not null;default:true"`
	NotifyTicketUpdate  bool `gorm:"not null;default:true"`
	NotifyTicketComment bool `gorm:"not null;default:true"`
	NotifyTicketStatus  bool `gorm:"not null;default:true"`
}

// SharedLabLink represents a shareable link for lab grades
type SharedLabLink struct {
	ID          int       `gorm:"primaryKey"`
	Token       string    `gorm:"uniqueIndex;not null"`
	TeacherID   int       `gorm:"index;not null"`
	Teacher     User      `gorm:"foreignKey:TeacherID"`
	GroupName   string    `gorm:"not null"`
	Subject     string    `gorm:"not null"`
	CreatedAt   time.Time `gorm:"not null"`
	ExpiresAt   *time.Time
	AccessCount int `gorm:"not null;default:0"`
}
