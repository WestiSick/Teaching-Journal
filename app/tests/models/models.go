package models

import (
	dashboardModels "TeacherJournal/app/dashboard/models"
	"time"
)

// Test represents a test created by a teacher
type Test struct {
	ID              int                  `gorm:"primaryKey" json:"id"`
	Title           string               `gorm:"not null" json:"title"`
	Description     string               `gorm:"type:text" json:"description"`
	Subject         string               `gorm:"not null" json:"subject"`
	CreatorID       int                  `gorm:"index" json:"creator_id"`
	Creator         dashboardModels.User `gorm:"foreignKey:CreatorID" json:"-"`
	IsActive        bool                 `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time            `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt       time.Time            `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
	MaxAttempts     int                  `gorm:"default:1" json:"max_attempts"`
	TimePerQuestion int                  `gorm:"default:60" json:"time_per_question"` // Time in seconds
	Questions       []Question           `json:"questions,omitempty"`
	TestGroups      []TestGroup          `gorm:"foreignKey:TestID" json:"test_groups,omitempty"` // Добавленное поле
}

// TestGroup представляет связь между тестом и группой студентов
type TestGroup struct {
	ID        int       `gorm:"primaryKey" json:"id"`
	TestID    int       `gorm:"index" json:"test_id"`
	Test      Test      `gorm:"foreignKey:TestID" json:"-"`
	GroupName string    `gorm:"not null" json:"group_name"`
	CreatedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
}

// Question represents a question in a test
type Question struct {
	ID           int       `gorm:"primaryKey" json:"id"`
	TestID       int       `gorm:"index" json:"-"`
	Test         Test      `gorm:"foreignKey:TestID" json:"-"`
	QuestionText string    `gorm:"type:text;not null" json:"question_text"`
	QuestionType string    `gorm:"default:multiple_choice" json:"question_type"` // multiple_choice, single_choice, text
	Position     int       `gorm:"not null" json:"position"`
	CreatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at"`
	Answers      []Answer  `json:"answers,omitempty"`
}

// Answer represents an answer option for a question
type Answer struct {
	ID         int       `gorm:"primaryKey" json:"id"`
	QuestionID int       `gorm:"index" json:"question_id"`
	Question   Question  `gorm:"foreignKey:QuestionID" json:"-"`
	AnswerText string    `gorm:"type:text;not null" json:"answer_text"`
	IsCorrect  bool      `gorm:"not null" json:"is_correct,omitempty"`
	CreatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"created_at,omitempty"`
	UpdatedAt  time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"updated_at,omitempty"`
}

// StudentResponse represents a student's response to a question
type StudentResponse struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	AttemptID   int       `gorm:"index" json:"attempt_id"`
	QuestionID  int       `gorm:"index" json:"question_id"`
	Question    Question  `gorm:"foreignKey:QuestionID" json:"-"`
	AnswerID    *int      `gorm:"index" json:"answer_id"`
	Answer      *Answer   `gorm:"foreignKey:AnswerID" json:"-"`
	TextAnswer  string    `gorm:"type:text" json:"text_answer"` // For text-based questions
	IsCorrect   bool      `json:"is_correct"`
	TimeSpent   int       `json:"time_spent"` // Time in seconds
	SubmittedAt time.Time `gorm:"default:CURRENT_TIMESTAMP" json:"submitted_at"`
}

// TestAttempt represents a student's attempt at a test
type TestAttempt struct {
	ID             int                     `gorm:"primaryKey" json:"id"`
	TestID         int                     `gorm:"index" json:"test_id"`
	Test           Test                    `gorm:"foreignKey:TestID" json:"-"`
	StudentID      int                     `gorm:"index" json:"student_id"`
	Student        dashboardModels.Student `gorm:"foreignKey:StudentID" json:"-"`
	StartTime      time.Time               `gorm:"default:CURRENT_TIMESTAMP" json:"start_time"`
	EndTime        *time.Time              `json:"end_time"`
	Score          int                     `json:"score"`
	TotalQuestions int                     `json:"total_questions"`
	Completed      bool                    `gorm:"default:false" json:"completed"`
	Responses      []StudentResponse       `gorm:"foreignKey:AttemptID" json:"-"`
}
