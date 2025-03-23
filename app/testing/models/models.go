package models

import (
	"time"
)

// Test represents a test created by a teacher
type Test struct {
	ID              int       `gorm:"primaryKey"`
	TeacherID       int       `gorm:"index;not null"`
	Title           string    `gorm:"not null"`
	Subject         string    `gorm:"not null"`
	Description     string    `gorm:"type:text"`
	Active          bool      `gorm:"not null;default:true"`
	MaxAttempts     int       `gorm:"not null;default:1"`
	TimePerQuestion int       `gorm:"not null;default:60"` // Time in seconds
	CreatedAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt       time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	Questions       []Question
	GroupsAllowed   []TestGroupAccess `gorm:"foreignKey:TestID"`
}

// TestGroupAccess represents which groups have access to a test
type TestGroupAccess struct {
	ID        int    `gorm:"primaryKey"`
	TestID    int    `gorm:"index;not null"`
	GroupName string `gorm:"not null"`
}

// Question represents a question in a test
type Question struct {
	ID            int       `gorm:"primaryKey"`
	TestID        int       `gorm:"index;not null"`
	QuestionText  string    `gorm:"type:text;not null"`
	QuestionOrder int       `gorm:"not null"`
	CreatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	Answers       []Answer
}

// Answer represents a possible answer to a question
type Answer struct {
	ID         int       `gorm:"primaryKey"`
	QuestionID int       `gorm:"index;not null"`
	AnswerText string    `gorm:"type:text;not null"`
	IsCorrect  bool      `gorm:"not null;default:false"`
	CreatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
	UpdatedAt  time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}

// StudentInfo represents additional student information
type StudentInfo struct {
	ID        int    `gorm:"primaryKey"`
	StudentID int    `gorm:"index;uniqueIndex;not null"` // References Student.ID from dashboard model
	Email     string `gorm:"uniqueIndex;not null"`
	Password  string `gorm:"not null"` // Hashed password
}

// TestAttempt represents a student's attempt at a test
type TestAttempt struct {
	ID             int       `gorm:"primaryKey"`
	TestID         int       `gorm:"index;not null"`
	StudentID      int       `gorm:"index;not null"`
	StartedAt      time.Time `gorm:"not null"`
	FinishedAt     *time.Time
	TotalTime      int     `gorm:"default:0"` // Time in seconds
	Score          float64 `gorm:"default:0"` // Percentage score
	CorrectAnswers int     `gorm:"default:0"`
	TotalQuestions int     `gorm:"default:0"`
	Completed      bool    `gorm:"default:false"`
	StudentAnswers []StudentAnswer
}

// StudentAnswer represents a student's answer to a question
type StudentAnswer struct {
	ID            int       `gorm:"primaryKey"`
	TestAttemptID int       `gorm:"index;not null"`
	QuestionID    int       `gorm:"index;not null"`
	AnswerID      *int      `gorm:"index"`     // Can be null if student didn't answer
	TimeSpent     int       `gorm:"default:0"` // Time in seconds
	IsCorrect     bool      `gorm:"default:false"`
	AnsweredAt    time.Time `gorm:"not null;default:CURRENT_TIMESTAMP"`
}
