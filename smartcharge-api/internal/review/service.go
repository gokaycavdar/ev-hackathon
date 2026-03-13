package review

import (
	"context"
	"log"
	"math"
	"time"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles review business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new review service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// Create creates a new review for a completed reservation.
// Validates: reservation exists, belongs to user, is COMPLETED, no duplicate review.
func (s *Service) Create(ctx context.Context, userID int32, req CreateReviewRequest) (*ReviewResponse, error) {
	// Verify reservation exists and belongs to user
	reservation, err := s.queries.GetReservationByID(ctx, req.ReservationID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Reservation")
	}

	if reservation.UserID != userID {
		return nil, apperrors.NewForbiddenError("Bu rezervasyon size ait degil")
	}

	if reservation.Status != "COMPLETED" {
		return nil, apperrors.NewValidationError("Sadece tamamlanmis rezervasyonlar icin degerlendirme yapilabilir")
	}

	// Verify station matches
	if reservation.StationID != req.StationID {
		return nil, apperrors.NewValidationError("Istasyon ve rezervasyon eslesmedi")
	}

	// Check for existing review
	_, err = s.queries.GetUserReviewForReservation(ctx, generated.GetUserReviewForReservationParams{
		UserID:        userID,
		ReservationID: req.ReservationID,
	})
	if err == nil {
		return nil, apperrors.NewConflictError("Bu rezervasyon icin zaten degerlendirme yapilmis")
	}

	review, err := s.queries.CreateReview(ctx, generated.CreateReviewParams{
		UserID:        userID,
		StationID:     req.StationID,
		ReservationID: req.ReservationID,
		Rating:        req.Rating,
		Comment:       req.Comment,
	})
	if err != nil {
		log.Printf("review create: DB error: %v", err)
		return nil, apperrors.ErrInternal
	}

	// Get user name for response
	user, err := s.queries.GetUserByID(ctx, userID)
	userName := "Anonim"
	if err == nil {
		userName = user.Name
	}

	return reviewToResponse(review, userName), nil
}

// GetStationReviews returns paginated reviews and summary for a station.
func (s *Service) GetStationReviews(ctx context.Context, stationID int32, limit, offset int32) (*StationReviewsResponse, error) {
	// Get summary
	summary, err := s.queries.GetStationReviewSummary(ctx, stationID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Get paginated reviews
	rows, err := s.queries.GetStationReviews(ctx, generated.GetStationReviewsParams{
		StationID: stationID,
		Limit:     limit,
		Offset:    offset,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	reviews := make([]ReviewResponse, len(rows))
	for i, r := range rows {
		createdAt := ""
		if r.CreatedAt.Valid {
			createdAt = r.CreatedAt.Time.UTC().Format(time.RFC3339)
		}
		reviews[i] = ReviewResponse{
			ID:            r.ID,
			UserID:        r.UserID,
			UserName:      r.UserName,
			StationID:     r.StationID,
			ReservationID: r.ReservationID,
			Rating:        r.Rating,
			Comment:       r.Comment,
			CreatedAt:     createdAt,
		}
	}

	return &StationReviewsResponse{
		Summary: ReviewSummaryResponse{
			AverageRating: roundTo2(summary.AverageRating),
			ReviewCount:   summary.ReviewCount,
			FiveStar:      summary.FiveStar,
			FourStar:      summary.FourStar,
			ThreeStar:     summary.ThreeStar,
			TwoStar:       summary.TwoStar,
			OneStar:       summary.OneStar,
		},
		Reviews: reviews,
	}, nil
}

// GetAverageRating returns just the average rating and count for a station (for embedding in station detail).
func (s *Service) GetAverageRating(ctx context.Context, stationID int32) (float64, int32, error) {
	row, err := s.queries.GetStationAverageRating(ctx, stationID)
	if err != nil {
		return 0, 0, err
	}
	return roundTo2(row.AverageRating), row.ReviewCount, nil
}

// --- helpers ---

func roundTo2(v float64) float64 {
	return math.Round(v*100) / 100
}

func reviewToResponse(r generated.StationReview, userName string) *ReviewResponse {
	createdAt := ""
	if r.CreatedAt.Valid {
		createdAt = r.CreatedAt.Time.UTC().Format(time.RFC3339)
	}
	return &ReviewResponse{
		ID:            r.ID,
		UserID:        r.UserID,
		UserName:      userName,
		StationID:     r.StationID,
		ReservationID: r.ReservationID,
		Rating:        r.Rating,
		Comment:       r.Comment,
		CreatedAt:     createdAt,
	}
}
