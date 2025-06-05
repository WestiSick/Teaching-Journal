package utils

import (
    "context"
    "testing"

    "github.com/golang-jwt/jwt/v4"
)

func TestTicketsSetAndGetUserContext(t *testing.T) {
    ctx := context.Background()
    ctx = SetUserContext(ctx, 2, "user", "user2@example.com")
    id, err := GetUserIDFromContext(ctx)
    if err != nil || id != 2 {
        t.Fatalf("expected id 2 got %v err %v", id, err)
    }
    role, err := GetUserRoleFromContext(ctx)
    if err != nil || role != "user" {
        t.Fatalf("expected role user got %v err %v", role, err)
    }
    email, err := GetUserEmailFromContext(ctx)
    if err != nil || email != "user2@example.com" {
        t.Fatalf("expected email user2@example.com got %v err %v", email, err)
    }
}

func TestTicketsGetUserFromContextMissing(t *testing.T) {
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

func createToken(t *testing.T) string {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, JWTClaims{
        UserID:    3,
        UserRole:  "staff",
        UserEmail: "staff@example.com",
        RegisteredClaims: jwt.RegisteredClaims{},
    })
    s, err := token.SignedString(jwtSecret)
    if err != nil {
        t.Fatalf("sign error: %v", err)
    }
    return s
}

func TestTicketsGenerateAndParseJWT(t *testing.T) {
    token := createToken(t)
    claims, err := ParseJWT(token)
    if err != nil {
        t.Fatalf("ParseJWT error: %v", err)
    }
    if claims.UserID != 3 || claims.UserRole != "staff" || claims.UserEmail != "staff@example.com" {
        t.Fatalf("unexpected claims: %+v", claims)
    }
}

func TestTicketsParseJWTInvalid(t *testing.T) {
    if _, err := ParseJWT("token.bad"); err == nil {
        t.Errorf("expected error for invalid token")
    }
}

func TestTicketsParseAuthHeader(t *testing.T) {
    parts := ParseAuthHeader("Bearer 123")
    if len(parts) != 2 || parts[1] != "123" {
        t.Fatalf("unexpected parts: %v", parts)
    }
    if ParseAuthHeader("Token 1") != nil {
        t.Errorf("expected nil for invalid header")
    }
    if ParseAuthHeader("Bearer") != nil {
        t.Errorf("expected nil for malformed header")
    }
}
