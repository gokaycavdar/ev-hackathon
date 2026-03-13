package review

// CreateReviewRequest is the request body for POST /v1/reviews.
type CreateReviewRequest struct {
	StationID     int32  `json:"stationId" binding:"required"`
	ReservationID int32  `json:"reservationId" binding:"required"`
	Rating        int32  `json:"rating" binding:"required,min=1,max=5"`
	Comment       string `json:"comment"`
}

// ReviewResponse is a single review item in API responses.
type ReviewResponse struct {
	ID            int32  `json:"id"`
	UserID        int32  `json:"userId"`
	UserName      string `json:"userName"`
	StationID     int32  `json:"stationId"`
	ReservationID int32  `json:"reservationId"`
	Rating        int32  `json:"rating"`
	Comment       string `json:"comment"`
	CreatedAt     string `json:"createdAt"`
}

// ReviewSummaryResponse is the aggregate rating info for a station.
type ReviewSummaryResponse struct {
	AverageRating float64 `json:"averageRating"`
	ReviewCount   int32   `json:"reviewCount"`
	FiveStar      int32   `json:"fiveStar"`
	FourStar      int32   `json:"fourStar"`
	ThreeStar     int32   `json:"threeStar"`
	TwoStar       int32   `json:"twoStar"`
	OneStar       int32   `json:"oneStar"`
}

// StationReviewsResponse wraps summary + paginated reviews.
type StationReviewsResponse struct {
	Summary ReviewSummaryResponse `json:"summary"`
	Reviews []ReviewResponse      `json:"reviews"`
}
