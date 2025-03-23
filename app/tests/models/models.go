package models

import (
	dashboardModels "TeacherJournal/app/dashboard/models"
	"time"
)

// Test represents a test created by a teacher
type Test struct {
	ID              int                  `gorm:"primaryKey"`
	Title           string               `gorm:"not null"`
	Description     string               `gorm:"type:text"`
	Subject         string               `gorm:"not null"`
	CreatorID       int                  `gorm:"index"`
	Creator         dashboardModels.User `gorm:"foreignKey:CreatorID"`
	IsActive        bool                 `gorm:"default:true"`
	CreatedAt       time.Time            `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt       time.Time            `gorm:"default:CURRENT_TIMESTAMP"`
	MaxAttempts     int                  `gorm:"default:1"`
	TimePerQuestion int                  `gorm:"default:60"` // Time in seconds
	Questions       []Question
}

// Question represents a question in a test
type Question struct {
	ID           int       `gorm:"primaryKey"`
	TestID       int       `gorm:"index"`
	Test         Test      `gorm:"foreignKey:TestID"`
	QuestionText string    `gorm:"type:text;not null"`
	QuestionType string    `gorm:"default:multiple_choice"` // multiple_choice, single_choice, text
	Position     int       `gorm:"not null"`
	CreatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	Answers      []Answer
}

// Answer represents an answer option for a question
type Answer struct {
	ID         int       `gorm:"primaryKey"`
	QuestionID int       `gorm:"index"`
	Question   Question  `gorm:"foreignKey:QuestionID"`
	AnswerText string    `gorm:"type:text;not null"`
	IsCorrect  bool      `gorm:"not null"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

// StudentResponse represents a student's response to a question
type StudentResponse struct {
	ID          int      `gorm:"primaryKey"`
	AttemptID   int      `gorm:"index"`
	QuestionID  int      `gorm:"index"`
	Question    Question `gorm:"foreignKey:QuestionID"`
	AnswerID    *int     `gorm:"index"`
	Answer      *Answer  `gorm:"foreignKey:AnswerID"`
	TextAnswer  string   `gorm:"type:text"` // For text-based questions
	IsCorrect   bool
	TimeSpent   int       // Time in seconds
	SubmittedAt time.Time `gorm:"default:CURRENT_TIMESTAMP"`
}

// TestAttempt represents a student's attempt at a test
type TestAttempt struct {
	ID             int                     `gorm:"primaryKey"`
	TestID         int                     `gorm:"index"`
	Test           Test                    `gorm:"foreignKey:TestID"`
	StudentID      int                     `gorm:"index"`
	Student        dashboardModels.Student `gorm:"foreignKey:StudentID"`
	StartTime      time.Time               `gorm:"default:CURRENT_TIMESTAMP"`
	EndTime        *time.Time
	Score          int
	TotalQuestions int
	Completed      bool              `gorm:"default:false"`
	Responses      []StudentResponse `gorm:"foreignKey:AttemptID"`
}
