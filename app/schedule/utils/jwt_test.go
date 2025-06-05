package utils

import (
    "context"
    "testing"
)

func TestScheduleSetAndGetUserContext(t *testing.T) {
    ctx := context.Background()
    ctx = SetUserContext(ctx, 5, "teacher", "teach@example.com")

    id, err := GetUserIDFromContext(ctx)
    if err != nil || id != 5 {
        t.Fatalf("expected id 5 got %v err %v", id, err)
    }

    role, err := GetUserRoleFromContext(ctx)
    if err != nil || role != "teacher" {
        t.Fatalf("expected role teacher got %v err %v", role, err)
    }

    email, err := GetUserEmailFromContext(ctx)
    if err != nil || email != "teach@example.com" {
        t.Fatalf("expected email teach@example.com got %v err %v", email, err)
    }
}

func TestScheduleGetUserFromContextMissing(t *testing.T) {
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

func TestScheduleGenerateAndParseJWT(t *testing.T) {
    token, err := GenerateJWT(7, "admin", "adm@example.com")
    if err != nil {
        t.Fatalf("GenerateJWT error: %v", err)
    }

    claims, err := ParseJWT(token)
    if err != nil {
        t.Fatalf("ParseJWT error: %v", err)
    }

    if claims.UserID != 7 || claims.UserRole != "admin" || claims.UserEmail != "adm@example.com" {
        t.Fatalf("unexpected claims: %+v", claims)
    }
}

func TestScheduleParseJWTInvalid(t *testing.T) {
    if _, err := ParseJWT("bad.token"); err == nil {
        t.Errorf("expected error for invalid token")
    }
}

func TestScheduleParseAuthHeader(t *testing.T) {
    parts := ParseAuthHeader("Bearer xyz")
    if len(parts) != 2 || parts[1] != "xyz" {
        t.Fatalf("unexpected parts: %v", parts)
    }
    if ParseAuthHeader("Token abc") != nil {
        t.Errorf("expected nil for invalid header")
    }
    if ParseAuthHeader("Bearer") != nil {
        t.Errorf("expected nil for malformed header")
    }
}
