package station

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

const (
	greenStart = 23
	greenEnd   = 6
)

// Service handles station business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new station service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// loadStatus returns "GREEN", "YELLOW", or "RED" based on the load value.
func loadStatus(load int32) string {
	if load > 65 {
		return "RED"
	}
	if load > 45 {
		return "YELLOW"
	}
	return "GREEN"
}

// isGreenHour returns true if the hour falls in the green window (23:00–06:00).
func isGreenHour(hour int32) bool {
	return hour >= greenStart || hour <= greenEnd
}

// ListStations returns all stations with density-based load status.
func (s *Service) ListStations(ctx context.Context) ([]StationListItem, error) {
	rows, err := s.queries.ListStations(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	items := make([]StationListItem, len(rows))
	for i, r := range rows {
		item := StationListItem{
			ID:            r.ID,
			Name:          r.Name,
			Lat:           r.Lat,
			Lng:           r.Lng,
			Price:         math.Round(r.Price*100) / 100,
			MockLoad:      r.Density,
			MockStatus:    loadStatus(r.Density),
			NextGreenHour: "23:00",
		}
		if r.OwnerID.Valid {
			id := r.OwnerID.Int32
			item.OwnerID = &id
		}
		if r.OwnerName.Valid {
			name := r.OwnerName.String
			item.OwnerName = &name
		}
		items[i] = item
	}
	return items, nil
}

// GetStation returns a station detail with 24h timeslots, campaign discount stacking,
// and forecast-based load data.
func (s *Service) GetStation(ctx context.Context, stationID int32) (*StationDetailResponse, error) {
	station, err := s.queries.GetStationByID(ctx, stationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	// Fetch active campaigns for this station (station-specific + global)
	campaigns, err := s.queries.GetActiveCampaignsForStation(ctx, pgtype.Int4{Int32: stationID, Valid: true})
	if err != nil {
		campaigns = []generated.Campaign{}
	}

	// Use the most recent active campaign
	var activeCampaign *generated.Campaign
	var campaignDiscountRate float64
	if len(campaigns) > 0 {
		activeCampaign = &campaigns[0]
		campaignDiscountRate = parseDiscountRate(activeCampaign.Discount)
	}

	// Get the current day of week (0=Monday in our DB convention)
	now := time.Now()
	// Go: Sunday=0, Monday=1, ..., Saturday=6
	// DB:  Monday=0, Tuesday=1, ..., Sunday=6
	dayOfWeek := int32((int(now.Weekday()) + 6) % 7)

	// Build 24 hourly slots
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	slots := make([]TimeSlot, 24)

	for hour := int32(0); hour < 24; hour++ {
		slotTime := today.Add(time.Duration(hour) * time.Hour)
		green := isGreenHour(hour)

		// Base price and coins
		price := station.Price
		coins := int32(10)
		if green {
			price *= 0.8 // 20% green discount
			coins = 50
		}

		// Campaign discount stacking
		if campaignDiscountRate > 0 {
			price *= (1 - campaignDiscountRate)
		}

		// Campaign coin reward
		if activeCampaign != nil && activeCampaign.CoinReward > 0 {
			coins += activeCampaign.CoinReward
		}

		// Get forecast-based load for this hour
		load := station.Density // fallback to current density
		forecastLoad, fErr := s.queries.GetForecastForStation(ctx, generated.GetForecastForStationParams{
			StationID: stationID,
			DayOfWeek: dayOfWeek,
			Hour:      hour,
		})
		if fErr == nil {
			load = forecastLoad
		}

		status := loadStatus(load)

		var campaignApplied *CampaignApplied
		if activeCampaign != nil {
			campaignApplied = &CampaignApplied{
				Title:    activeCampaign.Title,
				Discount: activeCampaign.Discount,
			}
		}

		slots[hour] = TimeSlot{
			Hour:            hour,
			Label:           fmt.Sprintf("%02d:00", hour),
			StartTime:       slotTime.UTC().Format(time.RFC3339),
			IsGreen:         green,
			Coins:           coins,
			Price:           math.Round(price*100) / 100,
			Status:          status,
			Load:            load,
			CampaignApplied: campaignApplied,
		}
	}

	// Build response
	resp := &StationDetailResponse{
		ID:             station.ID,
		Name:           station.Name,
		Lat:            station.Lat,
		Lng:            station.Lng,
		Price:          station.Price,
		Density:        station.Density,
		DensityProfile: station.DensityProfile,
		Slots:          slots,
	}

	if station.Address.Valid {
		resp.Address = &station.Address.String
	}

	if activeCampaign != nil {
		summary := &CampaignSummary{
			ID:          activeCampaign.ID,
			Title:       activeCampaign.Title,
			Description: activeCampaign.Description,
			Discount:    activeCampaign.Discount,
			CoinReward:  activeCampaign.CoinReward,
		}
		if activeCampaign.StationID.Valid {
			sid := activeCampaign.StationID.Int32
			summary.StationID = &sid
		}
		resp.ActiveCampaign = summary
	}

	return resp, nil
}

// CreateStation creates a new station.
func (s *Service) CreateStation(ctx context.Context, ownerID int32, req CreateStationRequest) (*StationResponse, error) {
	params := generated.CreateStationParams{
		Name:           req.Name,
		Lat:            req.Latitude,
		Lng:            req.Longitude,
		Price:          req.Price,
		OwnerID:        pgtype.Int4{Int32: ownerID, Valid: true},
		DensityProfile: "NORMAL",
	}
	if req.Address != "" {
		params.Address = pgtype.Text{String: req.Address, Valid: true}
	}

	station, err := s.queries.CreateStation(ctx, params)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return stationToResponse(station), nil
}

// UpdateStation updates an existing station.
func (s *Service) UpdateStation(ctx context.Context, stationID int32, req UpdateStationRequest) (*StationResponse, error) {
	// Verify station exists
	_, err := s.queries.GetStationByID(ctx, stationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	params := generated.UpdateStationParams{
		ID:    stationID,
		Name:  req.Name,
		Lat:   req.Latitude,
		Lng:   req.Longitude,
		Price: req.Price,
	}
	if req.Address != "" {
		params.Address = pgtype.Text{String: req.Address, Valid: true}
	}

	station, err := s.queries.UpdateStation(ctx, params)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return stationToResponse(station), nil
}

// GetForecasts returns density forecasts for all stations at a given day/hour.
func (s *Service) GetForecasts(ctx context.Context, dayOfWeek, hour int32) (*ForecastResponse, error) {
	rows, err := s.queries.GetForecastsByDayHour(ctx, generated.GetForecastsByDayHourParams{
		DayOfWeek: dayOfWeek,
		Hour:      hour,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	items := make([]ForecastItem, len(rows))
	for i, r := range rows {
		item := ForecastItem{
			StationID:      r.StationID,
			StationName:    r.StationName,
			Lat:            r.Lat,
			Lng:            r.Lng,
			Price:          r.Price,
			DensityProfile: r.DensityProfile,
			PredictedLoad:  r.PredictedLoad,
			DayOfWeek:      r.DayOfWeek,
			Hour:           r.Hour,
		}
		if r.Address.Valid {
			item.Address = &r.Address.String
		}
		items[i] = item
	}

	return &ForecastResponse{
		CurrentTime: ForecastTime{DayOfWeek: dayOfWeek, Hour: hour},
		Forecasts:   items,
	}, nil
}

// --- helpers ---

// parseDiscountRate parses a discount string like "%20" into 0.20.
func parseDiscountRate(discount string) float64 {
	cleaned := strings.ReplaceAll(discount, "%", "")
	cleaned = strings.TrimSpace(cleaned)
	val, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return val / 100
}

// stationToResponse converts a generated.Station to a StationResponse.
func stationToResponse(st generated.Station) *StationResponse {
	resp := &StationResponse{
		ID:             st.ID,
		Name:           st.Name,
		Lat:            st.Lat,
		Lng:            st.Lng,
		Price:          st.Price,
		Density:        st.Density,
		DensityProfile: st.DensityProfile,
	}
	if st.Address.Valid {
		resp.Address = &st.Address.String
	}
	return resp
}
