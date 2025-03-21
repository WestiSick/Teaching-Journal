package utils

import (
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// JWT secret key from configuration
var jwtSecret = []byte("your-secret-key") // Replace with config value in production

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
