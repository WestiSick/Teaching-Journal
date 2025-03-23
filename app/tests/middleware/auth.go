package middleware

import (
	dashboardUtils "TeacherJournal/app/dashboard/utils"
	"TeacherJournal/app/tests/utils"
	"net/http"
	"strings"
)

// JWTMiddleware validates the JWT token and authorizes the request
func JWTMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Authorization header is required")
			return
		}

		// Check if format is "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Authorization header format must be Bearer <token>")
			return
		}

		// Parse and validate JWT token
		claims, err := dashboardUtils.ParseJWT(tokenParts[1])
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Add user info to request context
		ctx := dashboardUtils.SetUserContext(r.Context(), claims.UserID, claims.UserRole, claims.UserEmail)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// TeacherMiddleware restricts access to teachers only
func TeacherMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user role from context
		userRole, err := dashboardUtils.GetUserRoleFromContext(r.Context())
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Check if user is a teacher or an admin
		if userRole != "teacher" && userRole != "admin" {
			utils.RespondWithError(w, http.StatusForbidden, "Teacher privileges required")
			return
		}

		next.ServeHTTP(w, r)
	}
}

// AdminMiddleware restricts access to admins only
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user role from context
		userRole, err := dashboardUtils.GetUserRoleFromContext(r.Context())
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Check if user is an admin
		if userRole != "admin" {
			utils.RespondWithError(w, http.StatusForbidden, "Admin privileges required")
			return
		}

		next.ServeHTTP(w, r)
	}
}

// StudentAuthMiddleware verifies student authentication
func StudentAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// For student auth, we'll use a simplified approach
		// Get student ID and email from either a token or session

		// TODO: Implement proper student authentication
		// For now, we'll just check if student_id is provided in query params
		studentID := r.URL.Query().Get("student_id")
		if studentID == "" {
			utils.RespondWithError(w, http.StatusUnauthorized, "Student authentication required")
			return
		}

		// Continue with the request
		next.ServeHTTP(w, r)
	}
}
