package campaign

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// Service handles campaign business logic.
type Service struct {
	queries *generated.Queries
}

// NewService creates a new campaign service.
func NewService(queries *generated.Queries) *Service {
	return &Service{queries: queries}
}

// ListByOwner returns all campaigns for a given owner, ordered by createdAt DESC.
// Includes station name (via JOIN) and target badges per campaign.
func (s *Service) ListByOwner(ctx context.Context, ownerID int32) ([]CampaignResponse, error) {
	rows, err := s.queries.ListCampaignsByOwner(ctx, ownerID)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	result := make([]CampaignResponse, 0, len(rows))
	for _, row := range rows {
		badges, err := s.queries.GetCampaignTargetBadges(ctx, row.ID)
		if err != nil {
			badges = []generated.Badge{}
		}

		result = append(result, campaignRowToResponse(row, badges))
	}
	return result, nil
}

// ListForUser returns all active campaigns with matchedBadges populated
// from the user's earned badges intersected with campaign target badges.
func (s *Service) ListForUser(ctx context.Context, userID int32) ([]ForUserCampaignResponse, error) {
	campaigns, err := s.queries.ListActiveCampaigns(ctx)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Get user's earned badges
	userBadges, err := s.queries.GetUserBadges(ctx, userID)
	if err != nil {
		userBadges = []generated.Badge{}
	}

	// Build lookup set of user badge IDs
	userBadgeSet := make(map[int32]generated.Badge, len(userBadges))
	for _, ub := range userBadges {
		userBadgeSet[ub.ID] = ub
	}

	result := make([]ForUserCampaignResponse, 0, len(campaigns))
	for _, c := range campaigns {
		badges, err := s.queries.GetCampaignTargetBadges(ctx, c.ID)
		if err != nil {
			badges = []generated.Badge{}
		}

		var endDate *string
		if c.EndDate.Valid {
			s := c.EndDate.Time.UTC().Format(time.RFC3339)
			endDate = &s
		}

		targetBadgeResponses := make([]BadgeResponse, len(badges))
		matchedBadgeResponses := make([]BadgeResponse, 0)

		for i, b := range badges {
			br := BadgeResponse{
				ID:          b.ID,
				Name:        b.Name,
				Description: b.Description,
				Icon:        b.Icon,
			}
			targetBadgeResponses[i] = br

			// Check if user has this badge
			if _, ok := userBadgeSet[b.ID]; ok {
				matchedBadgeResponses = append(matchedBadgeResponses, br)
			}
		}

		result = append(result, ForUserCampaignResponse{
			ID:            c.ID,
			Title:         c.Title,
			Description:   c.Description,
			Discount:      c.Discount,
			CoinReward:    c.CoinReward,
			EndDate:       endDate,
			TargetBadges:  targetBadgeResponses,
			MatchedBadges: matchedBadgeResponses,
		})
	}
	return result, nil
}

// Create creates a new campaign with optional target badge linking.
func (s *Service) Create(ctx context.Context, ownerID int32, req CreateCampaignRequest) (*CampaignResponse, error) {
	// Parse endDate
	var endDate pgtype.Timestamptz
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := time.Parse(time.RFC3339, *req.EndDate)
		if err != nil {
			// Try date-only fallback
			t, err = time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				return nil, apperrors.NewValidationError("Invalid endDate format")
			}
		}
		endDate = pgtype.Timestamptz{Time: t, Valid: true}
	}

	// Parse stationId
	var stationID pgtype.Int4
	if req.StationID != nil {
		stationID = pgtype.Int4{Int32: *req.StationID, Valid: true}
	}

	// Default coinReward to 0
	coinReward := int32(0)
	if req.CoinReward != nil {
		coinReward = *req.CoinReward
	}

	// Default status to ACTIVE
	status := req.Status
	if status == "" {
		status = "ACTIVE"
	}

	campaign, err := s.queries.CreateCampaign(ctx, generated.CreateCampaignParams{
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Target:      req.Target,
		Discount:    req.Discount,
		EndDate:     endDate,
		OwnerID:     ownerID,
		StationID:   stationID,
		CoinReward:  coinReward,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Link target badges
	for _, badgeID := range req.TargetBadgeIDs {
		_ = s.queries.AddCampaignTargetBadge(ctx, generated.AddCampaignTargetBadgeParams{
			CampaignID: campaign.ID,
			BadgeID:    badgeID,
		})
	}

	// Fetch linked badges for response
	badges, err := s.queries.GetCampaignTargetBadges(ctx, campaign.ID)
	if err != nil {
		badges = []generated.Badge{}
	}

	resp := campaignToResponse(campaign, nil, badges)
	return &resp, nil
}

// Update updates a campaign's fields and reconnects target badges (disconnect all, then reconnect).
// Verifies that the campaign belongs to the requesting user.
func (s *Service) Update(ctx context.Context, ownerID int32, campaignID int32, req UpdateCampaignRequest) (*CampaignResponse, error) {
	// Verify campaign exists
	existing, err := s.queries.GetCampaignByID(ctx, campaignID)
	if err != nil {
		return nil, apperrors.NewNotFoundError("Campaign")
	}

	// Ownership check
	if existing.OwnerID != ownerID {
		return nil, apperrors.NewForbiddenError("Bu kampanya size ait degil")
	}

	// Parse endDate
	var endDate pgtype.Timestamptz
	if req.EndDate != nil && *req.EndDate != "" {
		t, err := time.Parse(time.RFC3339, *req.EndDate)
		if err != nil {
			t, err = time.Parse("2006-01-02", *req.EndDate)
			if err != nil {
				return nil, apperrors.NewValidationError("Invalid endDate format")
			}
		}
		endDate = pgtype.Timestamptz{Time: t, Valid: true}
	}

	// Parse stationId
	var stationID pgtype.Int4
	if req.StationID != nil {
		stationID = pgtype.Int4{Int32: *req.StationID, Valid: true}
	}

	// Default coinReward to 0
	coinReward := int32(0)
	if req.CoinReward != nil {
		coinReward = *req.CoinReward
	}

	// Default status — keep existing if not provided
	status := req.Status
	if status == "" {
		status = existing.Status
	}

	// Step 1: disconnect all existing badges
	if err := s.queries.RemoveCampaignTargetBadges(ctx, campaignID); err != nil {
		return nil, apperrors.ErrInternal
	}

	// Step 2: update campaign fields
	updated, err := s.queries.UpdateCampaign(ctx, generated.UpdateCampaignParams{
		ID:          campaignID,
		Title:       req.Title,
		Description: req.Description,
		Status:      status,
		Target:      req.Target,
		Discount:    req.Discount,
		EndDate:     endDate,
		StationID:   stationID,
		CoinReward:  coinReward,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Step 3: reconnect new badges
	for _, badgeID := range req.TargetBadgeIDs {
		_ = s.queries.AddCampaignTargetBadge(ctx, generated.AddCampaignTargetBadgeParams{
			CampaignID: campaignID,
			BadgeID:    badgeID,
		})
	}

	// Fetch badges for response
	badges, err := s.queries.GetCampaignTargetBadges(ctx, campaignID)
	if err != nil {
		badges = []generated.Badge{}
	}

	resp := campaignToResponse(updated, nil, badges)
	return &resp, nil
}

// Delete deletes a campaign by ID.
// Verifies that the campaign belongs to the requesting user.
func (s *Service) Delete(ctx context.Context, ownerID int32, campaignID int32) error {
	// Verify it exists
	existing, err := s.queries.GetCampaignByID(ctx, campaignID)
	if err != nil {
		return apperrors.NewNotFoundError("Campaign")
	}

	// Ownership check
	if existing.OwnerID != ownerID {
		return apperrors.NewForbiddenError("Bu kampanya size ait degil")
	}

	// Remove badge links first (FK constraint)
	_ = s.queries.RemoveCampaignTargetBadges(ctx, campaignID)

	if err := s.queries.DeleteCampaign(ctx, campaignID); err != nil {
		return apperrors.ErrInternal
	}
	return nil
}

// --- helpers ---

func campaignRowToResponse(row generated.ListCampaignsByOwnerRow, badges []generated.Badge) CampaignResponse {
	var endDate *string
	if row.EndDate.Valid {
		s := row.EndDate.Time.UTC().Format(time.RFC3339)
		endDate = &s
	}

	var stationID *int32
	if row.StationID.Valid {
		stationID = &row.StationID.Int32
	}

	var stationName *string
	if row.StationName.Valid {
		stationName = &row.StationName.String
	}

	createdAt := ""
	if row.CreatedAt.Valid {
		createdAt = row.CreatedAt.Time.UTC().Format(time.RFC3339)
	}

	updatedAt := ""
	if row.UpdatedAt.Valid {
		updatedAt = row.UpdatedAt.Time.UTC().Format(time.RFC3339)
	}

	badgeResponses := make([]BadgeResponse, len(badges))
	for i, b := range badges {
		badgeResponses[i] = BadgeResponse{
			ID:          b.ID,
			Name:        b.Name,
			Description: b.Description,
			Icon:        b.Icon,
		}
	}

	return CampaignResponse{
		ID:           row.ID,
		Title:        row.Title,
		Description:  row.Description,
		Status:       row.Status,
		Target:       row.Target,
		Discount:     row.Discount,
		EndDate:      endDate,
		OwnerID:      row.OwnerID,
		StationID:    stationID,
		StationName:  stationName,
		CoinReward:   row.CoinReward,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
		TargetBadges: badgeResponses,
	}
}

func campaignToResponse(c generated.Campaign, stationName *string, badges []generated.Badge) CampaignResponse {
	var endDate *string
	if c.EndDate.Valid {
		s := c.EndDate.Time.UTC().Format(time.RFC3339)
		endDate = &s
	}

	var stationID *int32
	if c.StationID.Valid {
		stationID = &c.StationID.Int32
	}

	createdAt := ""
	if c.CreatedAt.Valid {
		createdAt = c.CreatedAt.Time.UTC().Format(time.RFC3339)
	}

	updatedAt := ""
	if c.UpdatedAt.Valid {
		updatedAt = c.UpdatedAt.Time.UTC().Format(time.RFC3339)
	}

	badgeResponses := make([]BadgeResponse, len(badges))
	for i, b := range badges {
		badgeResponses[i] = BadgeResponse{
			ID:          b.ID,
			Name:        b.Name,
			Description: b.Description,
			Icon:        b.Icon,
		}
	}

	return CampaignResponse{
		ID:           c.ID,
		Title:        c.Title,
		Description:  c.Description,
		Status:       c.Status,
		Target:       c.Target,
		Discount:     c.Discount,
		EndDate:      endDate,
		OwnerID:      c.OwnerID,
		StationID:    stationID,
		StationName:  stationName,
		CoinReward:   c.CoinReward,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
		TargetBadges: badgeResponses,
	}
}
