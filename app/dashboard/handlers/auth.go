package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	DB *gorm.DB
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(database *gorm.DB) *AuthHandler {
	return &AuthHandler{
		DB: database,
	}
}

// RegisterRequest defines the request body for user registration
type RegisterRequest struct {
	FIO      string `json:"fio"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.FIO == "" || req.Email == "" || req.Password == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	// Check if email already exists
	var count int64
	h.DB.Model(&models.User{}).Where("login = ?", req.Email).Count(&count)
	if count > 0 {
		utils.RespondWithError(w, http.StatusConflict, "Email already registered")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error hashing password")
		return
	}

	// Create new user with default "free" role
	user := models.User{
		FIO:      req.FIO,
		Login:    req.Email,
		Password: string(hashedPassword),
		Role:     "free",
	}

	// Save user to database
	result := h.DB.Create(&user)
	if result.Error != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating user")
		return
	}

	// Log the registration
	utils.LogAction(h.DB, user.ID, "Registration", "New user registered")

	// Return success
	utils.RespondWithSuccess(w, http.StatusCreated, "User registered successfully", map[string]interface{}{
		"user_id": user.ID,
	})
}

// LoginRequest defines the request body for user login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse defines the response body for successful login
type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID   int    `json:"id"`
		FIO  string `json:"fio"`
		Role string `json:"role"`
	} `json:"user"`
}

// Login handles user login and returns a JWT token
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Find user by email
	var user models.User
	if err := h.DB.Where("login = ?", req.Email).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Role, user.Login)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	// Log the login
	utils.LogAction(h.DB, user.ID, "Authentication", fmt.Sprintf("User logged in: %s", user.Login))

	// Create response
	response := LoginResponse{
		Token: token,
		User: struct {
			ID   int    `json:"id"`
			FIO  string `json:"fio"`
			Role string `json:"role"`
		}{
			ID:   user.ID,
			FIO:  user.FIO,
			Role: user.Role,
		},
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Login successful", response)
}

// RefreshToken handles JWT token refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	// Get the token from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		utils.RespondWithError(w, http.StatusUnauthorized, "Authorization header is required")
		return
	}

	// Check if the format is "Bearer <token>"
	tokenParts := utils.ParseAuthHeader(authHeader)
	if tokenParts == nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid authorization header format")
		return
	}

	// Parse the token to get claims
	claims, err := utils.ParseJWT(tokenParts[1])
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	// Verify that the user still exists and has the same role
	var user models.User
	if err := h.DB.Select("id, fio, role, login").Where("id = ?", claims.UserID).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Generate a new token
	newToken, err := utils.GenerateJWT(user.ID, user.Role, user.Login)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error generating token")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Token refreshed", map[string]string{
		"token": newToken,
	})
}
