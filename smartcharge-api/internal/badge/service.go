package badge

import (
	"context"
	"time"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles badge business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new badge service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// BadgeResponse is the response DTO for a badge.
type BadgeResponse struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// BadgeProgressResponse is the response DTO for a badge with progress data.
type BadgeProgressResponse struct {
	ID           int32   `json:"id"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Icon         string  `json:"icon"`
	Metric       string  `json:"metric"`
	Threshold    int32   `json:"threshold"`
	CurrentCount int32   `json:"currentCount"`
	Earned       bool    `json:"earned"`
	EarnedAt     *string `json:"earnedAt"`
}

// List returns all badges sorted by name ASC.
func (s *Service) List(ctx context.Context) ([]BadgeResponse, error) {
	badges, err := s.queries.ListBadges(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	result := make([]BadgeResponse, len(badges))
	for i, b := range badges {
		result[i] = BadgeResponse{
			ID:          b.ID,
			Name:        b.Name,
			Description: b.Description,
			Icon:        b.Icon,
		}
	}
	return result, nil
}

// ListWithProgress returns all badges with the user's progress toward each.
func (s *Service) ListWithProgress(ctx context.Context, userID int32) ([]BadgeProgressResponse, error) {
	rows, err := s.queries.GetBadgesWithProgress(ctx, userID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	result := make([]BadgeProgressResponse, len(rows))
	for i, r := range rows {
		var earnedAt *string
		if r.EarnedAt.Valid {
			s := r.EarnedAt.Time.UTC().Format(time.RFC3339)
			earnedAt = &s
		}
		result[i] = BadgeProgressResponse{
			ID:           r.ID,
			Name:         r.Name,
			Description:  r.Description,
			Icon:         r.Icon,
			Metric:       r.Metric,
			Threshold:    r.Threshold,
			CurrentCount: r.CurrentCount,
			Earned:       r.Earned,
			EarnedAt:     earnedAt,
		}
	}
	return result, nil
}
