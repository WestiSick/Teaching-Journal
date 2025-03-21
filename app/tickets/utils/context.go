package utils

import (
	"context"
	"errors"
)

// Key types for context values
type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	UserRoleKey  contextKey = "user_role"
	UserEmailKey contextKey = "user_email"
)

// SetUserContext adds user information to the context
func SetUserContext(ctx context.Context, userID int, userRole, userEmail string) context.Context {
	ctx = context.WithValue(ctx, UserIDKey, userID)
	ctx = context.WithValue(ctx, UserRoleKey, userRole)
	ctx = context.WithValue(ctx, UserEmailKey, userEmail)
	return ctx
}

// GetUserIDFromContext retrieves the user ID from the context
func GetUserIDFromContext(ctx context.Context) (int, error) {
	userID, ok := ctx.Value(UserIDKey).(int)
	if !ok {
		return 0, errors.New("user ID not found in context")
	}
	return userID, nil
}

// GetUserRoleFromContext retrieves the user role from the context
func GetUserRoleFromContext(ctx context.Context) (string, error) {
	userRole, ok := ctx.Value(UserRoleKey).(string)
	if !ok {
		return "", errors.New("user role not found in context")
	}
	return userRole, nil
}

// GetUserEmailFromContext retrieves the user email from the context
func GetUserEmailFromContext(ctx context.Context) (string, error) {
	userEmail, ok := ctx.Value(UserEmailKey).(string)
	if !ok {
		return "", errors.New("user email not found in context")
	}
	return userEmail, nil
}
