package reservation

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for reservations.
type Handler struct {
	service *Service
}

// NewHandler creates a new reservation handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers reservation routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	reservations := rg.Group("/reservations", authMiddleware)

	reservations.POST("", h.Create)
	reservations.PATCH("/:id", h.UpdateStatus)
	reservations.POST("/:id/confirm", h.Confirm)
	reservations.POST("/:id/start", h.StartCharging)
	reservations.POST("/:id/complete", h.Complete)
}

// Create handles POST /v1/reservations.
func (h *Handler) Create(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateReservationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "stationId, date, and hour are required")
		return
	}

	result, err := h.service.Create(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, result)
}

// UpdateStatus handles PATCH /v1/reservations/:id.
func (h *Handler) UpdateStatus(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "status is required")
		return
	}

	if err := h.service.UpdateStatus(c.Request.Context(), id, userID, req); err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"message": "Status updated"})
}

// Complete handles POST /v1/reservations/:id/complete.
func (h *Handler) Complete(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	result, err := h.service.Complete(c.Request.Context(), id, userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// Confirm handles POST /v1/reservations/:id/confirm.
func (h *Handler) Confirm(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	result, err := h.service.Confirm(c.Request.Context(), id, userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// StartCharging handles POST /v1/reservations/:id/start.
func (h *Handler) StartCharging(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	result, err := h.service.StartCharging(c.Request.Context(), id, userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// --- helpers ---

func parseID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid reservation ID")
		return 0, err
	}
	return int32(val), nil
}

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "An unexpected error occurred")
}
