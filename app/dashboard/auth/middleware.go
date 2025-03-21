package auth

import (
	"TeacherJournal/app/dashboard/utils"
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
		claims, err := utils.ParseJWT(tokenParts[1])
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Add user info to request context
		ctx := utils.SetUserContext(r.Context(), claims.UserID, claims.UserRole, claims.UserEmail)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// SubscriberMiddleware checks if the user has a paid subscription
func SubscriberMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user info from context
		userRole, err := utils.GetUserRoleFromContext(r.Context())
		if err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}

		// Check if user is a free user
		if userRole == "free" {
			utils.RespondWithError(w, http.StatusForbidden, "Subscription required")
			return
		}

		next.ServeHTTP(w, r)
	}
}

// AdminMiddleware checks if the user is an admin
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get user info from context
		userRole, err := utils.GetUserRoleFromContext(r.Context())
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
