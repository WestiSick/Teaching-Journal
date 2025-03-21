package handlers

import (
	"TeacherJournal/app/tickets/db"
	"TeacherJournal/app/tickets/models"
	"TeacherJournal/app/tickets/utils"
	"TeacherJournal/config"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

// TicketHandler handles ticket-related routes
type TicketHandler struct {
	DB *gorm.DB
}

// NewTicketHandler creates a new TicketHandler
func NewTicketHandler(database *gorm.DB) *TicketHandler {
	return &TicketHandler{
		DB: database,
	}
}

// GetTickets returns all tickets for the current user
func (h *TicketHandler) GetTickets(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get query parameters
	status := r.URL.Query().Get("status")
	sortBy := r.URL.Query().Get("sort")

	// Get tickets based on user role and filters
	tickets, err := db.GetUserTickets(h.DB, userID, status, userRole, sortBy)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving tickets")
		return
	}

	// Get user information for tickets
	userIDs := make(map[int]bool)
	for _, ticket := range tickets {
		userIDs[ticket.CreatedBy] = true
		if ticket.AssignedTo != nil {
			userIDs[*ticket.AssignedTo] = true
		}
	}

	// Create a list of userIDs for the query
	var userIDList []int
	for id := range userIDs {
		userIDList = append(userIDList, id)
	}

	// Get user information
	var users []struct {
		ID    int    `json:"id"`
		FIO   string `json:"fio"`
		Login string `json:"login"`
	}

	if len(userIDList) > 0 {
		h.DB.Table("users").
			Select("id, fio, login").
			Where("id IN ?", userIDList).
			Find(&users)
	}

	// Create a map for quick lookup
	userMap := make(map[int]struct {
		Name  string
		Email string
	})

	for _, user := range users {
		userMap[user.ID] = struct {
			Name  string
			Email string
		}{
			Name:  user.FIO,
			Email: user.Login,
		}
	}

	// Create response with user information
	type TicketResponse struct {
		models.Ticket
		CreatedByUser struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"created_by_user"`
		AssignedToUser *struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"assigned_to_user,omitempty"`
	}

	var response []TicketResponse
	for _, ticket := range tickets {
		var ticketResp TicketResponse
		ticketResp.Ticket = ticket

		// Set creator information
		if creator, ok := userMap[ticket.CreatedBy]; ok {
			ticketResp.CreatedByUser = struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Email string `json:"email"`
			}{
				ID:    ticket.CreatedBy,
				Name:  creator.Name,
				Email: creator.Email,
			}
		} else {
			ticketResp.CreatedByUser = struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Email string `json:"email"`
			}{
				ID:    ticket.CreatedBy,
				Name:  "Unknown",
				Email: "",
			}
		}

		// Set assignee information if ticket is assigned
		if ticket.AssignedTo != nil {
			if assignee, ok := userMap[*ticket.AssignedTo]; ok {
				ticketResp.AssignedToUser = &struct {
					ID    int    `json:"id"`
					Name  string `json:"name"`
					Email string `json:"email"`
				}{
					ID:    *ticket.AssignedTo,
					Name:  assignee.Name,
					Email: assignee.Email,
				}
			}
		}

		response = append(response, ticketResp)
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Tickets retrieved successfully", response)
}

// GetTicket returns a specific ticket by ID
func (h *TicketHandler) GetTicket(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get ticket from database
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to view this ticket")
		return
	}

	// Get user information
	var userIDs []int
	userIDs = append(userIDs, ticket.CreatedBy)
	if ticket.AssignedTo != nil {
		userIDs = append(userIDs, *ticket.AssignedTo)
	}

	// Get user information
	var users []struct {
		ID    int    `json:"id"`
		FIO   string `json:"fio"`
		Login string `json:"login"`
	}

	if len(userIDs) > 0 {
		h.DB.Table("users").
			Select("id, fio, login").
			Where("id IN ?", userIDs).
			Find(&users)
	}

	// Create a map for quick lookup
	userMap := make(map[int]struct {
		Name  string
		Email string
	})

	for _, user := range users {
		userMap[user.ID] = struct {
			Name  string
			Email string
		}{
			Name:  user.FIO,
			Email: user.Login,
		}
	}

	// Create response with user information
	type TicketDetailResponse struct {
		models.Ticket
		CreatedByUser struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"created_by_user"`
		AssignedToUser *struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"assigned_to_user,omitempty"`
		Comments        []models.TicketComment    `json:"comments,omitempty"`
		Attachments     []models.TicketAttachment `json:"attachments,omitempty"`
		History         []models.TicketHistory    `json:"history,omitempty"`
		StatusOptions   []string                  `json:"status_options"`
		PriorityOptions []string                  `json:"priority_options"`
		CategoryOptions []string                  `json:"category_options"`
	}

	// Create response
	var response TicketDetailResponse
	response.Ticket = ticket
	response.StatusOptions = config.TicketStatusValues
	response.PriorityOptions = config.TicketPriorityValues
	response.CategoryOptions = config.TicketCategoryValues

	// Set creator information
	if creator, ok := userMap[ticket.CreatedBy]; ok {
		response.CreatedByUser = struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		}{
			ID:    ticket.CreatedBy,
			Name:  creator.Name,
			Email: creator.Email,
		}
	} else {
		response.CreatedByUser = struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		}{
			ID:    ticket.CreatedBy,
			Name:  "Unknown",
			Email: "",
		}
	}

	// Set assignee information if ticket is assigned
	if ticket.AssignedTo != nil {
		if assignee, ok := userMap[*ticket.AssignedTo]; ok {
			response.AssignedToUser = &struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Email string `json:"email"`
			}{
				ID:    *ticket.AssignedTo,
				Name:  assignee.Name,
				Email: assignee.Email,
			}
		}
	}

	// Get comments for this ticket
	comments, err := db.GetTicketComments(h.DB, ticketID, userRole == "admin")
	if err == nil {
		response.Comments = comments
	}

	// Get attachments for this ticket
	attachments, err := db.GetTicketAttachments(h.DB, ticketID)
	if err == nil {
		response.Attachments = attachments
	}

	// Get history for admins
	if userRole == "admin" {
		history, err := db.GetTicketHistory(h.DB, ticketID)
		if err == nil {
			response.History = history
		}
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Ticket retrieved successfully", response)
}

// CreateTicket creates a new ticket
func (h *TicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse multipart form for file uploads
	err = r.ParseMultipartForm(config.MaxFileSize)
	if err != nil && err != http.ErrNotMultipart {
		utils.RespondWithError(w, http.StatusBadRequest, "Error parsing form data")
		return
	}

	// Decode JSON from form field
	var ticket models.Ticket

	if r.FormValue("ticket") != "" {
		err = json.Unmarshal([]byte(r.FormValue("ticket")), &ticket)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket data format")
			return
		}
	} else {
		// If no form used, parse JSON from request body
		err = json.NewDecoder(r.Body).Decode(&ticket)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}
	}

	// Validate ticket data
	if ticket.Title == "" || ticket.Description == "" || ticket.Category == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Title, description, and category are required")
		return
	}

	// Set creator ID
	ticket.CreatedBy = userID

	// Create ticket
	if err := db.CreateTicket(h.DB, &ticket); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error creating ticket")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Create Ticket", fmt.Sprintf("Created ticket: %s", ticket.Title))

	// Handle file attachments if present
	if r.MultipartForm != nil && r.MultipartForm.File != nil {
		files := r.MultipartForm.File["attachments"]
		for _, fileHeader := range files {
			if err := h.saveAttachment(ticket.ID, 0, userID, fileHeader); err != nil {
				log.Printf("Error saving attachment: %v", err)
			}
		}
	}

	utils.RespondWithSuccess(w, http.StatusCreated, "Ticket created successfully", map[string]interface{}{
		"id": ticket.ID,
	})
}

// UpdateTicket updates an existing ticket
func (h *TicketHandler) UpdateTicket(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has permission to update
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to update this ticket")
		return
	}

	// Parse request body
	var updateReq map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Prepare update data
	updates := make(map[string]interface{})

	// Fields that any user with access can update
	if title, ok := updateReq["title"].(string); ok && title != "" {
		updates["title"] = title
	}

	if description, ok := updateReq["description"].(string); ok && description != "" {
		updates["description"] = description
	}

	if category, ok := updateReq["category"].(string); ok && category != "" {
		updates["category"] = category
	}

	// Fields that only creators or admins can update
	if userRole == "admin" || ticket.CreatedBy == userID {
		if priority, ok := updateReq["priority"].(string); ok && priority != "" {
			updates["priority"] = priority
		}
	}

	// Admin-only updates
	if userRole == "admin" {
		if status, ok := updateReq["status"].(string); ok && status != "" {
			updates["status"] = status
		}

		if assignedTo, ok := updateReq["assigned_to"]; ok {
			// Check if null assignment
			if assignedTo == nil {
				var nilAssignment *int = nil
				updates["assigned_to"] = nilAssignment
			} else if assignedToID, ok := assignedTo.(float64); ok {
				updates["assigned_to"] = int(assignedToID)
			}
		}
	} else if ticket.CreatedBy == userID && ticket.Status == "Resolved" {
		// Allow creator to reopen a resolved ticket
		if status, ok := updateReq["status"].(string); ok && status == "Open" {
			updates["status"] = status
		}
	}

	// Apply updates if any
	if len(updates) > 0 {
		if err := db.UpdateTicket(h.DB, ticketID, userID, updates); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error updating ticket")
			return
		}

		// Log the action
		utils.LogTicketAction(h.DB, ticketID, userID, "Update Ticket", fmt.Sprintf("Updated ticket #%d", ticketID))
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Ticket updated successfully", nil)
}

// DeleteTicket deletes a ticket
func (h *TicketHandler) DeleteTicket(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Only admins or ticket creators can delete tickets
	if userRole != "admin" && ticket.CreatedBy != userID {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to delete this ticket")
		return
	}

	// Delete the ticket
	if err := db.DeleteTicket(h.DB, ticketID); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error deleting ticket")
		return
	}

	// Log the action
	utils.LogAction(h.DB, userID, "Delete Ticket", fmt.Sprintf("Deleted ticket #%d: %s", ticketID, ticket.Title))

	utils.RespondWithSuccess(w, http.StatusOK, "Ticket deleted successfully", nil)
}

// GetComments returns all comments for a ticket
func (h *TicketHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to view comments on this ticket")
		return
	}

	// Get comments for this ticket
	comments, err := db.GetTicketComments(h.DB, ticketID, userRole == "admin")
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving comments")
		return
	}

	// Get user IDs from comments
	var userIDs []int
	for _, comment := range comments {
		userIDs = append(userIDs, comment.UserID)
	}

	// Get user information
	var users []struct {
		ID    int    `json:"id"`
		FIO   string `json:"fio"`
		Login string `json:"login"`
	}

	if len(userIDs) > 0 {
		h.DB.Table("users").
			Select("id, fio, login").
			Where("id IN ?", userIDs).
			Find(&users)
	}

	// Create a map for quick lookup
	userMap := make(map[int]struct {
		Name  string
		Email string
	})

	for _, user := range users {
		userMap[user.ID] = struct {
			Name  string
			Email string
		}{
			Name:  user.FIO,
			Email: user.Login,
		}
	}

	// Create response with user information
	type CommentResponse struct {
		models.TicketComment
		User struct {
			ID    int    `json:"id"`
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"user"`
	}

	var response []CommentResponse
	for _, comment := range comments {
		var commentResp CommentResponse
		commentResp.TicketComment = comment

		if user, ok := userMap[comment.UserID]; ok {
			commentResp.User = struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Email string `json:"email"`
			}{
				ID:    comment.UserID,
				Name:  user.Name,
				Email: user.Email,
			}
		} else {
			commentResp.User = struct {
				ID    int    `json:"id"`
				Name  string `json:"name"`
				Email string `json:"email"`
			}{
				ID:    comment.UserID,
				Name:  "Unknown",
				Email: "",
			}
		}

		response = append(response, commentResp)
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Comments retrieved successfully", response)
}

// AddComment adds a comment to a ticket
func (h *TicketHandler) AddComment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to comment on this ticket")
		return
	}

	// Parse multipart form for file uploads
	err = r.ParseMultipartForm(config.MaxFileSize)
	if err != nil && err != http.ErrNotMultipart {
		utils.RespondWithError(w, http.StatusBadRequest, "Error parsing form data")
		return
	}

	// Parse comment data
	var comment models.TicketComment

	if r.FormValue("comment") != "" {
		err = json.Unmarshal([]byte(r.FormValue("comment")), &comment)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid comment data format")
			return
		}
	} else {
		// If no form used, parse JSON from request body
		err = json.NewDecoder(r.Body).Decode(&comment)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}
	}

	// Validate comment data
	if comment.Content == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "Comment content is required")
		return
	}

	// Set comment metadata
	comment.TicketID = ticketID
	comment.UserID = userID

	// Only admins can create internal comments
	if userRole != "admin" {
		comment.IsInternal = false
	}

	// Add the comment
	if err := db.AddTicketComment(h.DB, &comment); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error adding comment")
		return
	}

	// Update ticket status if necessary (for regular users only)
	if userRole != "admin" && ticket.Status == "Resolved" {
		// If user replies to a resolved ticket, reopen it
		updates := map[string]interface{}{
			"status": "InProgress",
		}
		db.UpdateTicket(h.DB, ticketID, userID, updates)
	}

	// Log the action
	utils.LogTicketAction(h.DB, ticketID, userID, "Add Comment",
		fmt.Sprintf("Added comment to ticket #%d", ticketID))

	// Handle file attachments if present
	if r.MultipartForm != nil && r.MultipartForm.File != nil {
		files := r.MultipartForm.File["attachments"]
		for _, fileHeader := range files {
			if err := h.saveAttachment(ticketID, comment.ID, userID, fileHeader); err != nil {
				log.Printf("Error saving attachment: %v", err)
			}
		}
	}

	utils.RespondWithSuccess(w, http.StatusCreated, "Comment added successfully", map[string]interface{}{
		"id": comment.ID,
	})
}

// GetAttachments returns all attachments for a ticket
func (h *TicketHandler) GetAttachments(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to view attachments on this ticket")
		return
	}

	// Get attachments for this ticket
	attachments, err := db.GetTicketAttachments(h.DB, ticketID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving attachments")
		return
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Attachments retrieved successfully", attachments)
}

// AddAttachment adds an attachment to a ticket or comment
func (h *TicketHandler) AddAttachment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get ticket ID from URL
	vars := mux.Vars(r)
	ticketID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid ticket ID")
		return
	}

	// Get existing ticket
	ticket, err := db.GetTicketByID(h.DB, ticketID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Ticket not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		}
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to add attachments to this ticket")
		return
	}

	// Parse multipart form
	err = r.ParseMultipartForm(config.MaxFileSize)
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Error parsing form")
		return
	}

	// Get optional comment ID
	commentID := 0
	commentIDStr := r.FormValue("comment_id")
	if commentIDStr != "" {
		commentID, err = strconv.Atoi(commentIDStr)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid comment ID")
			return
		}

		// Verify the comment exists and belongs to this ticket
		var count int64
		h.DB.Model(&models.TicketComment{}).
			Where("id = ? AND ticket_id = ?", commentID, ticketID).
			Count(&count)

		if count == 0 {
			utils.RespondWithError(w, http.StatusBadRequest, "Comment not found or does not belong to this ticket")
			return
		}
	}

	// Get file from form
	file, header, err := r.FormFile("attachment")
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer file.Close()

	// Save the attachment
	err = h.saveAttachment(ticketID, commentID, userID, header)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error saving attachment")
		return
	}

	utils.RespondWithSuccess(w, http.StatusCreated, "Attachment added successfully", nil)
}

// DownloadAttachment downloads an attachment by ID
func (h *TicketHandler) DownloadAttachment(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get attachment ID from URL
	vars := mux.Vars(r)
	attachmentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid attachment ID")
		return
	}

	// Get attachment
	var attachment models.TicketAttachment
	if err := h.DB.First(&attachment, attachmentID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.RespondWithError(w, http.StatusNotFound, "Attachment not found")
		} else {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving attachment")
		}
		return
	}

	// Get the ticket to verify access
	ticket, err := db.GetTicketByID(h.DB, attachment.TicketID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving ticket")
		return
	}

	// Check if user has access to this ticket
	if userRole != "admin" && ticket.CreatedBy != userID && (ticket.AssignedTo == nil || *ticket.AssignedTo != userID) {
		utils.RespondWithError(w, http.StatusForbidden, "You don't have permission to download this attachment")
		return
	}

	// Open the file
	file, err := os.Open(attachment.FilePath)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error opening attachment file")
		return
	}
	defer file.Close()

	// Set response headers
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", attachment.FileName))
	w.Header().Set("Content-Type", attachment.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(attachment.FileSize, 10))

	// Stream the file to the response
	_, err = io.Copy(w, file)
	if err != nil {
		log.Printf("Error streaming file: %v", err)
	}
}

// GetTicketStats returns statistics about tickets
func (h *TicketHandler) GetTicketStats(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, err := utils.GetUserIDFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Get user role from context
	userRole, err := utils.GetUserRoleFromContext(r.Context())
	if err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var stats models.TicketStats

	// Count total tickets
	h.DB.Model(&models.Ticket{}).Count(&stats.Total)

	// Count tickets by status using case-insensitive comparison
	h.DB.Model(&models.Ticket{}).Where("LOWER(status) = LOWER(?)", "New").Count(&stats.New)
	h.DB.Model(&models.Ticket{}).Where("LOWER(status) = LOWER(?)", "Open").Count(&stats.Open)
	h.DB.Model(&models.Ticket{}).Where("LOWER(status) = LOWER(?)", "InProgress").Or("LOWER(status) = LOWER(?)", "In Progress").Count(&stats.InProgress)
	h.DB.Model(&models.Ticket{}).Where("LOWER(status) = LOWER(?)", "Resolved").Count(&stats.Resolved)
	h.DB.Model(&models.Ticket{}).Where("LOWER(status) = LOWER(?)", "Closed").Count(&stats.Closed)

	// Count tickets assigned to user
	h.DB.Model(&models.Ticket{}).Where("assigned_to = ?", userID).Count(&stats.AssignedToUser)

	// Count tickets created by user
	h.DB.Model(&models.Ticket{}).Where("creator_id = ?", userID).Count(&stats.CreatedByUser)

	// Additional stats for admins
	if userRole == "admin" {
		// Could add more admin-specific stats here
	}

	utils.RespondWithSuccess(w, http.StatusOK, "Ticket statistics retrieved successfully", stats)
}

// saveAttachment saves a file attachment and creates a record in the database
func (h *TicketHandler) saveAttachment(ticketID int, commentID int, userID int, fileHeader *multipart.FileHeader) error {
	// Open the uploaded file
	file, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer file.Close()

	// Create attachments directory if it doesn't exist
	if err := os.MkdirAll(config.AttachmentStoragePath, os.ModePerm); err != nil {
		return err
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := filepath.Base(fileHeader.Filename)
	safeName := fmt.Sprintf("%d_%d_%s", ticketID, timestamp, strings.ReplaceAll(filename, " ", "_"))
	filePath := filepath.Join(config.AttachmentStoragePath, safeName)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer dst.Close()

	// Copy the file
	if _, err = io.Copy(dst, file); err != nil {
		return err
	}

	// Create attachment record
	var commentIDPtr *int
	if commentID > 0 {
		commentIDPtr = &commentID
	}

	attachment := models.TicketAttachment{
		TicketID:    ticketID,
		CommentID:   commentIDPtr,
		FileName:    filename,
		FilePath:    filePath,
		FileSize:    fileHeader.Size,
		ContentType: fileHeader.Header.Get("Content-Type"),
		UploadedBy:  userID,
		UploadedAt:  time.Now(),
	}

	return h.DB.Create(&attachment).Error
}
