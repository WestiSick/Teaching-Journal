package main

import (
	"TeacherJournal/app/dashboard/db"
	"TeacherJournal/app/schedule/handlers"
	"TeacherJournal/app/schedule/middleware"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize the database
	database := db.InitDB()

	// Get the underlying sql.DB for defer Close
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB for closing:", err)
	}
	defer sqlDB.Close()

	// Create router
	router := mux.NewRouter()

	// Schedule API subrouter with /api/schedule prefix
	scheduleRouter := router.PathPrefix("/api/schedule").Subrouter()

	scheduleRouter.Use(middleware.JWTMiddleware)

	// Initialize schedule handler
	scheduleHandler := handlers.NewScheduleHandler(database)

	// Schedule routes
	scheduleRouter.HandleFunc("", scheduleHandler.GetSchedule).Methods("GET")
	scheduleRouter.HandleFunc("/async", scheduleHandler.StartAsyncFetch).Methods("POST")
	scheduleRouter.HandleFunc("/progress/{jobID}", scheduleHandler.GetProgress).Methods("GET")
	scheduleRouter.HandleFunc("/results/{jobID}", scheduleHandler.GetResults).Methods("GET")
	scheduleRouter.HandleFunc("/lesson", scheduleHandler.AddLesson).Methods("POST")
	scheduleRouter.HandleFunc("/lessons", scheduleHandler.AddAllLessons).Methods("POST")

	// CORS setup for React frontend
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"*"}, // Allow all headers
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":8091",
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Schedule API server started on :8091")
	log.Fatal(server.ListenAndServe())
}
