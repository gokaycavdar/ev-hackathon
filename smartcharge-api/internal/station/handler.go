package station

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/recommend"
	"smartcharge-api/internal/response"
)

// Handler handles HTTP requests for stations.
type Handler struct {
	service   *Service
	recommend *recommend.Service
}

// NewHandler creates a new station handler.
func NewHandler(service *Service, recommendSvc *recommend.Service) *Handler {
	return &Handler{service: service, recommend: recommendSvc}
}

// RegisterRoutes registers station routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup, authMiddleware gin.HandlerFunc) {
	stations := rg.Group("/stations")

	// Public routes
	stations.GET("", h.ListStations)
	stations.GET("/forecast", h.GetForecasts)
	stations.GET("/recommend", h.GetRecommendations)
	stations.GET("/:id", h.GetStation)

	// Protected routes
	stations.POST("", authMiddleware, h.CreateStation)
	stations.PUT("/:id", authMiddleware, h.UpdateStation)
}

// ListStations handles GET /v1/stations.
func (h *Handler) ListStations(c *gin.Context) {
	items, err := h.service.ListStations(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, items)
}

// GetStation handles GET /v1/stations/:id.
func (h *Handler) GetStation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	result, err := h.service.GetStation(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// CreateStation handles POST /v1/stations.
func (h *Handler) CreateStation(c *gin.Context) {
	userID, ok := middleware.GetUserID(c)
	if !ok {
		response.Err(c, 401, "AUTH_UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Name, latitude, longitude, and price are required")
		return
	}

	result, err := h.service.CreateStation(c.Request.Context(), userID, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.Created(c, result)
}

// UpdateStation handles PUT /v1/stations/:id.
func (h *Handler) UpdateStation(c *gin.Context) {
	id, err := parseID(c, "id")
	if err != nil {
		return
	}

	var req UpdateStationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Name, latitude, longitude, and price are required")
		return
	}

	result, err := h.service.UpdateStation(c.Request.Context(), id, req)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// GetForecasts handles GET /v1/stations/forecast.
func (h *Handler) GetForecasts(c *gin.Context) {
	now := time.Now()
	// Default: current day and hour
	dayOfWeek := int32((int(now.Weekday()) + 6) % 7)
	hour := int32(now.Hour())

	if d := c.Query("day"); d != "" {
		val, err := strconv.Atoi(d)
		if err == nil && val >= 0 && val <= 6 {
			dayOfWeek = int32(val)
		}
	}
	if h := c.Query("hour"); h != "" {
		val, err := strconv.Atoi(h)
		if err == nil && val >= 0 && val <= 23 {
			hour = int32(val)
		}
	}

	result, err := h.service.GetForecasts(c.Request.Context(), dayOfWeek, hour)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// GetRecommendations handles GET /v1/stations/recommend.
// Query params: lat, lng, hour, day, limit, algorithm (linear|rl)
func (h *Handler) GetRecommendations(c *gin.Context) {
	now := time.Now()

	var lat, lng float64 = 38.619, 27.429 // Default: Manisa city center
	hour := now.Hour()
	limit := 10

	if l := c.Query("lat"); l != "" {
		val, err := strconv.ParseFloat(l, 64)
		if err == nil {
			lat = val
		}
	}
	if l := c.Query("lng"); l != "" {
		val, err := strconv.ParseFloat(l, 64)
		if err == nil {
			lng = val
		}
	}
	if h := c.Query("hour"); h != "" {
		val, err := strconv.Atoi(h)
		if err == nil && val >= 0 && val <= 23 {
			hour = val
		}
	}
	if l := c.Query("limit"); l != "" {
		val, err := strconv.Atoi(l)
		if err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	timeSlot := time.Date(2026, 2, 25, hour, 0, 0, 0, time.UTC)
	timeSlot = time.Date(timeSlot.Year(), timeSlot.Month(), timeSlot.Day(), hour, 0, 0, 0, time.UTC)

	var userID int32
	if uID, ok := middleware.GetUserID(c); ok {
		userID = uID
	}

	req := recommend.ScoreRequest{
		UserID:   userID,
		UserLat:  lat,
		UserLng:  lng,
		TimeSlot: timeSlot,
		Limit:    limit,
	}

	scored, err := h.recommend.Recommend(c.Request.Context(), req)
	if err != nil {
		handleError(c, err)
		return
	}

	result := map[string]interface{}{
		"algorithm": h.recommend.GetScorerName(),
		"results":   scored,
	}

	response.OK(c, result)
}

// --- helpers ---

// parseID extracts and validates an int32 path parameter.
func parseID(c *gin.Context, param string) (int32, error) {
	raw := c.Param(param)
	val, err := strconv.Atoi(raw)
	if err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Invalid "+param)
		return 0, err
	}
	return int32(val), nil
}

// handleError maps AppError to the standard JSON response.
func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "An unexpected error occurred")
}
