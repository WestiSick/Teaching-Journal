package utils

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// JWT secret key - ДОЛЖЕН БЫТЬ ИДЕНТИЧЕН ЗНАЧЕНИЮ В dashboard/utils/jwt.go
var jwtSecret = []byte("your-secret-key") // Замените на то же значение, что и в dashboard

// JWTClaims contains the claims we want to store in the token
type JWTClaims struct {
	UserID    int    `json:"user_id"`
	UserRole  string `json:"user_role"`
	UserEmail string `json:"user_email"`
	jwt.RegisteredClaims
}

// GenerateJWT generates a new JWT token for a user
func GenerateJWT(userID int, userRole, userEmail string) (string, error) {
	claims := JWTClaims{
		UserID:    userID,
		UserRole:  userRole,
		UserEmail: userEmail,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ParseJWT validates and parses a JWT token
func ParseJWT(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&JWTClaims{},
		func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		},
	)

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// ParseAuthHeader parses the Authorization header
func ParseAuthHeader(authHeader string) []string {
	// Check if format is "Bearer <token>"
	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		return nil
	}
	return tokenParts
}

// SetUserContext adds user information to the context
func SetUserContext(ctx context.Context, userID int, userRole, userEmail string) context.Context {
	ctx = context.WithValue(ctx, "user_id", userID)
	ctx = context.WithValue(ctx, "user_role", userRole)
	ctx = context.WithValue(ctx, "user_email", userEmail)
	return ctx
}

// GetUserIDFromContext retrieves the user ID from the context
func GetUserIDFromContext(ctx context.Context) (int, error) {
	userID, ok := ctx.Value("user_id").(int)
	if !ok {
		return 0, errors.New("user ID not found in context")
	}
	return userID, nil
}

// GetUserRoleFromContext retrieves the user role from the context
func GetUserRoleFromContext(ctx context.Context) (string, error) {
	userRole, ok := ctx.Value("user_role").(string)
	if !ok {
		return "", errors.New("user role not found in context")
	}
	return userRole, nil
}

// GetUserEmailFromContext retrieves the user email from the context
func GetUserEmailFromContext(ctx context.Context) (string, error) {
	userEmail, ok := ctx.Value("user_email").(string)
	if !ok {
		return "", errors.New("user email not found in context")
	}
	return userEmail, nil
}
