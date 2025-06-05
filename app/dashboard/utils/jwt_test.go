package utils

import "testing"

func TestGenerateAndParseJWT(t *testing.T) {
    token, err := GenerateJWT(42, "teacher", "test@example.com")
    if err != nil {
        t.Fatalf("GenerateJWT error: %v", err)
    }

    claims, err := ParseJWT(token)
    if err != nil {
        t.Fatalf("ParseJWT error: %v", err)
    }

    if claims.UserID != 42 || claims.UserRole != "teacher" || claims.UserEmail != "test@example.com" {
        t.Fatalf("unexpected claims: %+v", claims)
    }
}

func TestParseJWTInvalid(t *testing.T) {
    if _, err := ParseJWT("invalid.token"); err == nil {
        t.Errorf("expected error for invalid token")
    }
}

func TestParseAuthHeader(t *testing.T) {
    parts := ParseAuthHeader("Bearer abc")
    if len(parts) != 2 || parts[1] != "abc" {
        t.Fatalf("unexpected parts: %v", parts)
    }

    if ParseAuthHeader("Token abc") != nil {
        t.Errorf("expected nil for invalid header")
    }
    if ParseAuthHeader("Bearer") != nil {
        t.Errorf("expected nil for malformed header")
    }
}

