# SmartCharge - Implementation Roadmap

> Last updated: 2026-03-13 (Phase 10D completed)
> Focus: Fix critical bugs, complete core features, prepare for mobile
> Track progress by checking boxes as tasks are completed
> Owner legend: [CORE] = core team, [EXT] = external contributor (recommendation/chatbot dev)

---

## Phase 1: Reservation System Fixes [COMPLETED]

> All critical security and logic flaws fixed. Migration `000002_reservation_fixes` created.

- [x] **1.1** Ownership check on Cancel/Complete -- JWT `userID` verified against `reservation.userID`
- [x] **1.2** Server-side `isGreen` validation -- computed from hour, client value ignored
- [x] **1.3** Status transition validation -- `validateTransition()` rejects invalid state changes
- [x] **1.4** Capacity control -- `stations.capacity` column (default 3), `CountActiveReservations` query
- [x] **1.5** `saved_co2` written to reservations table in `CompleteReservation` SQL
- [x] **1.6** Simulation coin display uses `reservation.earnedCoins` instead of hardcoded `50`
- [x] **1.7** Slot status consistency -- `GetStation` uses `loadStatus(load)` like `ListStations`

**Phase 1 transitions (simplified):** `PENDING -> COMPLETED | CANCELLED`. Full state machine deferred to Phase 6.

---

## Phase 2: Recommendation Bug Fixes + Geolocation [COMPLETED]

> The recommendation engine was built by an external contributor and is structurally sound.
> Backend bugs fixed, dead code removed, browser geolocation integrated into frontend.

- [x] **2.1** Fix hardcoded date -- replaced `time.Date(2026,2,25,...)` with dynamic date from `time.Now()` + `day` param
- [x] **2.2** Fix default coordinates -- default coords now match station cluster center (38.614, 27.405); frontend sends real user coords via browser Geolocation API
- [x] **2.3** Add JSON struct tags to `ScoredStation` -- `json:"stationId"`, `json:"score"`, etc.
- [x] **2.4** Implement `day` query param in handler -- reads from `c.Query("day")` and computes correct target date
- [x] **2.5** Remove dead code:
  - [x] Delete `internal/recommend/linear.go` (never instantiated)
  - [x] Remove `Service.SetScorer()` from `recommend/service.go`
  - [x] Delete `lib/utils-ai.ts` (never imported, values don't match backend)
- [x] **2.6** Remove misleading handler comments about `algorithm` query param
- [x] **2.7** Browser geolocation: `useGeolocation` hook created, user location marker on map, lat/lng passed to recommend endpoint from GlobalAIWidget and wallet page

**Note:** RL feedback loop (`UpdateQValue`) is NOT wired -- this is a task for [EXT] if they want RL to actually learn. Without it, RLScorer = weighted scoring + random noise.

---

## Phase 3: Field Rename + Coin/CO2 Consistency [COMPLETED]

> JSON field names cleaned up, frontend coin/XP inconsistencies fixed.

- [x] **3.1** Backend DTO rename: JSON tags `"mockLoad"` -> `"load"`, `"mockStatus"` -> `"status"` in `station/dto.go`
- [x] **3.2** Frontend references update -- all `mockLoad`/`mockStatus` refs updated across `page.tsx`, `Map.tsx`, `GlobalAIWidget.tsx`, operator `stations/page.tsx`
- [x] **3.3** Fix GlobalAIWidget coin calculation -- replaced fabricated load-based thresholds with `isGreen`-based `50 : 10` matching backend
- [x] **3.4** Fix wallet XP progress -- dynamic `((Math.floor(xp/500)+1)*500) - xp` instead of hardcoded "450 XP kaldi"

---

## Phase 4: Driver Page AI Smart Pick [COMPLETED]

> The "AI Smart Pick" panel now calls the real recommend endpoint.
> Score component breakdown (load, green, distance, price) is displayed.
> Clicking a recommendation navigates to that station and opens its detail.

- [x] **4.1** Replace frontend JS sort with `/api/stations/recommend` API call
  - Passes user's lat/lng via browser Geolocation API (with fallback to station center)
  - Passes current hour
  - Displays scored results with explanation
- [x] **4.2** Show score component breakdown (load, green, distance, price) with visual progress bars
- [x] **4.3** Recommendation cards navigate to the station on the map and open detail modal

---

## Phase 5: Dynamic Badge Engine [COMPLETED]

> The single biggest functional gap. Badges were 100% static -- now fully dynamic with
> event-driven evaluation, progress tracking, and real-time badge awarding.

- [x] **5.1** Create migration: `badge_criteria` table (badge_id, metric, threshold, time_window)
- [x] **5.2** Create migration: `badge_progress` table (user_id, badge_id, metric, current_count, last_updated)
- [x] **5.3** Create migration: add `earned_at TIMESTAMPTZ DEFAULT NOW()` to `user_badges` table
- [x] **5.4** Write SQLC queries for badge criteria, progress tracking, and badge awarding
- [x] **5.5** Create `internal/badge/evaluator.go` with rule-based `BadgeEvaluator`
  - Runs INSIDE the `reservation.Complete()` transaction (not after commit)
  - Increments progress counters based on event metrics
  - Awards badge when threshold is met
- [x] **5.6** Seed `badge_criteria` data for all 5 existing badges:
  - Gece Kusu: `night_charges` (hour 23-06), threshold 5
  - Eco Sampiyonu: `green_charges` (isGreen=true), threshold 10
  - Hafta Sonu Savascisi: `weekend_charges` (Saturday/Sunday), threshold 5
  - Erken Kalkan: `morning_charges` (hour 06-09), threshold 5
  - Uzun Yolcu: `intercity_charges` (densityProfile = outskirt), threshold 3
- [x] **5.7** Connect campaign badge matching -- `ListForUser()` now accepts userID, intersects user badges with campaign target badges
- [x] **5.8** Update `POST /v1/reservations/:id/complete` response to include `awardedBadges[]`
- [x] **5.9** Update frontend wallet page:
  - Removed hardcoded "Hizli Sarj Ustasi 1/5" mockup
  - Shows ALL badges with real progress (earned + unearned with progress bars)
  - New `GET /v1/badges/progress` endpoint returns all badges with user's progress
  - Profile API response includes `allBadges` array with progress data

---

## Phase 6: Charging Simulation / State Machine [COMPLETED]

> Full reservation state machine implemented. Backend endpoints for each transition,
> frontend UI with step-by-step flow and visual progress bar.

- [x] **6.1** Define valid state transitions in `internal/reservation/service.go`:
  ```
  PENDING -> CONFIRMED -> CHARGING -> COMPLETED
  PENDING -> CANCELLED
  CONFIRMED -> CANCELLED
  CHARGING -> FAILED
  ```
- [x] **6.2** Create migration `000004_state_machine`: add `confirmed_at`, `started_at`, `completed_at` timestamps to reservations
- [x] **6.3** Integrate `ValidateTransition()` into UpdateStatus, Confirm, StartCharging, and Complete services
- [x] **6.4** Update frontend appointment page to reflect all states (status badges, action buttons per state, state machine progress bar)
- [x] **6.5** Enhance simulation UI to step through CONFIRMED -> CHARGING -> COMPLETED states with backend API calls at each transition

**New endpoints:** `POST /v1/reservations/:id/confirm`, `POST /v1/reservations/:id/start`

---

## Phase 9: UX Polish + Seed Expansion [COMPLETED]

> RL score bug fixed, stuck CHARGING recovery, frontend UX improvements, seed data expanded.

- [x] **9.1** Fix RL score components (distance/green/price multipliers were not on 0-100 scale)
- [x] **9.2** Fix stuck CHARGING reservations (cancel + resume buttons added)
- [x] **9.3** Recommendations UI/UX (horizontal scroll cards in wallet/driver pages)
- [x] **9.4** Time slots UI/UX (grouped time ranges replacing 24 individual slot buttons)
- [x] **9.5** Seed expansion (10 drivers, 3 operators, badge criteria fix)
- [x] **9.6** README update

---

## Phase 10A: Security Hardening [COMPLETED]

> Critical security vulnerabilities from the audit fixed.

- [x] **10A.1** C1: Role escalation fix -- Removed `Role` field from `RegisterRequest` DTO, role now always server-determined (DRIVER default + operator domain auto-detection)
- [x] **10A.2** C3/C5: Operator station ownership checks -- `UpdateStation` and `DeleteStation` verify `OwnerID` matches JWT user
- [x] **10A.3** C4: Campaign ownership checks -- `Update` and `Delete` verify `OwnerID` matches JWT user
- [x] **10A.4** C6: JWT secret hardening -- Default `"default-dev-secret"` removed; startup panics if `JWT_SECRET` is empty in `GIN_MODE=release`; warning logged in debug mode
- [x] **10A.5** H3: Dockerfile non-root user -- Container runs as `appuser` instead of root
- [x] **10A.6** H6: Duplicate reservation prevention -- `HasActiveReservation` SQLC query prevents same user from booking same station+date+hour twice
- [x] **10A.7** M1: bcrypt cost increased from 10 to 12

---

## Phase 10B: Station Rating/Review System [COMPLETED]

> Drivers can rate (1-5 stars) and review stations after completing a reservation. Station detail shows average rating and reviews list.

- [x] **10B.1** Create migration: `station_reviews` table (user_id, station_id, reservation_id, rating 1-5, comment, created_at) + indexes + UNIQUE on reservation_id
- [x] **10B.2** SQLC queries: CreateReview, GetStationReviews, GetStationAverageRating, GetUserReviewForReservation, GetStationReviewSummary
- [x] **10B.3** Backend: `internal/review/` module (dto.go, service.go, handler.go) -- POST /v1/reviews (auth), GET /v1/stations/:id/reviews (public, paginated)
- [x] **10B.4** Update station detail response with average rating + review count (enriched via `GetStationAverageRating` in station handler)
- [x] **10B.5** Frontend: ReviewForm component on completed reservation cards (appointments page) + reviews section in station detail modal (driver page)

---

## Phase 10C: CI/CD Pipeline [COMPLETED]

> GitHub Actions CI + Railway deployment config.

- [x] **10C.1** GitHub Actions workflow: lint, build, test (Go + Next.js) + Docker build verification
- [x] **10C.2** Railway deployment configuration (railway.toml for API + frontend, Nixpacks for Next.js, Dockerfile for Go API)
- [x] **10C.3** Environment variable management for production (.env.example updated, next.config.ts uses API_URL env var)

---

## Phase 10D: Review Persistence + Score UX Polish [COMPLETED]

> Review state now persists across page reloads. RL score breakdowns simplified to user-friendly Turkish labels with color-coded bars across all 3 UI surfaces.

- [x] **10D.1** Review state persistence -- `GetUserReviewedReservationIDs` SQLC query added; profile response includes `reviewedReservationIds` field; frontend initializes reviewed state from server on load
- [x] **10D.2** 409 CONFLICT handling -- Frontend gracefully handles duplicate review attempts (marks as reviewed + shows Turkish info message)
- [x] **10D.3** AI Smart Pick score UX -- Technical labels replaced with friendly Turkish (emoji icons + color-coded bars: green >= 60, yellow >= 30, red < 30); raw numeric values removed
- [x] **10D.4** GlobalAIWidget "Sana Ozel" score UX -- "RL Puanlama" header simplified to "Akilli Puanlama"; technical metrics replaced with same friendly format; `algorithm` state variable removed; RL Bonus display removed
- [x] **10D.5** Wallet recommendations score UX -- Same friendly format applied; unused imports cleaned up

---

## Phase 7: Chatbot / RAG Improvements [OWNER: EXT]

> The chatbot core works (Ollama LLM). These are improvements for the external contributor.
> See `.plan/AUDIT.md` Section 4 for current state.
> The chat system is well-isolated -- changes here do NOT affect the rest of the codebase.

- [ ] **7.1** Fix critical auth bug: add auth middleware to chat route, propagate userID to service
- [ ] **7.2** Inject `ai.Provider` via DI instead of hard-coding `OllamaProvider` in constructor
- [ ] **7.3** Wire `recommend.Service` into chat -- use scored stations instead of raw `ListStations()`
- [ ] **7.4** Remove backend auto-reservation from AI actions -- return intent to frontend, let user confirm
- [ ] **7.5** Fix `GlobalAIWidget` to use `authFetch()` instead of plain `fetch()`
- [ ] **7.6** Create migration: `chat_sessions` + `chat_messages` tables for conversation memory
- [ ] **7.7** Add SSE streaming -- wire `Provider.Stream()` into handler
- [ ] **7.8** Wire RL feedback loop -- call `RLScorer.UpdateQValue()` from `reservation.Complete()`
- [ ] **7.9** [FUTURE] RAG with pgvector for FAQ and station knowledge base

---

## Phase 8: Testing [PRIORITY: ONGOING -- with each phase]

> Tests should be written alongside each phase, not as a separate effort.
> Currently there are ZERO test files in the entire codebase.

- [ ] **8.1** Phase 1 tests: reservation ownership, isGreen validation, capacity, transitions
- [ ] **8.2** Phase 5 tests: badge evaluator, progress counting, threshold triggering
- [ ] **8.3** Handler tests with httptest for critical endpoints
- [ ] **8.4** Integration tests for auth flow

---

## Mobile API Readiness [DEFERRED]

> Deferred indefinitely. If mobile work resumes, API docs should be regenerated from scratch.
