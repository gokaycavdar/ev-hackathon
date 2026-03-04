package chat

import (
	"github.com/gin-gonic/gin"

	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/response"
)

// ChatRequest is the request body for the chat endpoint.
type ChatRequest struct {
	Message   string `json:"message" binding:"required"`
	StationID *int32 `json:"stationId,omitempty"`
	Date      string `json:"date,omitempty"`
	Hour      string `json:"hour,omitempty"`
	IsGreen   *bool  `json:"isGreen,omitempty"`
}

// Handler handles HTTP requests for the chat endpoint.
type Handler struct {
	service *Service
}

// NewHandler creates a new chat handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes registers chat routes on the given router group.
func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/chat", h.Chat)
}

// Chat handles POST /v1/chat.
func (h *Handler) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Err(c, 400, "VALIDATION_ERROR", "Mesaj alanı zorunludur")
		return
	}

	result, err := h.service.Chat(c.Request.Context(), req.Message, req.StationID, req.Date, req.Hour, req.IsGreen)
	if err != nil {
		handleError(c, err)
		return
	}
	response.OK(c, result)
}

// --- helpers ---

func handleError(c *gin.Context, err error) {
	if appErr, ok := err.(*apperrors.AppError); ok {
		response.Err(c, appErr.StatusCode, appErr.Code, appErr.Message)
		return
	}
	response.Err(c, 500, "INTERNAL_ERROR", "AI servisi şu an yanıt veremiyor.")
}
