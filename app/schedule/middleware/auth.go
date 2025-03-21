package middleware

import (
	"TeacherJournal/app/dashboard/utils" // Продолжаем использовать dashboard utils
	"log"
	"net/http"
	"strings"
)

// JWTMiddleware validates JWT token and authorizes the request
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("JWT Middleware: Processing request")

		// Skip authentication for OPTIONS requests (CORS preflight)
		if r.Method == "OPTIONS" {
			log.Println("JWT Middleware: Skipping OPTIONS request")
			next.ServeHTTP(w, r)
			return
		}

		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("JWT Middleware: No Authorization header found")
			utils.RespondWithError(w, http.StatusUnauthorized, "Authorization header is required")
			return
		}
		log.Println("JWT Middleware: Auth header found:", authHeader)

		// Check if format is "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			log.Println("JWT Middleware: Invalid header format")
			utils.RespondWithError(w, http.StatusUnauthorized, "Authorization header format must be Bearer <token>")
			return
		}

		token := tokenParts[1]
		log.Println("JWT Middleware: Token extracted:", token[:10]+"...")

		// Parse and validate JWT token
		claims, err := utils.ParseJWT(token)
		if err != nil {
			log.Printf("JWT Middleware: Token validation failed: %v", err)
			utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		log.Printf("JWT Middleware: Token valid for user ID: %d, role: %s", claims.UserID, claims.UserRole)

		// Check if user is a free user - schedule access requires subscription
		if claims.UserRole == "free" {
			log.Println("JWT Middleware: Access denied for free user")
			utils.RespondWithError(w, http.StatusForbidden, "Subscription required for schedule access")
			return
		}

		// Add user info to request context
		ctx := utils.SetUserContext(r.Context(), claims.UserID, claims.UserRole, claims.UserEmail)
		log.Println("JWT Middleware: Context updated, proceeding with request")
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
