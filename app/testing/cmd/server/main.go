package main

import (
	"TeacherJournal/app/testing/handlers"
	"TeacherJournal/app/testing/middleware"
	"TeacherJournal/app/testing/models"
	"TeacherJournal/config"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Initialize the database
	db, err := gorm.Open(postgres.Open(config.DBConnectionString), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Get underlying SQL DB to set connection pool settings
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB:", err)
	}
	defer sqlDB.Close()

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	// Auto-migrate the schema (add testing tables)
	err = db.AutoMigrate(
		&models.Test{},
		&models.TestGroupAccess{},
		&models.Question{},
		&models.Answer{},
		&models.StudentInfo{},
		&models.TestAttempt{},
		&models.StudentAnswer{},
	)
	if err != nil {
		log.Fatal("Failed to auto-migrate database:", err)
	}

	log.Println("Testing service database initialized successfully")

	// Create router
	router := mux.NewRouter()

	// API subrouter with /api/testing prefix
	apiRouter := router.PathPrefix("/api/testing").Subrouter()

	// Initialize handlers
	testHandler := handlers.NewTestHandler(db)
	studentHandler := handlers.NewStudentHandler(db)
	attemptHandler := handlers.NewAttemptHandler(db)

	// Admin JWT middleware applies to admin routes only
	adminJWTMiddleware := middleware.ChainMiddleware(
		middleware.JWTMiddleware,
		middleware.AdminOrTeacherMiddleware,
	)

	// Student JWT middleware applies to student routes
	studentJWTMiddleware := middleware.ChainMiddleware(
		middleware.JWTMiddleware,
		middleware.StudentMiddleware,
	)

	// Public routes
	apiRouter.HandleFunc("/students/register", studentHandler.Register).Methods("POST")
	apiRouter.HandleFunc("/students/login", studentHandler.Login).Methods("POST")

	// Admin routes for test management
	apiRouter.HandleFunc("/tests", adminJWTMiddleware(testHandler.CreateTest)).Methods("POST")
	apiRouter.HandleFunc("/tests", adminJWTMiddleware(testHandler.GetTests)).Methods("GET")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}", adminJWTMiddleware(testHandler.GetTest)).Methods("GET")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}", adminJWTMiddleware(testHandler.UpdateTest)).Methods("PUT")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}", adminJWTMiddleware(testHandler.DeleteTest)).Methods("DELETE")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/activate", adminJWTMiddleware(testHandler.ToggleTestActive)).Methods("PUT")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/questions", adminJWTMiddleware(testHandler.AddQuestion)).Methods("POST")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/questions/{qid:[0-9]+}", adminJWTMiddleware(testHandler.UpdateQuestion)).Methods("PUT")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/questions/{qid:[0-9]+}", adminJWTMiddleware(testHandler.DeleteQuestion)).Methods("DELETE")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/statistics", adminJWTMiddleware(testHandler.GetTestStatistics)).Methods("GET")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/attempts", adminJWTMiddleware(testHandler.GetTestAttempts)).Methods("GET")
	apiRouter.HandleFunc("/tests/{id:[0-9]+}/groups", adminJWTMiddleware(testHandler.ManageTestGroups)).Methods("POST")

	// Student routes for taking tests
	apiRouter.HandleFunc("/student/tests", studentJWTMiddleware(studentHandler.GetAvailableTests)).Methods("GET")
	apiRouter.HandleFunc("/student/attempts", studentJWTMiddleware(studentHandler.GetAttemptHistory)).Methods("GET")
	apiRouter.HandleFunc("/student/tests/{id:[0-9]+}/start", studentJWTMiddleware(attemptHandler.StartTest)).Methods("POST")
	apiRouter.HandleFunc("/student/attempts/{id:[0-9]+}/questions/current", studentJWTMiddleware(attemptHandler.GetCurrentQuestion)).Methods("GET")
	apiRouter.HandleFunc("/student/attempts/{id:[0-9]+}/questions/{qid:[0-9]+}/answer", studentJWTMiddleware(attemptHandler.SubmitAnswer)).Methods("POST")
	apiRouter.HandleFunc("/student/attempts/{id:[0-9]+}/finish", studentJWTMiddleware(attemptHandler.FinishTest)).Methods("POST")
	apiRouter.HandleFunc("/student/attempts/{id:[0-9]+}/result", studentJWTMiddleware(attemptHandler.GetTestResult)).Methods("GET")

	// CORS setup
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":8095", // Different port from other services
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Testing service API server started on :8095")
	log.Fatal(server.ListenAndServe())
}
