package user

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for users.
type Handler struct {
	service *Service
}

// NewHandler creates a new user handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers user routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	users := rg.Group("/users")

	users.GET("/leaderboard", h.GetLeaderboard)
	users.GET("/:id", authMiddleware, h.GetProfile)
	users.PUT("/:id", authMiddleware, h.UpdateProfile)
}

// GetProfile handles GET /v1/users/:id.
func (h *Handler) GetProfile(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	// Users can only view their own profile (could be extended to allow all profiles)
	result, err := h.service.GetProfile(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// UpdateProfile handles PUT /v1/users/:id.
func (h *Handler) UpdateProfile(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	// Verify the authenticated user is updating their own profile
	userID, ok := middleware.GetUserID(c)
	if !ok || userID != id {
		response.Err(c, 403, "AUTH_FORBIDDEN", "You can only update your own profile")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Name and email are required")
		return
	}

	result, err := h.service.UpdateProfile(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// GetLeaderboard handles GET /v1/users/leaderboard.
func (h *Handler) GetLeaderboard(c *gin.Context) {
	limit := int32(10)
	if l := c.Query("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = int32(val)
		}
	}

	entries, err := h.service.GetLeaderboard(c.Request.Context(), limit)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, entries)
}

// --- helpers ---

func parseID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid user ID")
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
