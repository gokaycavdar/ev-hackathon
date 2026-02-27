package recommend

import (
	"context"
	"math"
	"time"

	"smartcharge-api/db/generated"
)

type ScoreRequest struct {
	UserID   int32
	UserLat  float64
	UserLng  float64
	TimeSlot time.Time
	Limit    int
}

type ScoredStation struct {
	StationID   int32
	Score       float64
	Components  map[string]float64
	Explanation string
}

type Scorer interface {
	Score(ctx context.Context, req ScoreRequest) ([]ScoredStation, error)
	Name() string
}

type Service struct {
	queries *generated.Queries
	scorer  Scorer
}

func NewService(queries *generated.Queries, scorer Scorer) *Service {
	return &Service{queries: queries, scorer: scorer}
}

func (s *Service) Recommend(ctx context.Context, req ScoreRequest) ([]ScoredStation, error) {
	if req.Limit <= 0 {
		req.Limit = 10
	}
	return s.scorer.Score(ctx, req)
}

func (s *Service) SetScorer(scorer Scorer) {
	s.scorer = scorer
}

func (s *Service) GetScorerName() string {
	return s.scorer.Name()
}

func calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371
	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func normalizeScore(value, min, max float64) float64 {
	if max == min {
		return 50
	}
	result := (value - min) / (max - min) * 100
	return math.Min(100, math.Max(0, result))
}
