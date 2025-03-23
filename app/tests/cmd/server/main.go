package main

import (
	"TeacherJournal/app/tests/db"
	"TeacherJournal/app/tests/handlers"
	"TeacherJournal/app/tests/middleware"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize database
	database := db.InitDB()

	// Get underlying SQL DB for defer Close
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB for closing:", err)
	}
	defer sqlDB.Close()

	// Create router
	router := mux.NewRouter()

	// API subrouter with /api/tests prefix
	apiRouter := router.PathPrefix("/api/tests").Subrouter()

	// Create handlers
	studentHandler := handlers.NewStudentHandler(database)
	adminHandler := handlers.NewAdminHandler(database)
	testHandler := handlers.NewTestHandler(database)

	// Student registration and authentication routes
	apiRouter.HandleFunc("/students/register", studentHandler.RegisterStudent).Methods("POST")
	apiRouter.HandleFunc("/students/login", studentHandler.LoginStudent).Methods("POST")
	apiRouter.HandleFunc("/students/info", studentHandler.GetStudentInfoByID).Methods("GET")

	// Admin routes (require JWT auth and admin/teacher role)
	apiRouter.HandleFunc("/admin/tests", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.CreateTest))).Methods("POST")
	apiRouter.HandleFunc("/admin/tests", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.GetAllTests))).Methods("GET")
	apiRouter.HandleFunc("/admin/tests/{id}", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.GetTestDetails))).Methods("GET")
	apiRouter.HandleFunc("/admin/tests/{id}", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.UpdateTest))).Methods("PUT")
	apiRouter.HandleFunc("/admin/tests/{id}", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.DeleteTest))).Methods("DELETE")
	apiRouter.HandleFunc("/admin/tests/{id}/questions", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.AddQuestion))).Methods("POST")
	apiRouter.HandleFunc("/admin/tests/{test_id}/questions/{question_id}", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.UpdateQuestion))).Methods("PUT")
	apiRouter.HandleFunc("/admin/tests/{test_id}/questions/{question_id}", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.DeleteQuestion))).Methods("DELETE")
	apiRouter.HandleFunc("/admin/tests/{id}/statistics", middleware.JWTMiddleware(middleware.TeacherMiddleware(adminHandler.GetTestStatistics))).Methods("GET")

	// Student test-taking routes
	apiRouter.HandleFunc("/available", testHandler.GetAvailableTests).Methods("GET")
	apiRouter.HandleFunc("/start/{id}", testHandler.StartTest).Methods("POST")
	apiRouter.HandleFunc("/attempt/{attempt_id}/next", testHandler.GetNextQuestion).Methods("GET")
	apiRouter.HandleFunc("/attempt/{attempt_id}/submit", testHandler.SubmitAnswer).Methods("POST")
	apiRouter.HandleFunc("/attempt/{attempt_id}/results", testHandler.GetTestResults).Methods("GET")
	apiRouter.HandleFunc("/history", testHandler.GetStudentTestHistory).Methods("GET")

	// CORS setup to allow requests from any origin
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"*"}, // Allow all headers
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":8092", // Using a different port than the main app
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Tests API server started on :8092")
	log.Fatal(server.ListenAndServe())
}
