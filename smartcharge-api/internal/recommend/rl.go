package recommend

import (
	"context"
	"math"
	"math/rand"
	"sync"
	"time"

	"smartcharge-api/db/generated"
)

type QEntry struct {
	stationID   int32
	hour        int
	dayOfWeek   int
	qValue      float64
	visitCount  int
	lastUpdated time.Time
}

type RLScorer struct {
	queries    *generated.Queries
	qTable     map[int32]map[int32]map[int]*QEntry
	mu         sync.RWMutex
	alpha      float64
	gamma      float64
	epsilon    float64
	decayRate  float64
	minEpsilon float64
}

func NewRLScorer(queries *generated.Queries) *RLScorer {
	return &RLScorer{
		queries:    queries,
		qTable:     make(map[int32]map[int32]map[int]*QEntry),
		alpha:      0.1,
		gamma:      0.9,
		epsilon:    0.3,
		decayRate:  0.995,
		minEpsilon: 0.05,
	}
}

func (s *RLScorer) Name() string {
	return "reinforcement_learning"
}

func (s *RLScorer) Score(ctx context.Context, req ScoreRequest) ([]ScoredStation, error) {
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

	for _, st := range stations {
		load := forecastMap[st.ID]
		if load == 0 {
			load = int(st.Density)
		}

		qValue := s.getQValue(req.UserID, st.ID, hour, dayOfWeek)

		loadScore := normalizeScore(100-float64(load), 0, 100)

		dist := calculateDistance(req.UserLat, req.UserLng, st.Lat, st.Lng)
		distanceScore := normalizeScore(math.Max(0, 20-dist), 0, 20) * 2.5

		greenHour := hour >= 23 || hour <= 6
		greenScore := 0.0
		if greenHour {
			greenScore = 25
		}

		priceScore := normalizeScore(15-st.Price, 0, 15) * 1.5

		baseScore := loadScore*0.35 + distanceScore*0.2 + greenScore*0.25 + priceScore*0.15

		rlBonus := qValue * 0.05
		totalScore := baseScore + rlBonus

		exploration := ""
		if s.shouldExplore(req.UserID) {
			totalScore += rand.Float64() * 10
			exploration = " (keşif)"
		}

		components := map[string]float64{
			"load":     loadScore,
			"distance": distanceScore,
			"green":    greenScore,
			"price":    priceScore,
			"rl_bonus": rlBonus,
			"q_value":  qValue,
		}

		explanation := buildRLExplanation(load, greenHour, dist, st.Price, qValue, exploration)

		scored = append(scored, ScoredStation{
			StationID:   st.ID,
			Score:       totalScore,
			Components:  components,
			Explanation: explanation,
		})
	}

	s.decayEpsilon()

	return sortAndLimit(scored, req.Limit), nil
}

func (s *RLScorer) getQValue(userID, stationID int32, hour, dayOfWeek int) float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if userQ, ok := s.qTable[userID]; ok {
		if hourQ, ok := userQ[stationID]; ok {
			if entry, ok := hourQ[hour]; ok {
				return entry.qValue
			}
		}
	}
	return 0
}

func (s *RLScorer) UpdateQValue(userID, stationID int32, hour, dayOfWeek int, reward float64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.qTable[userID]; !ok {
		s.qTable[userID] = make(map[int32]map[int]*QEntry)
	}
	if _, ok := s.qTable[userID][stationID]; !ok {
		s.qTable[userID][stationID] = make(map[int]*QEntry)
	}

	entry, exists := s.qTable[userID][stationID][hour]
	if !exists {
		entry = &QEntry{
			stationID:   stationID,
			hour:        hour,
			dayOfWeek:   dayOfWeek,
			qValue:      0,
			visitCount:  0,
			lastUpdated: time.Now(),
		}
		s.qTable[userID][stationID][hour] = entry
	}

	oldQ := entry.qValue
	newQ := oldQ + s.alpha*(reward+s.gamma*0-oldQ)

	entry.qValue = newQ
	entry.visitCount++
	entry.lastUpdated = time.Now()
}

func (s *RLScorer) shouldExplore(userID int32) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	r := rand.Float64()
	return r < s.epsilon
}

func (s *RLScorer) decayEpsilon() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.epsilon > s.minEpsilon {
		s.epsilon *= s.decayRate
	}
}

func (s *RLScorer) GetEpsilon() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.epsilon
}

func (s *RLScorer) CalculateReward(coins int, co2Saved float64, isGreen bool, load int) float64 {
	reward := float64(coins)
	reward += co2Saved * 10

	if isGreen {
		reward += 20
	}

	if load < 30 {
		reward += 15
	} else if load > 65 {
		reward -= 10
	}

	return reward
}

func (s *RLScorer) GetQTableSize() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	for _, userQ := range s.qTable {
		for _, stationQ := range userQ {
			count += len(stationQ)
		}
	}
	return count
}

func buildRLExplanation(load int, greenHour bool, dist float64, price float64, qValue float64, exploration string) string {
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
	if qValue > 10 {
		parts = append(parts, "geçmiş deneyim")
	}
	if exploration != "" {
		parts = append(parts, "keşif")
	}
	return joinParts(parts)
}
