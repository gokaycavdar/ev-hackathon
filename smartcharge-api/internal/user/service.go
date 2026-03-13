package user

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles user business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new user service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// GetProfile returns a user's full profile with badges, stations, and recent reservations.
func (s *Service) GetProfile(ctx context.Context, userID int32) (*ProfileResponse, error) {
	user, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("User")
	}

	// Fetch badges (earned only -- backward compatible)
	badges, err := s.queries.GetUserBadges(ctx, userID)
	if err != nil {
		badges = []generated.Badge{}
	}

	// Fetch all badges with progress (earned + unearned)
	badgesWithProgress, err := s.queries.GetBadgesWithProgress(ctx, userID)
	if err != nil {
		badgesWithProgress = []generated.GetBadgesWithProgressRow{}
	}

	// Fetch stations
	stations, err := s.queries.GetUserStations(ctx, pgtype.Int4{Int32: userID, Valid: true})
	if err != nil {
		stations = []generated.GetUserStationsRow{}
	}

	// Fetch last 10 reservations
	reservations, err := s.queries.GetUserReservations(ctx, generated.GetUserReservationsParams{
		UserID: userID,
		Limit:  10,
	})
	if err != nil {
		reservations = []generated.GetUserReservationsRow{}
	}

	// Map badges (earned only)
	badgeItems := make([]BadgeItem, len(badges))
	for i, b := range badges {
		badgeItems[i] = BadgeItem{ID: b.ID, Name: b.Name, Description: b.Description, Icon: b.Icon}
	}

	// Map all badges with progress
	allBadgeItems := make([]BadgeProgressItem, len(badgesWithProgress))
	for i, bp := range badgesWithProgress {
		var earnedAt *string
		if bp.EarnedAt.Valid {
			s := bp.EarnedAt.Time.UTC().Format(time.RFC3339)
			earnedAt = &s
		}
		allBadgeItems[i] = BadgeProgressItem{
			ID:           bp.ID,
			Name:         bp.Name,
			Description:  bp.Description,
			Icon:         bp.Icon,
			Metric:       bp.Metric,
			Threshold:    bp.Threshold,
			CurrentCount: bp.CurrentCount,
			Earned:       bp.Earned,
			EarnedAt:     earnedAt,
		}
	}

	// Map stations
	stationItems := make([]StationItem, len(stations))
	for i, st := range stations {
		stationItems[i] = StationItem{ID: st.ID, Name: st.Name, Price: st.Price, Lat: st.Lat, Lng: st.Lng}
	}

	// Map reservations
	reservationItems := make([]ReservationItem, len(reservations))
	for i, r := range reservations {
		dateStr := ""
		if r.Date.Valid {
			dateStr = r.Date.Time.UTC().Format(time.RFC3339)
		}

		item := ReservationItem{
			ID:          r.ID,
			Date:        dateStr,
			Hour:        r.Hour,
			IsGreen:     r.IsGreen,
			EarnedCoins: r.EarnedCoins,
			Status:      r.Status,
			Station: ReservationStation{
				ID:    r.StationID,
				Name:  r.StationName,
				Price: r.StationPrice,
			},
		}

		if r.ConfirmedAt.Valid {
			s := r.ConfirmedAt.Time.UTC().Format(time.RFC3339)
			item.ConfirmedAt = &s
		}
		if r.StartedAt.Valid {
			s := r.StartedAt.Time.UTC().Format(time.RFC3339)
			item.StartedAt = &s
		}
		if r.CompletedAt.Valid {
			s := r.CompletedAt.Time.UTC().Format(time.RFC3339)
			item.CompletedAt = &s
		}

		reservationItems[i] = item
	}

	// Fetch reviewed reservation IDs
	reviewedIDs, err := s.queries.GetUserReviewedReservationIDs(ctx, userID)
	if err != nil {
		reviewedIDs = []int32{}
	}

	return &ProfileResponse{
		ID:                     user.ID,
		Name:                   user.Name,
		Email:                  user.Email,
		Role:                   user.Role,
		Coins:                  user.Coins,
		Co2Saved:               user.Co2Saved,
		XP:                     user.Xp,
		Badges:                 badgeItems,
		AllBadges:              allBadgeItems,
		Stations:               stationItems,
		Reservations:           reservationItems,
		ReviewedReservationIDs: reviewedIDs,
	}, nil
}

// UpdateProfile updates a user's name and email.
func (s *Service) UpdateProfile(ctx context.Context, userID int32, req UpdateProfileRequest) (*UserBasicResponse, error) {
	user, err := s.queries.UpdateUserProfile(ctx, generated.UpdateUserProfileParams{
		ID:    userID,
		Name:  req.Name,
		Email: req.Email,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return &UserBasicResponse{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Role:     user.Role,
		Coins:    user.Coins,
		Co2Saved: user.Co2Saved,
		XP:       user.Xp,
	}, nil
}

// GetLeaderboard returns the top N users by XP.
func (s *Service) GetLeaderboard(ctx context.Context, limit int32) ([]LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	rows, err := s.queries.GetLeaderboard(ctx, limit)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	entries := make([]LeaderboardEntry, len(rows))
	for i, r := range rows {
		entries[i] = LeaderboardEntry{ID: r.ID, Name: r.Name, XP: r.Xp}
	}
	return entries, nil
}
