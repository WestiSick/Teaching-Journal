package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserHandler handles user-related requests
type UserHandler struct {
	DB *gorm.DB
}

// NewUserHandler creates a new UserHandler
func NewUserHandler(database *gorm.DB) *UserHandler {
	return &UserHandler{
		DB: database,
	}
}

// GetCurrentUser returns information about the current user
func (h *UserHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user from database
	var user models.User
	if err := h.DB.Select("id, fio, login, role").Where("id = ?", userID).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	// Return user information
	utils.RespondWithSuccess(w, http.StatusOK, "User details retrieved", map[string]interface{}{
		"id":    user.ID,
		"fio":   user.FIO,
		"email": user.Login,
		"role":  user.Role,
	})
}

// UpdateUserRequest defines the request body for updating user information
type UpdateUserRequest struct {
	FIO             string `json:"fio"`
	CurrentPassword string `json:"current_password,omitempty"`
	NewPassword     string `json:"new_password,omitempty"`
}

// UpdateCurrentUser updates the current user's information
func (h *UserHandler) UpdateCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Get current user from database
	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	// Update FIO if provided
	if req.FIO != "" {
		user.FIO = req.FIO
	}

	// Update password if both current and new are provided
	if req.CurrentPassword != "" && req.NewPassword != "" {
		// Verify current password
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
			utils.RespondWithError(w, http.StatusUnauthorized, "Current password is incorrect")
			return
		}

		// Hash and set new password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error updating password")
			return
		}
		user.Password = string(hashedPassword)
	}

	// Save changes to database
	if err := h.DB.Save(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating user")
		return
	}

	// Log the update
	utils.LogAction(h.DB, userID, "Update Profile", "User updated profile information")

	// Return success
	utils.RespondWithSuccess(w, http.StatusOK, "User updated successfully", nil)
}
