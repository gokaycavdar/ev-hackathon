package operator

import (
	"strconv"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for operator endpoints.
type Handler struct {
	service *Service
}

// NewHandler creates a new operator handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers operator routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	company := rg.Group("/company", authMiddleware)

	company.GET("/my-stations", h.ListMyStations)
	company.POST("/my-stations", h.CreateStation)
	company.PUT("/my-stations/:id", h.UpdateStation)
	company.DELETE("/my-stations/:id", h.DeleteStation)
}

// ListMyStations handles GET /v1/company/my-stations.
func (h *Handler) ListMyStations(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	result, err := h.service.ListMyStations(c.Request.Context(), userID)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// CreateStation handles POST /v1/company/my-stations.
func (h *Handler) CreateStation(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "name, lat, lng, and price are required")
		return
	}

	result, err := h.service.CreateStation(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, result)
}

// UpdateStation handles PUT /v1/company/my-stations/:id.
func (h *Handler) UpdateStation(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	var req UpdateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	result, err := h.service.UpdateStation(c.Request.Context(), userID, id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// DeleteStation handles DELETE /v1/company/my-stations/:id.
func (h *Handler) DeleteStation(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := parseID(c)
	if err != nil {
		return
	}

	if err := h.service.DeleteStation(c.Request.Context(), userID, id); err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, gin.H{"message": "Station deleted"})
}

// --- helpers ---

func parseID(c *gin.Context) (int32, error) {
	raw := c.Param("id")
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid station ID")
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
