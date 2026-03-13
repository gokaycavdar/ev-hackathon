package review

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for reviews.
type Handler struct {
	service *Service
}

// NewHandler creates a new review handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers review routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	// Create review (auth required)
	rg.POST("/reviews", authMiddleware, h.CreateReview)

	// Get station reviews (public)
	rg.GET("/stations/:id/reviews", h.GetStationReviews)
}

// CreateReview handles POST /v1/reviews.
func (h *Handler) CreateReview(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "stationId, reservationId, and rating (1-5) are required")
		return
	}

	result, err := h.service.Create(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, result)
}

// GetStationReviews handles GET /v1/stations/:id/reviews.
// Query params: limit (default 10, max 50), offset (default 0)
func (h *Handler) GetStationReviews(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	limit := int32(10)
	offset := int32(0)

	if l := c.Query("limit"); l != "" {
		val, err := strconv.Atoi(l)
		if err == nil && val > 0 && val <= 50 {
			limit = int32(val)
		}
	}
	if o := c.Query("offset"); o != "" {
		val, err := strconv.Atoi(o)
		if err == nil && val >= 0 {
			offset = int32(val)
		}
	}

	result, err := h.service.GetStationReviews(c.Request.Context(), id, limit, offset)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// --- helpers ---

func parseID(c *gin.Context, param string) (int32, error) {
	raw := c.Param(param)
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid "+param)
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
