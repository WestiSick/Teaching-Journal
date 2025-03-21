package models

import "time"

// ScheduleItem represents information about a schedule item
type ScheduleItem struct {
	ID         string `json:"id"`         // Unique identifier for the schedule item
	Date       string `json:"date"`       // Date in YYYY-MM-DD format
	Time       string `json:"time"`       // Time of the class
	ClassType  string `json:"classType"`  // Type of class (Lecture, Practice, Laboratory)
	Subject    string `json:"subject"`    // Subject name
	Group      string `json:"group"`      // Group
	Subgroup   string `json:"subgroup"`   // Subgroup
	Auditorium string `json:"auditorium"` // Auditorium/classroom where the class is held
	InSystem   bool   `json:"inSystem"`   // Flag indicating if the item is already in the system
}

// ScheduleRequest defines the request for fetching schedule
type ScheduleRequest struct {
	Teacher string `json:"teacher"`
	Date    string `json:"date"`
	EndDate string `json:"endDate,omitempty"`
}

// AsyncFetchRequest defines the request body for async schedule fetching
type AsyncFetchRequest struct {
	Teacher   string `json:"teacher"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

// ProgressResponse defines the response for progress tracking
type ProgressResponse struct {
	JobID        string `json:"jobID"`
	Progress     int    `json:"progress"`
	Status       string `json:"status"`
	TotalPeriods int    `json:"totalPeriods"`
	Completed    int    `json:"completed"`
	ItemCount    int    `json:"itemCount"`
	Finished     bool   `json:"finished"`
}

// ScheduleResponse defines the response for schedule fetching
type ScheduleResponse struct {
	ScheduleItems []ScheduleItem `json:"scheduleItems"`
	ResponseSize  int            `json:"responseSize"`
	ItemCount     int            `json:"itemCount"`
	DebugInfo     string         `json:"debugInfo,omitempty"`
}

// AsyncJobResult represents the result of an asynchronous fetch job
type AsyncJobResult struct {
	JobID          string         `json:"jobID"`
	TeacherName    string         `json:"teacherName"`
	StartDate      string         `json:"startDate"`
	EndDate        string         `json:"endDate"`
	ScheduleItems  []ScheduleItem `json:"scheduleItems"`
	ResponseSize   int            `json:"responseSize"`
	ItemCount      int            `json:"itemCount"`
	DebugInfo      string         `json:"debugInfo,omitempty"`
	CompletionTime string         `json:"completionTime"`
	Status         string         `json:"status"` // running, completed, error
}

// AddLessonRequest defines the request for adding a lesson to the system
type AddLessonRequest struct {
	LessonID string `json:"lessonID"`
}

// AddAllLessonsRequest defines the request for adding multiple lessons
type AddAllLessonsRequest struct {
	ScheduleItems []ScheduleItem `json:"scheduleItems"`
}

// AsyncJob represents an asynchronous job for fetching schedule
type AsyncJob struct {
	ID           string
	TeacherName  string
	StartDate    string
	EndDate      string
	Progress     int
	Status       string
	TotalPeriods int
	Completed    int
	Result       AsyncJobResult
	ClientChans  map[chan ProgressResponse]bool
	Finished     bool
	LastUpdated  time.Time
}
