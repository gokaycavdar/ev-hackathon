package campaign

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for campaigns.
type Handler struct {
	service *Service
}

// NewHandler creates a new campaign handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers campaign routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	campaigns := rg.Group("/campaigns", authMiddleware)

	// for-user must be registered before /:id to avoid Gin treating "for-user" as an :id param
	campaigns.GET("/for-user", h.ListForUser)
	campaigns.GET("", h.List)
	campaigns.POST("", h.Create)
	campaigns.PUT("/:id", h.Update)
	campaigns.DELETE("/:id", h.Delete)
}

// ListForUser handles GET /v1/campaigns/for-user.
// Stub: returns all active campaigns with matchedBadges: [].
func (h *Handler) ListForUser(c *gin.Context) {
	campaigns, err := h.service.ListForUser(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"campaigns": campaigns})
}

// List handles GET /v1/campaigns — lists campaigns owned by the authenticated user.
func (h *Handler) List(c *gin.Context) {
	ownerID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	campaigns, err := h.service.ListByOwner(c.Request.Context(), ownerID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, campaigns)
}

// Create handles POST /v1/campaigns.
func (h *Handler) Create(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "title is required")
		return
	}

	result, err := h.service.Create(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, result)
}

// Update handles PUT /v1/campaigns/:id.
func (h *Handler) Update(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	var req UpdateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "title is required")
		return
	}

	result, err := h.service.Update(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// Delete handles DELETE /v1/campaigns/:id.
func (h *Handler) Delete(c *gin.Context) {
	id, err := parseID(c)
	if err != nil {
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"message": "Campaign deleted"})
}

// --- helpers ---

func parseID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid campaign ID")
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
