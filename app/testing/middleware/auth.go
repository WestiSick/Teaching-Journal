package middleware

import (
	"TeacherJournal/app/dashboard/utils"
	testingUtils "TeacherJournal/app/testing/utils"
	"net/http"
	"strings"
)

// JWTMiddleware validates the JWT token and authorizes the request
func JWTMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			testingUtils.RespondWithError(w, http.StatusUnauthorized, "Authorization header is required")
			return
		}

		// Check if format is "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			testingUtils.RespondWithError(w, http.StatusUnauthorized, "Authorization header format must be Bearer <token>")
			return
		}

		// Parse and validate JWT token
		claims, err := utils.ParseJWT(tokenParts[1])
		if err != nil {
			testingUtils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Add user info to request context
		ctx := utils.SetUserContext(r.Context(), claims.UserID, claims.UserRole, claims.UserEmail)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// AdminOrTeacherMiddleware checks if the user is an admin or a teacher
func AdminOrTeacherMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user role from context
		userRole, err := utils.GetUserRoleFromContext(r.Context())
		if err != nil {
			testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Check if user is an admin or teacher
		if userRole != "admin" && userRole != "teacher" && userRole != "free" {
			testingUtils.RespondWithError(w, http.StatusForbidden, "Admin or teacher privileges required")
			return
		}

		next.ServeHTTP(w, r)
	}
}

// AdminMiddleware checks if the user is an admin
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user role from context
		userRole, err := utils.GetUserRoleFromContext(r.Context())
		if err != nil {
			testingUtils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Check if user is an admin
		if userRole != "admin" {
			testingUtils.RespondWithError(w, http.StatusForbidden, "Admin privileges required")
			return
		}

		next.ServeHTTP(w, r)
	}
}

// StudentMiddleware checks if the request has a valid student token
func StudentMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if the student token exists in context or header
		studentID, exists := r.Context().Value(testingUtils.StudentIDKey).(int)
		if !exists || studentID == 0 {
			// Check for student token in header
			studentToken := r.Header.Get("X-Student-Token")
			if studentToken == "" {
				testingUtils.RespondWithError(w, http.StatusUnauthorized, "Student authentication required")
				return
			}

			// Validate student token
			claims, err := testingUtils.ParseStudentJWT(studentToken)
			if err != nil {
				testingUtils.RespondWithError(w, http.StatusUnauthorized, "Invalid student token")
				return
			}

			// Add student info to context
			ctx := testingUtils.SetStudentContext(r.Context(), claims.StudentID)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// If we already have student context, proceed
		next.ServeHTTP(w, r)
	}
}

// ChainMiddleware allows multiple middleware to be chained together
func ChainMiddleware(middlewares ...func(http.HandlerFunc) http.HandlerFunc) func(http.HandlerFunc) http.HandlerFunc {
	return func(final http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			last := final
			for i := len(middlewares) - 1; i >= 0; i-- {
				last = middlewares[i](last)
			}
			last(w, r)
		}
	}
}
