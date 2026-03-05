package reservation

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/badge"
	apperrors "smartcharge-api/internal/errors"
)

const (
	greenStart = 23
	greenEnd   = 6
)

// Reservation status constants.
const (
	StatusPending   = "PENDING"
	StatusConfirmed = "CONFIRMED"
	StatusCharging  = "CHARGING"
	StatusCompleted = "COMPLETED"
	StatusCancelled = "CANCELLED"
	StatusFailed    = "FAILED"
)

// validTransitions defines the full state machine.
//
//	PENDING   -> CONFIRMED | CANCELLED
//	CONFIRMED -> CHARGING  | CANCELLED
//	CHARGING  -> COMPLETED | FAILED | CANCELLED
//
// COMPLETED, CANCELLED, and FAILED are terminal states.
var validTransitions = map[string][]string{
	StatusPending:   {StatusConfirmed, StatusCancelled},
	StatusConfirmed: {StatusCharging, StatusCancelled},
	StatusCharging:  {StatusCompleted, StatusFailed, StatusCancelled},
}

// isGreenHour returns true if the hour falls in the green window (23:00–06:00).
func isGreenHour(hour int32) bool {
	return hour >= greenStart || hour <= greenEnd
}

// parseHourFromString parses "14:00" -> 14.
func parseHourFromString(hourStr string) (int32, error) {
	parts := strings.SplitN(hourStr, ":", 2)
	if len(parts) == 0 {
		return 0, fmt.Errorf("invalid hour format: %s", hourStr)
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid hour format: %s", hourStr)
	}
	if h < 0 || h > 23 {
		return 0, fmt.Errorf("hour out of range: %d", h)
	}
	return int32(h), nil
}

// validateTransition checks if moving from one status to another is allowed.
func validateTransition(from, to string) error {
	allowed, ok := validTransitions[from]
	if !ok {
		return apperrors.NewValidationError(fmt.Sprintf("Gecersiz mevcut durum: %s", from))
	}
	for _, s := range allowed {
		if s == to {
			return nil
		}
	}
	return apperrors.NewValidationError(
		fmt.Sprintf("%s durumundan %s durumuna gecilemez", from, to),
	)
}

// isTerminalStatus returns true if the status is a terminal state (no further transitions).
func isTerminalStatus(status string) bool {
	return status == StatusCompleted || status == StatusCancelled || status == StatusFailed
}

// Service handles reservation business logic.
type Service struct {
	queries        *generated.Queries
	pool           *pgxpool.Pool
	badgeEvaluator *badge.Evaluator
}

// NewService creates a new reservation service.
func NewService(queries *generated.Queries, pool *pgxpool.Pool, badgeEvaluator *badge.Evaluator) *Service {
	return &Service{queries: queries, pool: pool, badgeEvaluator: badgeEvaluator}
}

// Create creates a new reservation with campaign coin bonus applied.
// Server-side isGreen validation: the client-sent isGreen is ignored,
// the server computes it from the submitted hour.
func (s *Service) Create(ctx context.Context, userID int32, req CreateReservationRequest) (*ReservationResponse, error) {
	// Parse date
	reservationDate, err := time.Parse(time.RFC3339, req.Date)
	if err != nil {
		// Try date-only format as fallback
		reservationDate, err = time.Parse("2006-01-02", req.Date)
		if err != nil {
			return nil, apperrors.NewValidationError("Invalid date format")
		}
	}

	// Server-side isGreen validation: compute from hour, ignore client value
	hour, err := parseHourFromString(req.Hour)
	if err != nil {
		return nil, apperrors.NewValidationError("Invalid hour format. Use HH:00")
	}
	computedIsGreen := isGreenHour(hour)

	// Capacity check: verify station has available slots for this date+hour
	station, err := s.queries.GetStationByID(ctx, req.StationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Station")
	}

	activeCount, err := s.queries.CountActiveReservations(ctx, generated.CountActiveReservationsParams{
		StationID: req.StationID,
		Column2: pgtype.Date{
			Time:  reservationDate,
			Valid: true,
		},
		Hour: req.Hour,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	if activeCount >= station.Capacity {
		return nil, apperrors.NewValidationError("Bu saat dilimi dolu")
	}

	// Check for active campaigns to apply bonus coins
	campaigns, err := s.queries.GetActiveCampaignsForStation(ctx, pgtype.Int4{Int32: req.StationID, Valid: true})
	if err != nil {
		campaigns = []generated.Campaign{}
	}

	earnedCoins := int32(10)
	if computedIsGreen {
		earnedCoins = 50
	}

	// Apply campaign coin reward from the most recent active campaign
	if len(campaigns) > 0 && campaigns[0].CoinReward > 0 {
		earnedCoins += campaigns[0].CoinReward
	}

	reservation, err := s.queries.CreateReservation(ctx, generated.CreateReservationParams{
		UserID:    userID,
		StationID: req.StationID,
		Date: pgtype.Timestamptz{
			Time:  reservationDate,
			Valid: true,
		},
		Hour:        req.Hour,
		IsGreen:     computedIsGreen,
		EarnedCoins: earnedCoins,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(reservation), nil
}

// Confirm transitions a PENDING reservation to CONFIRMED.
// Verifies ownership.
func (s *Service) Confirm(ctx context.Context, reservationID int32, userID int32) (*ReservationResponse, error) {
	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if existing.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if err := validateTransition(existing.Status, StatusConfirmed); err != nil {
		return nil, err
	}

	updated, err := s.queries.ConfirmReservation(ctx, reservationID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(updated), nil
}

// StartCharging transitions a CONFIRMED reservation to CHARGING.
// Verifies ownership.
func (s *Service) StartCharging(ctx context.Context, reservationID int32, userID int32) (*ReservationResponse, error) {
	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if existing.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if err := validateTransition(existing.Status, StatusCharging); err != nil {
		return nil, err
	}

	updated, err := s.queries.StartCharging(ctx, reservationID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return reservationToResponse(updated), nil
}

// UpdateStatus updates a reservation's status (e.g. CANCELLED).
// Verifies that the authenticated user owns the reservation and validates the status transition.
func (s *Service) UpdateStatus(ctx context.Context, reservationID int32, userID int32, req UpdateStatusRequest) error {
	// Verify reservation exists
	existing, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return apperrors.NewNotFoundError("Reservation")
	}

	// Ownership check
	if existing.UserID != userID {
		return apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	// Don't allow updating terminal states
	if isTerminalStatus(existing.Status) {
		return apperrors.NewValidationError(
			fmt.Sprintf("Rezervasyon zaten %s durumunda, degistirilemez", existing.Status),
		)
	}

	// Validate status transition
	if err := validateTransition(existing.Status, req.Status); err != nil {
		return err
	}

	_, err = s.queries.UpdateReservationStatus(ctx, generated.UpdateReservationStatusParams{
		ID:     reservationID,
		Status: req.Status,
	})
	if err != nil {
		return apperrors.ErrInternal
	}

	return nil
}

// Complete atomically completes a reservation and awards the user coins, XP, and CO2.
// The reservation must be in CHARGING status.
// Verifies that the authenticated user owns the reservation.
func (s *Service) Complete(ctx context.Context, reservationID int32, userID int32) (*CompleteResponse, error) {
	// Get reservation
	reservation, err := s.queries.GetReservationByID(ctx, reservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	// Ownership check
	if reservation.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if reservation.Status == StatusCompleted {
		return nil, apperrors.ErrAlreadyCompleted
	}

	// Validate status transition: only CHARGING -> COMPLETED
	if err := validateTransition(reservation.Status, StatusCompleted); err != nil {
		return nil, err
	}

	// Use stored reservation values — never allow client override
	earnedCoins := reservation.EarnedCoins
	xpDelta := int32(100)

	co2Delta := 0.5
	if reservation.IsGreen {
		co2Delta = 2.5
	}

	// Begin transaction
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, apperrors.ErrInternal
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// 1. Complete reservation (now includes saved_co2 and completed_at)
	updatedReservation, err := qtx.CompleteReservation(ctx, generated.CompleteReservationParams{
		ID:          reservationID,
		EarnedCoins: earnedCoins,
		SavedCo2:    co2Delta,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// 2. Update user stats
	updatedUser, err := qtx.UpdateUserStats(ctx, generated.UpdateUserStatsParams{
		ID:       reservation.UserID,
		Coins:    earnedCoins,
		Co2Saved: co2Delta,
		Xp:       xpDelta,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// 3. Evaluate badges (inside the transaction)
	var awardedBadges []badge.AwardedBadge
	if s.badgeEvaluator != nil {
		// Parse hour from reservation
		hour, hErr := parseHourFromString(reservation.Hour)
		if hErr != nil {
			log.Printf("reservation complete: failed to parse hour for badge eval: %v", hErr)
			hour = 0
		}

		// Parse date for day of week
		var dayOfWeek int32
		if reservation.Date.Valid {
			dayOfWeek = int32(reservation.Date.Time.Weekday())
		}

		// Get station for density profile
		stn, sErr := qtx.GetStationByID(ctx, reservation.StationID)
		densityProfile := ""
		if sErr != nil {
			log.Printf("reservation complete: failed to get station %d for badge eval: %v", reservation.StationID, sErr)
		} else {
			densityProfile = stn.DensityProfile
		}

		event := badge.Event{
			UserID:         reservation.UserID,
			StationID:      reservation.StationID,
			IsGreen:        reservation.IsGreen,
			Hour:           hour,
			DayOfWeek:      dayOfWeek,
			DensityProfile: densityProfile,
		}

		awarded, bErr := s.badgeEvaluator.Evaluate(ctx, qtx, event)
		if bErr != nil {
			log.Printf("reservation complete: badge evaluation failed (non-fatal): %v", bErr)
			// Non-fatal: don't fail the reservation completion if badge eval fails
		} else {
			awardedBadges = awarded
		}
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.ErrInternal
	}

	return &CompleteResponse{
		Reservation: *reservationToResponse(updatedReservation),
		User: UserStatsResponse{
			ID:       updatedUser.ID,
			Coins:    updatedUser.Coins,
			Co2Saved: updatedUser.Co2Saved,
			XP:       updatedUser.Xp,
		},
		AwardedBadges: awardedBadges,
	}, nil
}

// --- helpers ---

func reservationToResponse(r generated.Reservation) *ReservationResponse {
	dateStr := ""
	if r.Date.Valid {
		dateStr = r.Date.Time.UTC().Format(time.RFC3339)
	}

	resp := &ReservationResponse{
		ID:          r.ID,
		UserID:      r.UserID,
		StationID:   r.StationID,
		Date:        dateStr,
		Hour:        r.Hour,
		IsGreen:     r.IsGreen,
		EarnedCoins: r.EarnedCoins,
		SavedCo2:    r.SavedCo2,
		Status:      r.Status,
	}

	if r.ConfirmedAt.Valid {
		s := r.ConfirmedAt.Time.UTC().Format(time.RFC3339)
		resp.ConfirmedAt = &s
	}
	if r.StartedAt.Valid {
		s := r.StartedAt.Time.UTC().Format(time.RFC3339)
		resp.StartedAt = &s
	}
	if r.CompletedAt.Valid {
		s := r.CompletedAt.Time.UTC().Format(time.RFC3339)
		resp.CompletedAt = &s
	}

	return resp
}
