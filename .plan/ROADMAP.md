# SmartCharge - Implementation Roadmap

> Last updated: 2026-02-19
> Focus: Make mock/stub systems functional, prepare backend for Flutter mobile app
> Track progress by checking boxes as tasks are completed

---

## Phase 1: Smart Recommendations Engine [PRIORITY: HIGH]

> See `.plan/REFACTORING.md` Section 1 for detailed design

- [ ] Define `Scorer` interface in `internal/recommend/scorer.go`
- [ ] Implement `LinearRegressionScorer` (migrate logic from seed.go into a runtime service)
- [ ] Create composite scoring: load (40%) + green bonus (25%) + proximity (20%) + campaign (15%)
- [ ] Replace `MockLoad`/`MockStatus` with real scoring results in station DTO and all frontend references
  - Backend: `internal/station/dto.go:34-35` (rename fields to `Load`/`Status`)
  - Frontend: `app/(driver)/driver/page.tsx`, `components/Map.tsx`, `app/(operator)/operator/stations/page.tsx`
- [ ] Compute `NextGreenHour` dynamically instead of hardcoding `"23:00"`
- [ ] Add user location support to scoring (haversine distance)
- [ ] Wire `recommend.Service` into `station.Handler` and `chat.Handler`
- [ ] Build forecast retraining pipeline (ingest real reservation data)

**Mobile impact**: The `mockLoad`/`mockStatus` JSON field names will change to `load`/`status`. Document in MOBILE_API.md when done.

---

## Phase 2: Dynamic Badge Earning Engine [PRIORITY: HIGH]

> See `.plan/REFACTORING.md` Section 2 for detailed design

- [ ] Create migration: `badge_criteria` table (badge_id, metric, threshold, window)
- [ ] Create migration: `badge_progress` table (user_id, badge_id, current_count, last_updated)
- [ ] Add `earned_at TIMESTAMPTZ DEFAULT NOW()` column to `user_badges` table
- [ ] Write SQLC queries for badge criteria, progress, and awarding
- [ ] Create `internal/badge/evaluator.go` with `BadgeEvaluator` interface
- [ ] Implement `DBEvaluator` that checks criteria and awards badges
- [ ] Integrate badge evaluation into `reservation.Complete()` transaction
- [ ] Connect campaign badge matching to real user badges (replace stub `matchedBadges: []`)
- [ ] Update frontend wallet page to show real progress instead of hardcoded mockup
- [ ] Seed `badge_criteria` data for all 5 existing badges

**Mobile impact**: `POST /v1/reservations/:id/complete` response will include `awardedBadges[]`. Profile endpoint will include badge progress data.

---

## Phase 3: AI Chatbot with LLM Integration [PRIORITY: HIGH]

> See `.plan/REFACTORING.md` Section 4 for detailed design

- [ ] Define `AIProvider` interface in `internal/ai/provider.go`
- [ ] Add `OPENAI_API_KEY` to `config.go` (currently placeholder in `.env.example`)
- [ ] Implement `OpenAIProvider` (or Claude provider)
- [ ] Rewrite `chat/handler.go` to parse user message from request body (currently ignored)
- [ ] Rewrite `chat/service.go` to:
  - Build context-aware system prompt (user profile, stations, forecasts, campaigns)
  - Call LLM API
  - Parse structured output into `ChatResponse` with real recommendations
- [ ] Create migration: `chat_sessions` and `chat_messages` tables
- [ ] Add conversation memory (session-scoped, DB-backed)
- [ ] Add streaming support (SSE) for real-time typewriter UX
- [ ] Phase 2: Add RAG with pgvector for FAQ and station knowledge base

**Mobile impact**: Chat endpoint request/response format will change. Response will be dynamic instead of static. SSE streaming requires special handling in Flutter (`EventSource`).

---

## Phase 4: Reservation State Machine [PRIORITY: MEDIUM]

> See `.plan/REFACTORING.md` Section 3 for detailed design

- [ ] Define valid state transitions: PENDING -> CONFIRMED -> CHARGING -> COMPLETED; CANCELLED and FAILED as terminal states
- [ ] Create `internal/reservation/state.go` with `ValidateTransition()` function
- [ ] Integrate transition validation into `UpdateStatus()` and `Complete()` services
- [ ] Create migration: add `created_at`, `updated_at`, `confirmed_at`, `started_at`, `completed_at` to reservations
- [ ] Update frontend appointment page to reflect new states
- [ ] Update `PATCH /v1/reservations/:id` to validate transitions

**Mobile impact**: New reservation statuses (CONFIRMED, CHARGING, FAILED) will appear. Mobile should handle all states in UI.

---

## Phase 5: Mobile API Readiness [PRIORITY: MEDIUM]

> See `.plan/MOBILE_API.md` for full Flutter developer handoff guide

- [ ] Rename `mockLoad`/`mockStatus` JSON fields to `load`/`status` (blocked by Phase 1 completion)
- [ ] Add pagination to `GET /v1/stations` (currently returns all ~46 stations at once)
- [ ] Add pagination to `GET /v1/users/leaderboard` (currently only has `limit`, no offset/cursor)
- [ ] Add `GET /v1/users/:id/reservations` endpoint (currently reservations are embedded in profile, hardcoded to last 10)
- [ ] Add `GET /v1/reservations` endpoint for authenticated user's reservation list with filtering (status, date range)
- [ ] Consider adding `POST /v1/auth/refresh` for token refresh (currently JWT expires in 24h, user must re-login)
- [ ] Review all driver endpoints for consistent error codes and response shapes
- [ ] Update `.plan/MOBILE_API.md` after each phase completion

---

## Phase 6: Real-Time Features [PRIORITY: LOW]

- [ ] Add SSE endpoint `GET /v1/reservations/:id/stream` for charging status updates
- [ ] Push density updates to map via SSE
- [ ] Add Go `http.Flusher` based SSE infrastructure
- [ ] Frontend + Mobile: EventSource integration for live updates

---

## Phase 7: Testing [PRIORITY: ONGOING]

- [ ] Add unit tests for all service functions (start with `reservation/service_test.go`)
- [ ] Add integration tests for auth flow
- [ ] Add handler tests with httptest
- [ ] Set up CI pipeline (GitHub Actions)
- [ ] Add test coverage reporting
