package recommend

import (
	"context"
	"math"

	"smartcharge-api/db/generated"
)

type LinearRegressionScorer struct {
	queries *generated.Queries
}

func NewLinearRegressionScorer(queries *generated.Queries) *LinearRegressionScorer {
	return &LinearRegressionScorer{queries: queries}
}

func (s *LinearRegressionScorer) Name() string {
	return "linear_regression"
}

func (s *LinearRegressionScorer) Score(ctx context.Context, req ScoreRequest) ([]ScoredStation, error) {
	stations, err := s.queries.ListStations(ctx)
	if err != nil {
		return nil, err
	}

	dayOfWeek := int(req.TimeSlot.Weekday())
	hour := req.TimeSlot.Hour()

	forecasts, err := s.queries.GetForecastsByDayHour(ctx, generated.GetForecastsByDayHourParams{
		DayOfWeek: int32(dayOfWeek),
		Hour:      int32(hour),
	})
	if err != nil {
		forecasts = nil
	}

	forecastMap := make(map[int32]int)
	for _, f := range forecasts {
		forecastMap[f.StationID] = int(f.PredictedLoad)
	}

	var scored []ScoredStation
	var minLoad, maxLoad float64 = 100, 0
	var minDist, maxDist float64 = 100, 0
	dists := make(map[int32]float64)

	for _, st := range stations {
		load := forecastMap[st.ID]
		if load == 0 {
			load = int(st.Density)
		}
		if float64(load) < minLoad {
			minLoad = float64(load)
		}
		if float64(load) > maxLoad {
			maxLoad = float64(load)
		}

		dist := calculateDistance(req.UserLat, req.UserLng, st.Lat, st.Lng)
		dists[st.ID] = dist
		if dist < minDist {
			minDist = dist
		}
		if dist > maxDist {
			maxDist = dist
		}
	}

	for _, st := range stations {
		load := forecastMap[st.ID]
		if load == 0 {
			load = int(st.Density)
		}

		loadScore := normalizeScore(100-float64(load), 0, 100)

		dist := dists[st.ID]
		distanceScore := normalizeScore(math.Max(0, 20-dist), 0, 20) * 2.5

		greenHour := hour >= 23 || hour <= 6
		greenScore := 0.0
		if greenHour {
			greenScore = 25
		}

		priceScore := normalizeScore(15-st.Price, 0, 15) * 1.5

		totalScore := loadScore*0.4 + distanceScore*0.2 + greenScore*0.25 + priceScore*0.15

		components := map[string]float64{
			"load":     loadScore,
			"distance": distanceScore,
			"green":    greenScore,
			"price":    priceScore,
		}

		explanation := buildExplanation(load, greenHour, dist, st.Price)

		scored = append(scored, ScoredStation{
			StationID:   st.ID,
			Score:       totalScore,
			Components:  components,
			Explanation: explanation,
		})
	}

	return sortAndLimit(scored, req.Limit), nil
}

func buildExplanation(load int, greenHour bool, dist float64, price float64) string {
	var parts []string
	if load < 30 {
		parts = append(parts, "Düşük yoğunluk")
	} else if load > 65 {
		parts = append(parts, "Yüksek yoğunluk")
	} else {
		parts = append(parts, "Orta yoğunluk")
	}
	if greenHour {
		parts = append(parts, "yeşil tarife")
	}
	if dist < 5 {
		parts = append(parts, "yakın")
	}
	if price < 7 {
		parts = append(parts, "uygun fiyat")
	}
	return joinParts(parts)
}

func joinParts(parts []string) string {
	result := ""
	for i, p := range parts {
		if i > 0 {
			result += " & "
		}
		result += p
	}
	return result
}

func sortAndLimit(scored []ScoredStation, limit int) []ScoredStation {
	for i := 0; i < len(scored)-1; i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[j].Score > scored[i].Score {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}
	if limit > len(scored) {
		limit = len(scored)
	}
	return scored[:limit]
}
