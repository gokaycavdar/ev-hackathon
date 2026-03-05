package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/ai"
	"smartcharge-api/internal/config"
	apperrors "smartcharge-api/internal/errors"
	"smartcharge-api/internal/reservation"
)

// Service handles chat business logic with AI.
type Service struct {
	queries        *generated.Queries
	reservationSvc *reservation.Service
	provider       ai.Provider
	systemPrompt   string
}

// NewService creates a new chat service.
func NewService(queries *generated.Queries, reservationSvc *reservation.Service, cfg *config.Config) *Service {
	provider := ai.NewOllamaProvider(cfg.LLMURL, cfg.LLMModel)

	return &Service{
		queries:        queries,
		reservationSvc: reservationSvc,
		provider:       provider,
		systemPrompt:   buildSystemPrompt(),
	}
}

// RecommendationResponse is a station recommendation from the AI.
type RecommendationResponse struct {
	ID      int32  `json:"id"`
	Name    string `json:"name"`
	Hour    string `json:"hour"`
	Coins   int32  `json:"coins"`
	Reason  string `json:"reason"`
	IsGreen bool   `json:"isGreen"`
}

// Action represents an action to take based on user intent.
type Action struct {
	Type        string                     `json:"type"` // "create_reservation", "none"
	StationID   *int32                     `json:"stationId,omitempty"`
	Date        string                     `json:"date,omitempty"`
	Hour        string                     `json:"hour,omitempty"`
	IsGreen     *bool                      `json:"isGreen,omitempty"`
	Success     bool                       `json:"success"`
	Message     string                     `json:"message,omitempty"`
	Reservation *ReservationActionResponse `json:"reservation,omitempty"`
}

type ReservationActionResponse struct {
	ID          int32  `json:"id"`
	StationID   int32  `json:"stationId"`
	Date        string `json:"date"`
	Hour        string `json:"hour"`
	EarnedCoins int32  `json:"earnedCoins"`
	Status      string `json:"status"`
}

// ChatResponse is the response from the chat endpoint.
type ChatResponse struct {
	Role            string                   `json:"role"`
	Content         string                   `json:"content"`
	Recommendations []RecommendationResponse `json:"recommendations,omitempty"`
	Action          *Action                  `json:"action,omitempty"`
}

// Chat processes a chat message using AI.
func (s *Service) Chat(ctx context.Context, userMessage string, stationID *int32, date string, hour string, isGreen *bool) (*ChatResponse, error) {
	stations, err := s.queries.ListStations(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	stationContext := buildStationContext(stations)

	messages := []ai.Message{
		{Role: ai.RoleSystem, Content: s.systemPrompt},
		{Role: ai.RoleUser, Content: userMessage + "\n\n" + stationContext},
	}

	llmResp, err := s.provider.Complete(ctx, messages,
		ai.WithTemperature(0.7),
		ai.WithMaxTokens(800),
	)
	if err != nil {
		return &ChatResponse{
			Role:    "bot",
			Content: "Üzgünüm, şu anda AI servisine bağlanamıyorum. Lütfen daha sonra tekrar dene.",
		}, nil
	}

	content := llmResp.Content

	action, content, err := parseAction(content)
	if err != nil {
		return &ChatResponse{
			Role:    "bot",
			Content: content,
		}, nil
	}

	if action.Type == "create_reservation" && action.StationID != nil {
		reservationResp, err := s.createReservationFromAction(ctx, action)
		if err != nil {
			action.Success = false
			action.Message = "Randevu oluşturulamadı: " + err.Error()
		} else {
			action.Success = true
			action.Message = "Randevun başarıyla oluşturuldu!"
			action.Reservation = &ReservationActionResponse{
				ID:          reservationResp.ID,
				StationID:   reservationResp.StationID,
				Date:        reservationResp.Date,
				Hour:        reservationResp.Hour,
				EarnedCoins: reservationResp.EarnedCoins,
				Status:      reservationResp.Status,
			}
			content = fmt.Sprintf("Randevun başarıyla oluşturuldu! 🎉\n\n%s", content)
		}
	}

	return &ChatResponse{
		Role:    "bot",
		Content: content,
		Action:  action,
	}, nil
}

func (s *Service) createReservationFromAction(ctx context.Context, action *Action) (*reservation.ReservationResponse, error) {
	if action.StationID == nil {
		return nil, fmt.Errorf("station ID is required")
	}

	dateStr := action.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	hourStr := action.Hour
	if hourStr == "" {
		hourStr = "20:00"
	}

	isGreen := false
	if action.IsGreen != nil {
		isGreen = *action.IsGreen
	}

	req := reservation.CreateReservationRequest{
		StationID: *action.StationID,
		Date:      dateStr,
		Hour:      hourStr,
		IsGreen:   isGreen,
	}

	return s.reservationSvc.Create(ctx, 0, req)
}

func buildSystemPrompt() string {
	return "Sen SmartCharge'un yapay zeka asistanısın. EV sahiplerine şarj istasyonları hakkında yardımcı oluyorsun.\n\n" +
		"YETENEKLERİN:\n" +
		"1. Şarj istasyonu önerme: Kullanıcının ihtiyaçlarına göre en uygun istasyonları önerebilirsin\n" +
		"2. Randevu oluşturma: Kullanıcı randevu oluşturmak isterse, aşağıdaki JSON formatında bir action döndürmen gerekir\n\n" +
		"KURALLAR:\n" +
		"- Her zaman Türkçe yanıt ver\n" +
		"- Yanıtında JSON formatında bir \"action\" objesi döndür\n" +
		"- Eğer kullanıcı randevu oluşturmak İSTEMİYORSA, action.type = \"none\" olmalı\n" +
		"- Eğer kullanıcı randevu oluşturmak İSTİYORSA, action.type = \"create_reservation\" ve gerekli bilgileri doldur\n\n" +
		"ACTION JSON FORMATI:\n" +
		"```json\n" +
		"{\n" +
		"  \"type\": \"create_reservation\" veya \"none\",\n" +
		"  \"stationId\": (opsiyonel, istasyon ID),\n" +
		"  \"date\": (opsiyonel, YYYY-MM-DD formatında tarih),\n" +
		"  \"hour\": (opsiyonel, HH:MM formatında saat),\n" +
		"  \"isGreen\": (opsiyonel, yeşil enerji tercihi)\n" +
		"}\n" +
		"```\n\n" +
		"ÖRNEKLER:\n" +
		"- Kullanıcı: \"Yarın saat 20:00'de Kadıköy Şarj istasyonunda randevu istiyorum\"\n" +
		"  -> action: {\"type\": \"create_reservation\", \"stationId\": 1, \"date\": \"2026-03-05\", \"hour\": \"20:00\", \"isGreen\": false}\n\n" +
		"- Kullanıcı: \"En yakın şarj istasyonunu öner\"\n" +
		"  -> action: {\"type\": \"none\"}\n\n" +
		"ÖNEMLİ: Yanıtının sonunda mutlaka geçerli bir JSON action objesi olmalı. Yanıtını bu formatta bitir: [ACTION]...[/ACTION]"
}

func buildStationContext(stations []generated.ListStationsRow) string {
	var sb strings.Builder
	sb.WriteString("\n\nMEVCUT İSTASYONLAR:\n")

	limit := 10
	if len(stations) < limit {
		limit = len(stations)
	}

	for i := 0; i < limit; i++ {
		st := stations[i]
		sb.WriteString(fmt.Sprintf("- ID: %d, İsim: %s, Fiyat: %.2f TL/kWh\n",
			st.ID, st.Name, st.Price))
	}

	sb.WriteString("\nİstasyon ID'lerini yukarıdaki listeden al.")
	return sb.String()
}

func parseAction(content string) (*Action, string, error) {
	action := &Action{Type: "none"}

	start := strings.Index(content, "[ACTION]")
	end := strings.Index(content, "[/ACTION]")

	if start == -1 || end == -1 {
		cleanContent := strings.TrimSpace(content)
		return action, cleanContent, nil
	}

	jsonStr := content[start+8 : end]
	jsonStr = strings.TrimSpace(jsonStr)

	if err := json.Unmarshal([]byte(jsonStr), action); err != nil {
		cleanContent := strings.TrimSpace(content[:start])
		return action, cleanContent, nil
	}

	cleanContent := strings.TrimSpace(content[:start])
	return action, cleanContent, nil
}
