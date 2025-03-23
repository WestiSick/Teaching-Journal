package utils

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// JWT secret key for student tokens
var studentJwtSecret = []byte("student-testing-secret-key") // In production, use a proper secret from config

// Context key for student information
type contextKey string

const (
	StudentIDKey contextKey = "student_id"
)

// StudentJWTClaims contains the claims for student tokens
type StudentJWTClaims struct {
	StudentID int    `json:"student_id"`
	FIO       string `json:"fio,omitempty"`
	GroupName string `json:"group_name,omitempty"`
	jwt.RegisteredClaims
}

// GenerateStudentJWT generates a JWT token for a student
func GenerateStudentJWT(studentID int, fio string, groupName string) (string, error) {
	claims := StudentJWTClaims{
		StudentID: studentID,
		FIO:       fio,
		GroupName: groupName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)), // Longer expiry for student sessions
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(studentJwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ParseStudentJWT validates and parses a student JWT token
func ParseStudentJWT(tokenString string) (*StudentJWTClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&StudentJWTClaims{},
		func(token *jwt.Token) (interface{}, error) {
			return studentJwtSecret, nil
		},
	)

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*StudentJWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// SetStudentContext adds student information to the context
func SetStudentContext(ctx context.Context, studentID int) context.Context {
	return context.WithValue(ctx, StudentIDKey, studentID)
}

// GetStudentIDFromContext retrieves the student ID from the context
func GetStudentIDFromContext(ctx context.Context) (int, error) {
	studentID, ok := ctx.Value(StudentIDKey).(int)
	if !ok {
		return 0, errors.New("student ID not found in context")
	}
	return studentID, nil
}
