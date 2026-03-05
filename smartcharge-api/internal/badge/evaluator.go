package badge

import (
	"context"
	"log"

	"smartcharge-api/db/generated"
)

// Event represents the data from a completed reservation needed for badge evaluation.
type Event struct {
	UserID         int32
	StationID      int32
	IsGreen        bool
	Hour           int32  // 0-23
	DayOfWeek      int32  // 0=Sunday, 6=Saturday (Go's time.Weekday)
	DensityProfile string // "urban", "suburban", "outskirt"
}

// AwardedBadge contains info about a newly awarded badge.
type AwardedBadge struct {
	BadgeID     int32  `json:"badgeId"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// Evaluator checks badge criteria and awards badges within a transaction.
type Evaluator struct{}

// NewEvaluator creates a new badge evaluator.
func NewEvaluator() *Evaluator {
	return &Evaluator{}
}

// Evaluate checks all badge criteria against the given event, updates progress,
// and awards badges when thresholds are met. Must be called with transaction-bound queries (qtx).
func (e *Evaluator) Evaluate(ctx context.Context, qtx *generated.Queries, event Event) ([]AwardedBadge, error) {
	// 1. Get all badge criteria
	criteria, err := qtx.ListBadgeCriteria(ctx)
	if err != nil {
		log.Printf("badge evaluator: failed to list criteria: %v", err)
		return nil, err
	}

	// 2. Determine which metrics this event satisfies
	matchedMetrics := matchMetrics(event)
	if len(matchedMetrics) == 0 {
		return nil, nil
	}

	// Build a lookup set for fast matching
	metricSet := make(map[string]bool, len(matchedMetrics))
	for _, m := range matchedMetrics {
		metricSet[m] = true
	}

	var awarded []AwardedBadge

	// 3. For each criterion, check if this event matches its metric
	for _, c := range criteria {
		if !metricSet[c.Metric] {
			continue
		}

		// Check if user already has this badge
		count, err := qtx.CheckUserHasBadge(ctx, generated.CheckUserHasBadgeParams{
			UserID:  event.UserID,
			BadgeID: c.BadgeID,
		})
		if err != nil {
			log.Printf("badge evaluator: failed to check user badge %d: %v", c.BadgeID, err)
			continue
		}
		if count > 0 {
			// Already earned, skip
			continue
		}

		// Increment progress
		progress, err := qtx.UpsertBadgeProgress(ctx, generated.UpsertBadgeProgressParams{
			UserID:  event.UserID,
			BadgeID: c.BadgeID,
			Metric:  c.Metric,
		})
		if err != nil {
			log.Printf("badge evaluator: failed to upsert progress for badge %d metric %s: %v", c.BadgeID, c.Metric, err)
			continue
		}

		// Check if threshold is met
		if progress.CurrentCount >= c.Threshold {
			// Award the badge
			err = qtx.AwardBadge(ctx, generated.AwardBadgeParams{
				UserID:  event.UserID,
				BadgeID: c.BadgeID,
			})
			if err != nil {
				log.Printf("badge evaluator: failed to award badge %d to user %d: %v", c.BadgeID, event.UserID, err)
				continue
			}

			awarded = append(awarded, AwardedBadge{
				BadgeID:     c.BadgeID,
				Name:        c.BadgeName,
				Description: c.BadgeDescription,
				Icon:        c.BadgeIcon,
			})

			log.Printf("badge evaluator: awarded badge '%s' (ID=%d) to user %d", c.BadgeName, c.BadgeID, event.UserID)
		}
	}

	return awarded, nil
}

// matchMetrics determines which badge metrics this event satisfies.
func matchMetrics(event Event) []string {
	var metrics []string

	// Night charges: hour 23-06 (same as green window)
	if event.Hour >= 23 || event.Hour <= 6 {
		metrics = append(metrics, "night_charges")
	}

	// Green charges: any green charge
	if event.IsGreen {
		metrics = append(metrics, "green_charges")
	}

	// Weekend charges: Saturday(6) or Sunday(0)
	if event.DayOfWeek == 0 || event.DayOfWeek == 6 {
		metrics = append(metrics, "weekend_charges")
	}

	// Morning charges: hour 06-09
	if event.Hour >= 6 && event.Hour <= 9 {
		metrics = append(metrics, "morning_charges")
	}

	// Intercity charges: outskirt density profile
	if event.DensityProfile == "outskirt" {
		metrics = append(metrics, "intercity_charges")
	}

	return metrics
}
