package utils

import (
    "context"
    "testing"
)

func TestSetAndGetUserContext(t *testing.T) {
    ctx := context.Background()
    ctx = SetUserContext(ctx, 1, "admin", "user@example.com")

    id, err := GetUserIDFromContext(ctx)
    if err != nil || id != 1 {
        t.Fatalf("expected id 1 got %v err %v", id, err)
    }

    role, err := GetUserRoleFromContext(ctx)
    if err != nil || role != "admin" {
        t.Fatalf("expected role admin got %v err %v", role, err)
    }

    email, err := GetUserEmailFromContext(ctx)
    if err != nil || email != "user@example.com" {
        t.Fatalf("expected email user@example.com got %v err %v", email, err)
    }
}

func TestGetUserFromContextMissing(t *testing.T) {
    ctx := context.Background()
    if _, err := GetUserIDFromContext(ctx); err == nil {
        t.Errorf("expected error for missing user id")
    }
    if _, err := GetUserRoleFromContext(ctx); err == nil {
        t.Errorf("expected error for missing user role")
    }
    if _, err := GetUserEmailFromContext(ctx); err == nil {
        t.Errorf("expected error for missing user email")
    }
}

