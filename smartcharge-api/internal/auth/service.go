package auth

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"smartcharge-api/db/generated"
	apperrors "smartcharge-api/internal/errors"
)

// operatorDomains are email domains that auto-assign the OPERATOR role.
var operatorDomains = []string{"zorlu.com", "enerji.com", "power.com"}

// Service handles authentication business logic.
type Service struct {
	queries *generated.Queries
	jwtKey  []byte
}

// NewService creates a new auth service.
func NewService(queries *generated.Queries, jwtKey []byte) *Service {
	return &Service{queries: queries, jwtKey: jwtKey}
}

// Login authenticates a user and returns a JWT token.
func (s *Service) Login(ctx context.Context, req LoginRequest) (*AuthResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))

	user, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	token, err := GenerateToken(user.ID, user.Role, s.jwtKey)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Fetch user's badges and stations
	badges, err := s.queries.GetUserBadges(ctx, user.ID)
	if err != nil {
		badges = []generated.Badge{}
	}

	stations, err := s.queries.GetUserStations(ctx, pgtype.Int4{Int32: user.ID, Valid: true})
	if err != nil {
		stations = []generated.GetUserStationsRow{}
	}

	badgeItems := make([]BadgeItem, len(badges))
	for i, b := range badges {
		badgeItems[i] = BadgeItem{ID: b.ID, Name: b.Name, Description: b.Description, Icon: b.Icon}
	}

	stationItems := make([]StationItem, len(stations))
	for i, st := range stations {
		stationItems[i] = StationItem{ID: st.ID, Name: st.Name, Price: st.Price}
	}

	return &AuthResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Role:     user.Role,
			Coins:    user.Coins,
			Co2Saved: user.Co2Saved,
			XP:       user.Xp,
			Badges:   badgeItems,
			Stations: stationItems,
		},
	}, nil
}

// Register creates a new user account and returns a JWT token.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
	email := strings.TrimSpace(strings.ToLower(req.Email))

	// Check if email already exists
	_, err := s.queries.GetUserByEmail(ctx, email)
	if err == nil {
		return nil, apperrors.NewConflictError("This email is already in use")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	// Determine role: always default to DRIVER, auto-assign OPERATOR based on email domain.
	// Role is never accepted from client input to prevent privilege escalation.
	role := "DRIVER"
	parts := strings.Split(email, "@")
	if len(parts) == 2 {
		domain := strings.ToLower(parts[1])
		for _, d := range operatorDomains {
			if domain == d {
				role = "OPERATOR"
				break
			}
		}
	}

	user, err := s.queries.CreateUser(ctx, generated.CreateUserParams{
		Name:     req.Name,
		Email:    email,
		Password: string(hashedPassword),
		Role:     role,
	})
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	token, err := GenerateToken(user.ID, user.Role, s.jwtKey)
	if err != nil {
		return nil, apperrors.ErrInternal
	}

	return &AuthResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Name:     user.Name,
			Email:    user.Email,
			Role:     user.Role,
			Coins:    user.Coins,
			Co2Saved: user.Co2Saved,
			XP:       user.Xp,
		},
	}, nil
}
