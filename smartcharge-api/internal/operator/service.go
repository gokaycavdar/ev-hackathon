package operator

import (
	"context"
	"math"

	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles operator business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new operator service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// densityStatus returns a status string based on density thresholds.
func densityStatus(density int32) string {
	if density < 43 {
		return "GREEN"
	}
	if density < 69 {
		return "YELLOW"
	}
	return "RED"
}

// roundTo2 rounds a float to 2 decimal places.
func roundTo2(v float64) float64 {
	return math.Round(v*100) / 100
}

// ListMyStations returns all stations owned by the user with per-station and aggregate stats.
func (s *Service) ListMyStations(ctx context.Context, ownerID int32) (*MyStationsResponse, error) {
	rows, err := s.queries.ListStationsByOwner(ctx, pgtype.Int4{Int32: ownerID, Valid: true})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	stations := make([]StationSummary, 0, len(rows))
	var totalRevenue float64
	var totalReservations int32
	var totalGreen int32
	var totalLoad int32

	for _, row := range rows {
		// Get reservation stats for this station
		stats, err := s.queries.GetStationReservationStats(ctx, row.ID)
		if err != nil {
			stats = generated.GetStationReservationStatsRow{}
		}

		// Get revenue for this station
		revenue, err := s.queries.GetStationRevenue(ctx, row.ID)
		if err != nil {
			revenue = 0
		}

		var address *string
		if row.Address.Valid {
			address = &row.Address.String
		}

		stations = append(stations, StationSummary{
			ID:                    row.ID,
			Name:                  row.Name,
			Lat:                   row.Lat,
			Lng:                   row.Lng,
			Address:               address,
			Price:                 roundTo2(row.Price),
			Load:                  row.Density,
			Status:                densityStatus(row.Density),
			ReservationCount:      stats.TotalReservations,
			GreenReservationCount: stats.GreenReservations,
			Revenue:               roundTo2(revenue),
		})

		totalRevenue += revenue
		totalReservations += stats.TotalReservations
		totalGreen += stats.GreenReservations
		totalLoad += row.Density
	}

	var greenShare float64
	if totalReservations > 0 {
		greenShare = roundTo2(float64(totalGreen) / float64(totalReservations) * 100)
	}

	var avgLoad int32
	if len(stations) > 0 {
		avgLoad = int32(math.Round(float64(totalLoad) / float64(len(stations))))
	}

	return &MyStationsResponse{
		Stats: AggregateStats{
			TotalRevenue:      roundTo2(totalRevenue),
			TotalReservations: totalReservations,
			GreenShare:        greenShare,
			AvgLoad:           avgLoad,
		},
		Stations: stations,
	}, nil
}

// CreateStation creates a new station for the operator.
func (s *Service) CreateStation(ctx context.Context, ownerID int32, req CreateStationRequest) (*StationResponse, error) {
	var address pgtype.Text
	if req.Address != nil {
		address = pgtype.Text{String: *req.Address, Valid: true}
	}

	station, err := s.queries.CreateStation(ctx, generated.CreateStationParams{
		Name:           req.Name,
		Lat:            req.Lat,
		Lng:            req.Lng,
		Address:        address,
		Price:          req.Price,
		OwnerID:        pgtype.Int4{Int32: ownerID, Valid: true},
		DensityProfile: "flat",
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return stationToResponse(station), nil
}

// UpdateStation updates an operator's station.
// Verifies that the station belongs to the requesting operator.
func (s *Service) UpdateStation(ctx context.Context, ownerID int32, stationID int32, req UpdateStationRequest) (*StationResponse, error) {
	// Verify station exists
	existing, err := s.queries.GetStationByID(ctx, stationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	// Ownership check
	if !existing.OwnerID.Valid || existing.OwnerID.Int32 != ownerID {
		return nil, apperrors.NewForbiddenError("Bu istasyon size ait degil")
	}

	// Build update params with fallback to existing values
	name := existing.Name
	if req.Name != nil {
		name = *req.Name
	}

	lat := existing.Lat
	if req.Lat != nil {
		lat = *req.Lat
	}

	lng := existing.Lng
	if req.Lng != nil {
		lng = *req.Lng
	}

	address := existing.Address
	if req.Address != nil {
		address = pgtype.Text{String: *req.Address, Valid: true}
	}

	price := existing.Price
	if req.Price != nil {
		price = *req.Price
	}

	updated, err := s.queries.UpdateStation(ctx, generated.UpdateStationParams{
		ID:      stationID,
		Name:    name,
		Lat:     lat,
		Lng:     lng,
		Address: address,
		Price:   price,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return stationToResponse(updated), nil
}

// DeleteStation deletes an operator's station.
// Verifies that the station belongs to the requesting operator.
func (s *Service) DeleteStation(ctx context.Context, ownerID int32, stationID int32) error {
	existing, err := s.queries.GetStationByID(ctx, stationID)
	if err != nil {
		return apperrors.NewNotFoundError("Station")
	}

	// Ownership check
	if !existing.OwnerID.Valid || existing.OwnerID.Int32 != ownerID {
		return apperrors.NewForbiddenError("Bu istasyon size ait degil")
	}

	if err := s.queries.DeleteStation(ctx, stationID); err != nil {
		return &apperrors.AppError{StatusCode: 500, Code: "DELETE_FAILED", Message: "Could not delete station. It may have linked reservations."}
	}
	return nil
}

// --- helpers ---

func stationToResponse(s generated.Station) *StationResponse {
	var address *string
	if s.Address.Valid {
		address = &s.Address.String
	}

	return &StationResponse{
		ID:      s.ID,
		Name:    s.Name,
		Lat:     s.Lat,
		Lng:     s.Lng,
		Address: address,
		Price:   roundTo2(s.Price),
		Density: s.Density,
	}
}
