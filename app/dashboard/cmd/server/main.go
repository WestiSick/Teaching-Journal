package main

import (
	"TeacherJournal/app/dashboard/auth"
	"TeacherJournal/app/dashboard/db"
	"TeacherJournal/app/dashboard/handlers"
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

	// API subrouter with /api prefix
	apiRouter := router.PathPrefix("/api").Subrouter()

	// Auth routes
	authHandler := handlers.NewAuthHandler(database)
	apiRouter.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	apiRouter.HandleFunc("/auth/login", authHandler.Login).Methods("POST")
	apiRouter.HandleFunc("/auth/refresh", authHandler.RefreshToken).Methods("POST")

	// User routes
	userHandler := handlers.NewUserHandler(database)
	apiRouter.HandleFunc("/users/me", auth.JWTMiddleware(userHandler.GetCurrentUser)).Methods("GET")
	apiRouter.HandleFunc("/users/me", auth.JWTMiddleware(userHandler.UpdateCurrentUser)).Methods("PUT")

	// Dashboard routes
	dashboardHandler := handlers.NewDashboardHandler(database)
	apiRouter.HandleFunc("/dashboard/stats", auth.JWTMiddleware(dashboardHandler.GetStats)).Methods("GET")

	// Lesson routes
	lessonHandler := handlers.NewLessonHandler(database)
	apiRouter.HandleFunc("/lessons", auth.JWTMiddleware(lessonHandler.GetLessons)).Methods("GET")
	apiRouter.HandleFunc("/lessons/{id}", auth.JWTMiddleware(lessonHandler.GetLesson)).Methods("GET")
	apiRouter.HandleFunc("/lessons", auth.JWTMiddleware(auth.SubscriberMiddleware(lessonHandler.CreateLesson))).Methods("POST")
	apiRouter.HandleFunc("/lessons/{id}", auth.JWTMiddleware(auth.SubscriberMiddleware(lessonHandler.UpdateLesson))).Methods("PUT")
	apiRouter.HandleFunc("/lessons/{id}", auth.JWTMiddleware(auth.SubscriberMiddleware(lessonHandler.DeleteLesson))).Methods("DELETE")
	apiRouter.HandleFunc("/subjects", auth.JWTMiddleware(lessonHandler.GetSubjects)).Methods("GET")
	apiRouter.HandleFunc("/subjects/{subject}/lessons", auth.JWTMiddleware(lessonHandler.GetLessonsBySubject)).Methods("GET")
	apiRouter.HandleFunc("/export/lessons", auth.JWTMiddleware(auth.SubscriberMiddleware(lessonHandler.ExportLessons))).Methods("GET")
	apiRouter.HandleFunc("/export/workload-journal", auth.JWTMiddleware(auth.SubscriberMiddleware(lessonHandler.ExportWorkloadJournal))).Methods("GET")

	// Group routes
	groupHandler := handlers.NewGroupHandler(database)
	apiRouter.HandleFunc("/groups", auth.JWTMiddleware(groupHandler.GetGroups)).Methods("GET")
	apiRouter.HandleFunc("/groups/{name}", auth.JWTMiddleware(groupHandler.GetGroup)).Methods("GET")
	apiRouter.HandleFunc("/groups", auth.JWTMiddleware(auth.SubscriberMiddleware(groupHandler.CreateGroup))).Methods("POST")
	apiRouter.HandleFunc("/groups/{name}", auth.JWTMiddleware(auth.SubscriberMiddleware(groupHandler.UpdateGroup))).Methods("PUT")
	apiRouter.HandleFunc("/groups/{name}", auth.JWTMiddleware(auth.SubscriberMiddleware(groupHandler.DeleteGroup))).Methods("DELETE")
	apiRouter.HandleFunc("/groups/{name}/students", auth.JWTMiddleware(groupHandler.GetStudentsInGroup)).Methods("GET")

	// Student routes
	studentHandler := handlers.NewStudentHandler(database)
	apiRouter.HandleFunc("/students", auth.JWTMiddleware(studentHandler.GetStudents)).Methods("GET")
	apiRouter.HandleFunc("/students/{id}", auth.JWTMiddleware(studentHandler.GetStudent)).Methods("GET")
	apiRouter.HandleFunc("/students", auth.JWTMiddleware(auth.SubscriberMiddleware(studentHandler.CreateStudent))).Methods("POST")
	apiRouter.HandleFunc("/students/{id}", auth.JWTMiddleware(auth.SubscriberMiddleware(studentHandler.UpdateStudent))).Methods("PUT")
	apiRouter.HandleFunc("/students/{id}", auth.JWTMiddleware(auth.SubscriberMiddleware(studentHandler.DeleteStudent))).Methods("DELETE")

	// Attendance routes
	attendanceHandler := handlers.NewAttendanceHandler(database)
	apiRouter.HandleFunc("/attendance", auth.JWTMiddleware(attendanceHandler.GetAttendance)).Methods("GET")
	apiRouter.HandleFunc("/attendance/export", auth.JWTMiddleware(auth.SubscriberMiddleware(attendanceHandler.ExportAttendance))).Methods("GET")
	apiRouter.HandleFunc("/attendance/{lessonId}", auth.JWTMiddleware(attendanceHandler.GetLessonAttendance)).Methods("GET")
	apiRouter.HandleFunc("/attendance/{lessonId}", auth.JWTMiddleware(auth.SubscriberMiddleware(attendanceHandler.SaveAttendance))).Methods("POST")
	apiRouter.HandleFunc("/attendance/{lessonId}", auth.JWTMiddleware(auth.SubscriberMiddleware(attendanceHandler.DeleteAttendance))).Methods("DELETE")

	// Lab routes
	labHandler := handlers.NewLabHandler(database)
	apiRouter.HandleFunc("/labs", auth.JWTMiddleware(labHandler.GetAllLabs)).Methods("GET")

	// IMPORTANT: Fixed route order - specific routes first
	// Public access to shared lab grades
	apiRouter.HandleFunc("/labs/shared/{token}", labHandler.GetSharedLabGrades).Methods("GET")

	// Other specific lab routes
	apiRouter.HandleFunc("/labs/links", auth.JWTMiddleware(labHandler.GetSharedLinks)).Methods("GET")
	apiRouter.HandleFunc("/labs/links/{token}", auth.JWTMiddleware(labHandler.DeleteSharedLink)).Methods("DELETE")

	// More generic lab routes
	apiRouter.HandleFunc("/labs/{subject}/{group}", auth.JWTMiddleware(labHandler.GetLabGrades)).Methods("GET")
	apiRouter.HandleFunc("/labs/{subject}/{group}/settings", auth.JWTMiddleware(auth.SubscriberMiddleware(labHandler.UpdateLabSettings))).Methods("PUT")
	apiRouter.HandleFunc("/labs/{subject}/{group}/grades", auth.JWTMiddleware(auth.SubscriberMiddleware(labHandler.UpdateLabGrades))).Methods("PUT")
	apiRouter.HandleFunc("/labs/{subject}/{group}/export", auth.JWTMiddleware(auth.SubscriberMiddleware(labHandler.ExportLabGrades))).Methods("GET")
	apiRouter.HandleFunc("/labs/{subject}/{group}/share", auth.JWTMiddleware(auth.SubscriberMiddleware(labHandler.ShareLabGrades))).Methods("POST")

	// Admin routes - ИСПРАВЛЕНО: добавлен JWTMiddleware перед AdminMiddleware
	adminHandler := handlers.NewAdminHandler(database)
	apiRouter.HandleFunc("/admin/users", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.GetUsers))).Methods("GET")
	apiRouter.HandleFunc("/admin/users/{id}/role", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.UpdateUserRole))).Methods("PUT")
	apiRouter.HandleFunc("/admin/users/{id}", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.DeleteUser))).Methods("DELETE")
	apiRouter.HandleFunc("/admin/logs", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.GetLogs))).Methods("GET")
	apiRouter.HandleFunc("/admin/teachers/{id}/groups", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.GetTeacherGroups))).Methods("GET")
	apiRouter.HandleFunc("/admin/teachers/{id}/groups", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.AddTeacherGroup))).Methods("POST")
	apiRouter.HandleFunc("/admin/teachers/{id}/attendance", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.GetTeacherAttendance))).Methods("GET")
	apiRouter.HandleFunc("/admin/teachers/{id}/labs", auth.JWTMiddleware(auth.AdminMiddleware(adminHandler.GetTeacherLabs))).Methods("GET")

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
		Addr:         ":8080",
		Handler:      c.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Println("API server started on :8080")
	log.Fatal(server.ListenAndServe())
}
