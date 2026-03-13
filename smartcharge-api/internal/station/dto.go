package station

// --- Request DTOs ---

// CreateStationRequest is the request body for POST /v1/stations.
type CreateStationRequest struct {
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
	Address   string  `json:"address,omitempty"`
	Price     float64 `json:"price" binding:"required,gt=0"`
}

// UpdateStationRequest is the request body for PUT /v1/stations/:id.
type UpdateStationRequest struct {
	Name      string  `json:"name" binding:"required"`
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
	Address   string  `json:"address,omitempty"`
	Price     float64 `json:"price" binding:"required,gt=0"`
}

// --- Response DTOs ---

// StationListItem represents a station in the list response.
type StationListItem struct {
	ID            int32   `json:"id"`
	Name          string  `json:"name"`
	Lat           float64 `json:"lat"`
	Lng           float64 `json:"lng"`
	Price         float64 `json:"price"`
	OwnerID       *int32  `json:"ownerId"`
	OwnerName     *string `json:"ownerName"`
	MockLoad      int32   `json:"load"`
	MockStatus    string  `json:"status"`
	NextGreenHour string  `json:"nextGreenHour"`
}

// StationDetailResponse is the full station detail with timeslots.
type StationDetailResponse struct {
	ID             int32            `json:"id"`
	Name           string           `json:"name"`
	Lat            float64          `json:"lat"`
	Lng            float64          `json:"lng"`
	Address        *string          `json:"address"`
	Price          float64          `json:"price"`
	Density        int32            `json:"density"`
	DensityProfile string           `json:"densityProfile"`
	AverageRating  float64          `json:"averageRating"`
	ReviewCount    int32            `json:"reviewCount"`
	Slots          []TimeSlot       `json:"slots"`
	ActiveCampaign *CampaignSummary `json:"activeCampaign"`
}

// TimeSlot represents a single hourly slot in the station detail.
type TimeSlot struct {
	Hour            int32            `json:"hour"`
	Label           string           `json:"label"`
	StartTime       string           `json:"startTime"`
	IsGreen         bool             `json:"isGreen"`
	Coins           int32            `json:"coins"`
	Price           float64          `json:"price"`
	Status          string           `json:"status"`
	Load            int32            `json:"load"`
	CampaignApplied *CampaignApplied `json:"campaignApplied"`
}

// CampaignApplied is the minimal campaign info shown per-slot.
type CampaignApplied struct {
	Title    string `json:"title"`
	Discount string `json:"discount"`
}

// CampaignSummary is the active campaign attached to a station detail.
type CampaignSummary struct {
	ID          int32  `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Discount    string `json:"discount"`
	CoinReward  int32  `json:"coinReward"`
	StationID   *int32 `json:"stationId"`
}

// StationResponse is the response for create/update operations.
type StationResponse struct {
	ID             int32   `json:"id"`
	Name           string  `json:"name"`
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	Address        *string `json:"address"`
	Price          float64 `json:"price"`
	Density        int32   `json:"density"`
	DensityProfile string  `json:"densityProfile"`
}

// ForecastItem is a single station's forecast entry.
type ForecastItem struct {
	StationID      int32   `json:"stationId"`
	StationName    string  `json:"stationName"`
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	Price          float64 `json:"price"`
	Address        *string `json:"address"`
	DensityProfile string  `json:"densityProfile"`
	PredictedLoad  int32   `json:"predictedLoad"`
	DayOfWeek      int32   `json:"dayOfWeek"`
	Hour           int32   `json:"hour"`
}

// ForecastResponse wraps the forecast list with current time context.
type ForecastResponse struct {
	CurrentTime ForecastTime   `json:"currentTime"`
	Forecasts   []ForecastItem `json:"forecasts"`
}

// ForecastTime holds the day/hour used for the forecast query.
type ForecastTime struct {
	DayOfWeek int32 `json:"dayOfWeek"`
	Hour      int32 `json:"hour"`
}
