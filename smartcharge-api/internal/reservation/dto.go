package reservation

import "smartcharge-api/internal/badge"

// --- Request DTOs ---

// CreateReservationRequest is the request body for POST /v1/reservations.
type CreateReservationRequest struct {
	StationID int32  `json:"stationId" binding:"required"`
	Date      string `json:"date" binding:"required"`
	Hour      string `json:"hour" binding:"required"`
	IsGreen   bool   `json:"isGreen"`
}

// UpdateStatusRequest is the request body for PATCH /v1/reservations/:id.
type UpdateStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// --- Response DTOs ---

// ReservationResponse is the reservation data returned by create/update endpoints.
type ReservationResponse struct {
	ID          int32   `json:"id"`
	UserID      int32   `json:"userId"`
	StationID   int32   `json:"stationId"`
	Date        string  `json:"date"`
	Hour        string  `json:"hour"`
	IsGreen     bool    `json:"isGreen"`
	EarnedCoins int32   `json:"earnedCoins"`
	SavedCo2    float64 `json:"savedCo2"`
	Status      string  `json:"status"`
	ConfirmedAt *string `json:"confirmedAt,omitempty"`
	StartedAt   *string `json:"startedAt,omitempty"`
	CompletedAt *string `json:"completedAt,omitempty"`
}

// CompleteResponse is the response for the complete endpoint.
type CompleteResponse struct {
	Reservation   ReservationResponse  `json:"reservation"`
	User          UserStatsResponse    `json:"user"`
	AwardedBadges []badge.AwardedBadge `json:"awardedBadges"`
}

// UserStatsResponse is the user stats snapshot returned after completing a reservation.
type UserStatsResponse struct {
	ID       int32   `json:"id"`
	Coins    int32   `json:"coins"`
	Co2Saved float64 `json:"co2Saved"`
	XP       int32   `json:"xp"`
}
