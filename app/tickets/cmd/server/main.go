// app/tickets/cmd/server/main.go
package main

import (
	"TeacherJournal/app/tickets/auth"
	"TeacherJournal/app/tickets/db"
	"TeacherJournal/app/tickets/handlers"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize the database
	database := db.InitTicketDB()

	// Get the underlying sql.DB for defer Close
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB for closing:", err)
	}
	defer sqlDB.Close()

	// Create router
	router := mux.NewRouter()

	// API subrouter with /api prefix
	apiRouter := router.PathPrefix("/api").Subrouter()

	// Initialize ticket handler
	ticketHandler := handlers.NewTicketHandler(database)

	// Routes without ID parameter - MUST come before routes with parameters
	apiRouter.HandleFunc("/tickets", auth.JWTMiddleware(ticketHandler.GetTickets)).Methods("GET")
	apiRouter.HandleFunc("/tickets", auth.JWTMiddleware(ticketHandler.CreateTicket)).Methods("POST")

	// Stats route - MUST come before routes with ID parameter
	apiRouter.HandleFunc("/tickets/stats", auth.JWTMiddleware(ticketHandler.GetTicketStats)).Methods("GET")

	// Attachment download route
	apiRouter.HandleFunc("/tickets/attachments/{id}", auth.JWTMiddleware(ticketHandler.DownloadAttachment)).Methods("GET")

	// Routes with ID parameter
	apiRouter.HandleFunc("/tickets/{id}", auth.JWTMiddleware(ticketHandler.GetTicket)).Methods("GET")
	apiRouter.HandleFunc("/tickets/{id}", auth.JWTMiddleware(ticketHandler.UpdateTicket)).Methods("PUT")
	apiRouter.HandleFunc("/tickets/{id}", auth.JWTMiddleware(ticketHandler.DeleteTicket)).Methods("DELETE")

	// Comment routes
	apiRouter.HandleFunc("/tickets/{id}/comments", auth.JWTMiddleware(ticketHandler.GetComments)).Methods("GET")
	apiRouter.HandleFunc("/tickets/{id}/comments", auth.JWTMiddleware(ticketHandler.AddComment)).Methods("POST")

	// Attachment routes
	apiRouter.HandleFunc("/tickets/{id}/attachments", auth.JWTMiddleware(ticketHandler.GetAttachments)).Methods("GET")
	apiRouter.HandleFunc("/tickets/{id}/attachments", auth.JWTMiddleware(ticketHandler.AddAttachment)).Methods("POST")

	// CORS setup for React frontend
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"80.87.200.2"}, // Allow all origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"*"}, // Allow all headers
		AllowCredentials: true,
		MaxAge:           86400, // 24 hours
	})

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":8090",
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("Ticket API server started on :8090")
	log.Fatal(server.ListenAndServe())
}
