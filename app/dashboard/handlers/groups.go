package handlers

import (
	"TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/dashboard/utils"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// GroupHandler handles group-related requests
type GroupHandler struct {
	DB *gorm.DB
}

// NewGroupHandler creates a new GroupHandler
func NewGroupHandler(database *gorm.DB) *GroupHandler {
	return &GroupHandler{
		DB: database,
	}
}

// GroupResponse is the standard format for group data returned in API responses
type GroupResponse struct {
	Name         string `json:"name"`
	StudentCount int    `json:"student_count"`
}

// GetGroups returns all groups for the current user
func (h *GroupHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get groups
	var rawNames []string
	if err := h.DB.Raw(`
                SELECT DISTINCT group_name
                FROM (
                        SELECT group_name FROM lessons WHERE teacher_id = ?
                        UNION
                        SELECT group_name FROM students WHERE teacher_id = ?
                ) AS combined_groups
                ORDER BY group_name
        `, userID, userID).Scan(&rawNames).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving groups")
		return
	}

	groupSet := make(map[string]struct{})
	for _, combined := range rawNames {
		parts := strings.Split(combined, ",")
		for _, p := range parts {
			name := strings.TrimSpace(p)
			if name != "" {
				groupSet[name] = struct{}{}
			}
		}
	}

	// Get student count for each group
	var groups []GroupResponse
	for name := range groupSet {
		var count int64
		h.DB.Model(&models.Student{}).
			Where("teacher_id = ? AND group_name = ?", userID, name).
			Count(&count)

		groups = append(groups, GroupResponse{
			Name:         name,
			StudentCount: int(count),
		})
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Groups retrieved successfully", groups)
}

// GetGroup returns a specific group by name
func (h *GroupHandler) GetGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get group name from URL
	vars := mux.Vars(r)
	groupName := vars["name"]

	// Check if group exists
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? AND group_name = ?
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ? AND group_name = ?
		) AS combined_groups
	`, userID, groupName, userID, groupName).Count(&count)

	if count == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "Group not found")
		return
	}

	// Get student count
	var studentCount int64
	h.DB.Model(&models.Student{}).
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Count(&studentCount)

	// Get subjects taught to this group
	var subjects []string
	h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Distinct("subject").
		Pluck("subject", &subjects)

	group := struct {
		Name         string   `json:"name"`
		StudentCount int      `json:"student_count"`
		Subjects     []string `json:"subjects"`
	}{
		Name:         groupName,
		StudentCount: int(studentCount),
		Subjects:     subjects,
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Group retrieved successfully", group)
}

// CreateGroupRequest defines the request body for creating a group
type CreateGroupRequest struct {
	Name     string   `json:"name"`
	Students []string `json:"students,omitempty"`
}

// CreateGroup creates a new group
func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse request body
	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate inputs
	if req.Name == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Group name is required")
		return
	}

	// Check if group already exists
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? 
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ?
		) AS combined_groups
		WHERE group_name = ?`,
		userID, userID, req.Name).Count(&count)

	if count > 0 {
		utils.RespondWithError(w, http.StatusConflict, "Group with this name already exists")
		return
	}

	// Add students if provided
	var addedStudents int
	for _, studentFIO := range req.Students {
		studentFIO = strings.TrimSpace(studentFIO)
		if studentFIO != "" {
			student := models.Student{
				TeacherID:  userID,
				GroupName:  req.Name,
				StudentFIO: studentFIO,
			}

			if err := h.DB.Create(&student).Error; err == nil {
				addedStudents++
			}
		}
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Create Group",
		fmt.Sprintf("Created group %s with %d students", req.Name, addedStudents))

	utils.RespondWithSuccess(w, http.StatusCreated, "Group created successfully", map[string]interface{}{
		"name":           req.Name,
		"students_added": addedStudents,
	})
}

// UpdateGroupRequest defines the request body for updating a group
type UpdateGroupRequest struct {
	NewName string `json:"new_name,omitempty"`
}

// UpdateGroup updates a group
func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get group name from URL
	vars := mux.Vars(r)
	groupName := vars["name"]

	// Check if group exists
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? AND group_name = ?
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ? AND group_name = ?
		) AS combined_groups
	`, userID, groupName, userID, groupName).Count(&count)

	if count == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "Group not found")
		return
	}

	// Parse request body
	var req UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Check if a new name is provided
	if req.NewName == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "New group name is required")
		return
	}

	// Check if the new name already exists
	if req.NewName != groupName {
		h.DB.Raw(`
			SELECT COUNT(*) 
			FROM (
				SELECT group_name FROM lessons WHERE teacher_id = ? 
				UNION 
				SELECT group_name FROM students WHERE teacher_id = ?
			) AS combined_groups
			WHERE group_name = ?`,
			userID, userID, req.NewName).Count(&count)

		if count > 0 {
			utils.RespondWithError(w, http.StatusConflict, "Group with this name already exists")
			return
		}
	}

	// Update group name in lessons
	if err := h.DB.Model(&models.Lesson{}).
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Update("group_name", req.NewName).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating lessons")
		return
	}

	// Update group name in students
	if err := h.DB.Model(&models.Student{}).
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Update("group_name", req.NewName).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating students")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Update Group",
		fmt.Sprintf("Updated group name from %s to %s", groupName, req.NewName))

	utils.RespondWithSuccess(w, http.StatusOK, "Group updated successfully", nil)
}

// DeleteGroup deletes a group and all associated data
func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get group name from URL
	vars := mux.Vars(r)
	groupName := vars["name"]

	// Check if group exists
	var count int64
	h.DB.Raw(`
		SELECT COUNT(*) 
		FROM (
			SELECT group_name FROM lessons WHERE teacher_id = ? AND group_name = ?
			UNION 
			SELECT group_name FROM students WHERE teacher_id = ? AND group_name = ?
		) AS combined_groups
	`, userID, groupName, userID, groupName).Count(&count)

	if count == 0 {
		utils.RespondWithError(w, http.StatusNotFound, "Group not found")
		return
	}

	// Start a transaction to delete group data
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		// Delete lessons for this group
		if err := tx.Where("teacher_id = ? AND group_name = ?", userID, groupName).Delete(&models.Lesson{}).Error; err != nil {
			return err
		}

		// Delete students for this group
		if err := tx.Where("teacher_id = ? AND group_name = ?", userID, groupName).Delete(&models.Student{}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting group data")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Group",
		fmt.Sprintf("Deleted group %s with all lessons and students", groupName))

	utils.RespondWithSuccess(w, http.StatusOK, "Group deleted successfully", nil)
}

// StudentResponse is the standard format for student data returned in API responses
type StudentResponse struct {
	ID  int    `json:"id"`
	FIO string `json:"fio"`
}

// GetStudentsInGroup returns all students in a group
func (h *GroupHandler) GetStudentsInGroup(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get group name from URL
	vars := mux.Vars(r)
	groupName := vars["name"]

	// Get students
	var students []StudentResponse
	if err := h.DB.Model(&models.Student{}).
		Select("id, student_fio as fio").
		Where("teacher_id = ? AND group_name = ?", userID, groupName).
		Order("student_fio").
		Find(&students).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving students")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Students retrieved successfully", students)
}
