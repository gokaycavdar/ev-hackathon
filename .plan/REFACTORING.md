# SmartCharge - Refactoring Proposals

> Last updated: 2026-02-19
> Detailed technical designs for the 4 major feature improvements

---

## 1. Smart Recommendations: From Mock to Scoring/ML-Based

### Current State (Mock)

```
seed.go (synthetic data -> linear regression -> DB)
  -> station.ListStations() -> MockLoad/MockStatus
    -> frontend min-sort
```

Regression runs once at seed time on random data. No live inference, no retraining, no personalization.

### Target Architecture

```
+------------------+     +------------------+
| station.Handler  |     | chat.Handler     |
+--------+---------+     +--------+---------+
         |                        |
    +----v------------------------v----+
    |      recommend.Service           |
    |  (orchestrates scoring pipeline) |
    +--+--------+----------+----------+
       |        |          |
  +----v--+ +--v-----+ +--v----------+
  | SQLC  | |Scorer  | |UserContext   |
  | Repo  | |(iface) | |(history,     |
  +-------+ +--+--+--+ | location,   |
          +----v+ +v----+| badges)    |
          | LR  | | ML  |+-----------+
          |Impl | |Impl |
          +-----+ +-----+
```

### Step-by-Step Implementation

**Step 1: Define the Scorer Interface**

```go
// internal/recommend/scorer.go
package recommend

import (
    "context"
    "time"
)

type ScoredStation struct {
    StationID   int32
    Score       float64              // 0-100 composite
    Components  map[string]float64   // {load, distance, price, green, campaign}
    Explanation string               // human-readable reason
}

type ScoreRequest struct {
    UserID   int32
    UserLat  float64
    UserLng  float64
    TimeSlot time.Time
    Limit    int
}

type Scorer interface {
    Score(ctx context.Context, req ScoreRequest) ([]ScoredStation, error)
}
```

**Step 2: Implement `LinearRegressionScorer`**

- Move regression computation from `seed.go` into a proper service
- Score formula: `0.4 * (100 - predictedLoad) + 0.25 * greenBonus + 0.2 * proximityScore + 0.15 * campaignBonus`
- `proximityScore` = inverse of haversine distance, normalized to 0-100
- `greenBonus` = 100 if hour is in green window, 0 otherwise
- `campaignBonus` = normalized coin reward value

**Step 3: Create `recommend.Service` as orchestrator**

```go
// internal/recommend/service.go
package recommend

import (
    "context"

    "smartcharge-api/db/generated"
)

type Service struct {
    queries *generated.Queries
    scorer  Scorer
}

func NewService(queries *generated.Queries, scorer Scorer) *Service {
    return &Service{queries: queries, scorer: scorer}
}

func (s *Service) Recommend(ctx context.Context, req ScoreRequest) ([]ScoredStation, error) {
    return s.scorer.Score(ctx, req)
}
```

**Step 4: Wire into existing handlers**

- `station.Handler` calls `recommend.Service.Recommend()` instead of raw DB query + threshold
- `chat.Handler` calls `recommend.Service.Recommend()` for context-aware station suggestions
- Remove `MockLoad`/`MockStatus` from DTO; replace with `Load`, `Status` (derived from score)

**Step 5: Data ingestion for retraining**

- After `reservation.Complete()`, emit a `ChargingCompleted` event (initially just a function call)
- Aggregate actual load data from reservation patterns
- Re-run regression on real data (weekly cron or `/v1/admin/retrain` endpoint)

**Step 6: Upgrade path**

- `Scorer` interface allows swapping `LinearRegressionScorer` -> `XGBoostScorer` -> external ML API
- A/B test two scorers by routing 50% of requests to each
- No handler or frontend changes required

---

## 2. Badge Earning Engine: From Static to Event-Driven

### Current State

Badges seeded once, assigned manually in seed script. No earning logic.

### Target Architecture

```
reservation.Complete()
       |
       v
 BadgeEvaluator.Evaluate(userID, event)
       |
       +-- Query badge_criteria table
       +-- Query/update badge_progress table
       +-- If threshold met -> AddUserBadge (with earned_at)
       +-- Return []AwardedBadge
```

### New Database Tables

```sql
-- Badge earning criteria (data-driven, not hardcoded)
CREATE TABLE badge_criteria (
    id         SERIAL PRIMARY KEY,
    badge_id   INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    metric     VARCHAR(50) NOT NULL,  -- 'night_charges', 'green_only', 'weekend_charges', etc.
    threshold  INT NOT NULL,          -- e.g., 5 for "5 night charges"
    window     VARCHAR(20),           -- 'all_time', 'monthly', 'weekly'
    UNIQUE (badge_id, metric)
);

-- User progress toward badges
CREATE TABLE badge_progress (
    user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id     INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    metric       VARCHAR(50) NOT NULL,
    current_count INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id, metric)
);
```

### BadgeEvaluator Interface

```go
// internal/badge/evaluator.go
package badge

import (
    "context"
    "time"
)

type Event struct {
    Type      string    // "charging_completed", "reservation_created"
    UserID    int32
    StationID int32
    IsGreen   bool
    Hour      int32
    DayOfWeek int32     // 0=Mon, 6=Sun
    Timestamp time.Time
}

type AwardedBadge struct {
    BadgeID int32
    Name    string
    Icon    string
}

type BadgeEvaluator interface {
    Evaluate(ctx context.Context, event Event) ([]AwardedBadge, error)
}
```

### Metric Mapping (from badge descriptions)

| Badge | Metric | Threshold |
|-------|--------|-----------|
| Gece Kusu | `night_charges` (hour 23-06) | 5 |
| Eco Sampiyonu | `consecutive_green_charges` | 10 |
| Hafta Sonu Savascisi | `weekend_charges` (day 5-6) | 5 |
| Erken Kalkan | `morning_charges` (hour 06-09) | 5 |
| Uzun Yolcu | `intercity_charges` (density_profile = outskirt) | 3 |

### Integration Point

In `reservation/service.go Complete()`, after the transaction commits:

```go
// After tx.Commit()
event := badge.Event{
    Type:      "charging_completed",
    UserID:    reservation.UserID,
    IsGreen:   reservation.IsGreen,
    Hour:      parseHour(reservation.Hour),
    DayOfWeek: dayOfWeek(reservation.Date),
}
awarded, _ := s.badgeEvaluator.Evaluate(ctx, event)
// Include awarded badges in CompleteResponse
```

---

## 3. Reservation State Machine

### Current State

Status is a freeform string. Any transition is allowed. No validation.

### Proposed State Machine

```
                    +----------+
                    | PENDING  |
                    +----+-----+
                         | confirm()
                    +----v-----+
              +-----|CONFIRMED |-----+
              |     +----+-----+     |
              |          | start()   | cancel()
              |     +----v-----+     |
              |     | CHARGING |     |
              |     +--+----+--+     |
              |        |    |        |
              | complete() fail()    |
              |   +----v+ +v-----+   |
              |   |DONE | |FAILED|   |
              |   +-----+ +------+   |
              |                      |
              +------>+----------+<--+
                      |CANCELLED |
                      +----------+
```

### Implementation

```go
// internal/reservation/state.go
package reservation

import (
    "fmt"

    apperrors "smartcharge-api/internal/errors"
)

var validTransitions = map[string][]string{
    "PENDING":   {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"CHARGING", "CANCELLED"},
    "CHARGING":  {"COMPLETED", "FAILED"},
}

func ValidateTransition(from, to string) error {
    allowed, ok := validTransitions[from]
    if !ok {
        return apperrors.NewValidationError("Invalid current status")
    }
    for _, s := range allowed {
        if s == to {
            return nil
        }
    }
    return apperrors.NewValidationError(
        fmt.Sprintf("Cannot transition from %s to %s", from, to),
    )
}
```

---

## 4. AI Chatbot: From Stub to LLM-Powered

### Target Architecture

```
User Message
     |
     v
chat.Handler (parse ChatRequest)
     |
     v
chat.Service
     +-- Build system prompt (inject station/forecast/user context)
     +-- Call AIProvider.Complete()
     +-- Parse structured output (recommendations, text)
     +-- Return ChatResponse

AIProvider Interface:
     +-- OpenAIProvider (production)
     +-- ClaudeProvider (alternative)
     +-- MockProvider   (testing/dev)
```

### AIProvider Interface

```go
// internal/ai/provider.go
package ai

import "context"

type Message struct {
    Role    string // "system", "user", "assistant"
    Content string
}

type Option func(*Options)

type Options struct {
    Temperature float64
    MaxTokens   int
    Model       string
}

type Response struct {
    Content string
    Usage   Usage
}

type Usage struct {
    PromptTokens     int
    CompletionTokens int
}

type Provider interface {
    Complete(ctx context.Context, messages []Message, opts ...Option) (*Response, error)
}

func WithTemperature(t float64) Option {
    return func(o *Options) { o.Temperature = t }
}

func WithMaxTokens(n int) Option {
    return func(o *Options) { o.MaxTokens = n }
}

func WithModel(m string) Option {
    return func(o *Options) { o.Model = m }
}
```

### System Prompt Strategy

```
You are SmartCharge AI, an EV charging assistant. You help drivers find the
best charging stations based on real-time grid data, pricing, and their
personal preferences.

Context injected per-request:
- User profile: {name, coins, XP, badges, recent reservations}
- Top 5 stations by score: {name, lat, lng, predicted_load, price, green_status}
- Active campaigns: {title, discount, coin_reward}
- Current time and day of week

Respond in Turkish. When recommending stations, include structured
recommendation data in your response.
```

### Conversation Memory

```sql
CREATE TABLE chat_sessions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id         SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
```

### RAG Integration (Phase 2)

1. Add `pgvector` extension to PostgreSQL
2. Create `embeddings` table for station descriptions, FAQ, energy tips
3. Embedding pipeline: text -> OpenAI embeddings API -> store vectors
4. At query time: embed user message -> cosine similarity search -> inject top-k results into prompt

```sql
-- Requires: CREATE EXTENSION vector;
CREATE TABLE knowledge_embeddings (
    id         SERIAL PRIMARY KEY,
    content    TEXT NOT NULL,
    source     VARCHAR(100) NOT NULL, -- 'faq', 'station_info', 'energy_tip'
    embedding  vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_vector ON knowledge_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```
