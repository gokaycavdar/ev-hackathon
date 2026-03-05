# SmartCharge - Changelog

> Lightweight record of changes per phase. Code is the source of truth.

---

## Phase 1: Reservation System Fixes (2026-03-05)

**Summary:** Fixed all 8 critical security and logic flaws in the reservation system.

### Backend Changes
- `internal/reservation/service.go` -- Major rewrite: ownership check, server-side isGreen validation, status transitions, capacity control, saved_co2 fix
- `internal/reservation/handler.go` -- UpdateStatus and Complete now extract userID from JWT
- `internal/errors/errors.go` -- Added `NewForbiddenError()`
- `internal/station/service.go` -- `GetStation` slot status changed to `loadStatus(load)` for consistency
- `db/queries/reservations.sql` -- Updated `CompleteReservation` (added saved_co2=$3), added `CountActiveReservations`
- `db/migrations/000002_reservation_fixes.up.sql` -- NEW: capacity column + reservation timestamps
- `db/migrations/000002_reservation_fixes.down.sql` -- NEW: rollback
- `db/generated/*` -- Regenerated via `sqlc generate`

### Frontend Changes
- `app/(driver)/driver/appointments/page.tsx` -- Replaced 3 hardcoded `50` values with `reservation.earnedCoins`

### Key Decisions
- Simplified transitions for Phase 1: `PENDING -> [COMPLETED, CANCELLED]`. Full state machine (CONFIRMED, CHARGING, FAILED) deferred to Phase 6.
- `isGreen` green window: hours 23, 0, 1, 2, 3, 4, 5, 6 (8 hours)
- Station capacity default: 3 concurrent reservations per hour

---

## Phase 2: Recommendation Bug Fixes + Geolocation (2026-03-05)

**Summary:** Fixed all backend recommendation bugs, removed dead code, added browser geolocation to frontend.

### Backend Changes
- `internal/station/handler.go` -- Fixed hardcoded date (dynamic `time.Now()` + `day` param), updated default coords to station cluster center, removed misleading `algorithm` comment
- `internal/recommend/service.go` -- Added JSON struct tags to `ScoredStation`, removed `SetScorer()`, added `sortAndLimit()`/`joinParts()` moved from deleted `linear.go`
- `internal/recommend/linear.go` -- **DELETED** (dead code, never instantiated)

### Frontend Changes
- `lib/useGeolocation.ts` -- **NEW**: Browser geolocation hook with fallback to DEFAULT_CENTER
- `lib/utils-ai.ts` -- **DELETED** (dead code, zero imports, values don't match backend)
- `components/Map.tsx` -- Added `userLocation` prop, blue pulsing marker for user position, map auto-centers on user location
- `app/(driver)/driver/page.tsx` -- Imported `useGeolocation`, passes user location to `<Map>` component
- `components/GlobalAIWidget.tsx` -- Imported `useGeolocation`, passes lat/lng to `/api/stations/recommend` endpoint
- `app/(driver)/driver/wallet/page.tsx` -- Imported `useGeolocation`, passes lat/lng to `/api/stations/recommend` endpoint

### Key Decisions
- Stations are in Manisa/Izmir area (not Istanbul as previously assumed). Default coords updated to match.
- `sortAndLimit()` and `joinParts()` were dependencies of `rl.go` defined in `linear.go` -- moved to `service.go` before deleting `linear.go`
- RL feedback loop (`UpdateQValue`) left unwired -- [EXT] task
- Frontend `GlobalAIWidget.tsx` still has dual-casing fallback for ScoredStation fields (can be simplified later)

---

## Phase 3: Field Rename + Coin/CO2 Consistency (2026-03-05)

**Summary:** Renamed `mockLoad`/`mockStatus` JSON fields to `load`/`status`, fixed coin calculation in GlobalAIWidget, fixed XP progress in wallet page.

### Backend Changes
- `internal/station/dto.go` -- JSON tags changed: `"mockLoad"` -> `"load"`, `"mockStatus"` -> `"status"` (Go field names kept as `MockLoad`/`MockStatus`)

### Frontend Changes
- `components/Map.tsx` -- `StationMarker` type fields renamed from `mockLoad?`/`mockStatus?` to `load?`/`status?`; all usage refs updated
- `app/(driver)/driver/page.tsx` -- All `mockLoad`/`mockStatus` references updated to `load`/`status` (~11 occurrences)
- `app/(operator)/operator/stations/page.tsx` -- Map component prop mapping updated
- `components/GlobalAIWidget.tsx` -- Fixed coin calculation: replaced fabricated `load < 30 ? 50 : load < 50 ? 35 : 20` with correct `isGreen ? 50 : 10` based on green hour window (23-06)
- `app/(driver)/driver/wallet/page.tsx` -- Fixed XP progress: replaced hardcoded "450 XP kaldi" with dynamic `((Math.floor(xp/500)+1)*500) - xp`

### Key Decisions
- Go struct field names (`MockLoad`, `MockStatus`) kept unchanged to avoid touching SQLC-generated code; only JSON serialization tags changed
- Green hour window for coin calculation in GlobalAIWidget matches backend definition: hours 23, 0, 1, 2, 3, 4, 5, 6

---

## Phase 4: Driver Page AI Smart Pick (2026-03-05)

**Summary:** Replaced fake JS sort-based "AI Smart Pick" with real `/api/stations/recommend` endpoint call. Shows AI scores with component breakdown, navigates to recommended stations.

### Frontend Changes
- `app/(driver)/driver/page.tsx` -- Major rewrite of AI Smart Pick panel:
  - Removed fake `recommendation` useMemo that did JS sort on `load` field
  - Added `ScoredStation` type, `aiRecs` state, `fetchRecommendations()` callback
  - `fetchRecommendations()` calls `/api/stations/recommend?limit=5` with user's lat/lng from browser geolocation
  - Recommendations fetched alongside slots when station modal opens
  - New `aiRecommendation` useMemo finds best alternative (highest score, excluding selected station)
  - New `currentStationScore` useMemo shows selected station's AI score if it's in the results
  - Score component breakdown (load, green, distance, price) with visual progress bars
  - Three UI states: high density warning + alternative, normal station with score, fallback suggestion
  - All recommendation cards navigate to the station (reuses existing `handleStationSelect`)
  - Cleaned up unused imports (BatteryCharging, Navigation, TrendingDown, BarChart3, useRef)

### Key Decisions
- Fetch recommendations on every station modal open (not cached) -- ensures fresh scores
- Show "better alternative" suggestion only when alternative score > current + 5 (avoids noise)
- Kept eco slot booking button in normal station view when green slots are available

---

## Phase 5: Dynamic Badge Engine (2026-03-05)

**Summary:** Replaced 100% static badge system with fully dynamic event-driven badge evaluation. Badges are now earned in real-time when reservations are completed, with progress tracking for all badges.

### Backend Changes (New Files)
- `db/migrations/000003_badge_engine.up.sql` -- **NEW**: `badge_criteria` table (badge_id, metric, threshold, time_window), `badge_progress` table (user_id, badge_id, metric, current_count), `earned_at` column on `user_badges`, seed data for 5 badge criteria
- `db/migrations/000003_badge_engine.down.sql` -- **NEW**: rollback
- `internal/badge/evaluator.go` -- **NEW**: `Evaluator` struct with `Evaluate()` method (runs inside reservation TX), `Event` struct, `matchMetrics()` helper, `AwardedBadge` DTO

### Backend Changes (Modified Files)
- `db/queries/badges.sql` -- Added 7 new queries: `ListBadgeCriteria`, `UpsertBadgeProgress`, `GetBadgeProgressForUser`, `CheckUserHasBadge`, `AwardBadge`, `GetBadgesWithProgress`, `ListUserBadgeIDs`
- `db/queries/users.sql` -- Updated `AddUserBadge` to include `earned_at` parameter
- `db/generated/*` -- Regenerated via `sqlc generate`
- `internal/badge/service.go` -- Added `BadgeProgressResponse` DTO, `ListWithProgress(ctx, userID)` method
- `internal/badge/handler.go` -- Added `Progress()` handler for `GET /v1/badges/progress` (auth required), `RegisterRoutes` now accepts `authMiddleware` param
- `internal/reservation/service.go` -- Added `badgeEvaluator` field, badge `Event` construction + `Evaluate()` call inside `Complete()` TX between `UpdateUserStats` and `tx.Commit()`
- `internal/reservation/dto.go` -- Added `AwardedBadges []badge.AwardedBadge` to `CompleteResponse`
- `internal/campaign/service.go` -- `ListForUser()` now accepts `userID int32`, queries user's earned badge IDs, intersects with campaign target badges for real `matchedBadges`
- `internal/campaign/handler.go` -- Extracts `userID` from JWT context, passes to `ListForUser()`
- `internal/user/service.go` -- Added `GetBadgesWithProgress()` call in `GetProfile()`, maps to `allBadgeItems` array
- `internal/user/dto.go` -- Added `BadgeProgressItem` struct, `AllBadges` field on `ProfileResponse`
- `cmd/server/main.go` -- `badge.NewEvaluator()` wired into reservation service, badge handler `RegisterRoutes` call updated with `authMiddleware`

### Frontend Changes
- `app/(driver)/driver/wallet/page.tsx` -- Badges tab rewritten: fetches `/api/badges/progress`, shows all badges with earned status (green checkmark) or progress bars (current/threshold with percentage)

### Key Decisions
- Badge evaluation is **non-fatal**: if it fails, reservation completion still succeeds (error logged but swallowed)
- `window` renamed to `time_window` in migration (PostgreSQL reserved keyword conflict)
- `consecutive_green_charges` changed to `green_charges` for simplicity (total count, not streak)
- Evaluator is stateless (no struct fields) -- injected via `NewEvaluator()` into reservation service
- Station's `DensityProfile` fetched inside TX via `qtx.GetStationByID()` for intercity badge matching
- Campaign `ListForUser()` does real badge matching now: queries `ListUserBadgeIDs`, intersects with campaign's `targetBadges`

---

## Phase 6: Charging Simulation / State Machine (2026-03-05)

**Summary:** Implemented full reservation state machine (PENDING -> CONFIRMED -> CHARGING -> COMPLETED) with backend endpoints and frontend UI stepping through each state. Replaced the old "skip-to-complete" flow with proper intermediate states.

### Backend Changes (New Files)
- `db/migrations/000004_state_machine.up.sql` -- **NEW**: adds `confirmed_at`, `started_at`, `completed_at` TIMESTAMPTZ columns to reservations
- `db/migrations/000004_state_machine.down.sql` -- **NEW**: rollback

### Backend Changes (Modified Files)
- `db/queries/reservations.sql` -- Added `ConfirmReservation` (sets CONFIRMED + confirmed_at), `StartCharging` (sets CHARGING + started_at), `FailReservation` (sets FAILED); updated `CompleteReservation` to also set `completed_at = NOW()`. Updated `CountActiveReservations` to exclude FAILED status.
- `db/queries/users.sql` -- `GetUserReservations` now selects `confirmed_at`, `started_at`, `completed_at` columns
- `db/generated/*` -- Regenerated via `sqlc generate` (Reservation model has 14 fields, GetUserReservationsRow has timestamps)
- `internal/reservation/service.go` -- Major rewrite: 6 status constants, full `validTransitions` map, `isTerminalStatus()` helper, `Confirm()` and `StartCharging()` methods (ownership verified), `Complete()` now requires CHARGING status (not PENDING)
- `internal/reservation/dto.go` -- Added `ConfirmedAt`, `StartedAt`, `CompletedAt` pointer fields to `ReservationResponse`
- `internal/reservation/handler.go` -- Added `Confirm()` and `StartCharging()` handlers, registered `POST /:id/confirm` and `POST /:id/start` routes
- `internal/user/dto.go` -- Added `ConfirmedAt`, `StartedAt`, `CompletedAt` pointer fields to `ReservationItem`
- `internal/user/service.go` -- Maps new timestamp fields from `GetUserReservationsRow` to `ReservationItem`

### Frontend Changes
- `app/(driver)/driver/appointments/page.tsx` -- Major rewrite:
  - Reservation type extended with `confirmedAt`, `startedAt`, `completedAt` optional fields
  - `STATUS_CONFIG` map defines label, color, and icon for all 6 statuses
  - `StatusBadge` component for consistent status display
  - Active reservations section shows PENDING, CONFIRMED, and CHARGING together
  - `ActiveReservationCard` component with state-specific action buttons:
    - PENDING: "Onayla" (confirm) + "İptal Et" (cancel)
    - CONFIRMED: "Şarjı Başlat" (start charging) + "İptal Et"
    - CHARGING: pulsing "Şarj devam ediyor..." indicator
  - Visual state machine progress bar (4 steps: Bekliyor -> Onaylandı -> Şarj -> Tamam)
  - Simulation flow: Confirm -> Start Charging (opens modal) -> animation -> Complete
  - Terminal section combines CANCELLED and FAILED with appropriate icons
  - Loading states on action buttons with spinner

### New API Endpoints
- `POST /v1/reservations/:id/confirm` -- PENDING -> CONFIRMED (auth required)
- `POST /v1/reservations/:id/start` -- CONFIRMED -> CHARGING (auth required)

### State Machine
```
PENDING   -> CONFIRMED | CANCELLED
CONFIRMED -> CHARGING  | CANCELLED
CHARGING  -> COMPLETED | FAILED
```
COMPLETED, CANCELLED, and FAILED are terminal states (no further transitions).

### Key Decisions
- `Complete()` now requires CHARGING status (was PENDING in Phase 1) -- forces the full flow
- Timestamp fields use `*string` (pointer) with `omitempty` to avoid null in JSON for unset times
- Cancel is allowed from PENDING and CONFIRMED but not CHARGING
- Frontend simulation modal opens automatically after StartCharging succeeds
- No changes to `main.go` wiring -- `RegisterRoutes` handles new routes internally

---

## Bug Fixes (2026-03-05, post Phase 6)

**Summary:** Fixed 4 user-reported bugs. Root cause for bugs 1-3 was a stale Docker container running pre-Phase-2 Go binary.

### Bug 1: Station density/load showing 0% on map
- **Root cause:** Docker API container was never rebuilt after Phase 3 field rename. Container had old binary without `load`/`status` JSON tags.
- **Fix:** `docker compose build api && docker compose up -d api` -- rebuilt container with all Phase 1-6 code.
- **Verified:** `GET /v1/stations` now returns `"load":49,"status":"YELLOW"` etc.

### Bug 2: Reservation confirm error ("Onaylama basarisiz")
- **Root cause:** Same stale container -- `/confirm` and `/start` endpoints (Phase 6) didn't exist in the running binary.
- **Fix:** Same rebuild.
- **Verified:** Full state machine works: PENDING -> CONFIRMED -> CHARGING -> COMPLETED with all timestamps.

### Bug 3: Badges JSON parse error
- **Root cause:** Same stale container -- `GET /v1/badges/progress` endpoint (Phase 5) didn't exist in the running binary.
- **Fix:** Same rebuild.
- **Verified:** Endpoint returns valid JSON with all badge data (metric, threshold, currentCount, earned, earnedAt).

### Bug 4: Badges UI not showing criteria/conditions
- **Fix:** Rewrote badges tab in `wallet/page.tsx`:
  - Added criteria label mapping (`night_charges` -> "Gece saatlerinde (23:00-06:00) sarj" etc.)
  - Shows "Kosul: 5x Gece saatlerinde sarj" box for every badge
  - Progress bar shown for ALL badges (green for earned, blue for in-progress)
  - Fraction display: `currentCount/threshold tamamlandi` + percentage
  - Earned badges show full green bar + "Kazanildi (date)"

### Additional Fix: RL day-of-week bug
- `internal/recommend/rl.go:55` -- Go `Weekday()` returns Sunday=0, but seed script uses Monday=0 convention
- **Fix:** `dayOfWeek := (int(req.TimeSlot.Weekday()) + 6) % 7`
- Ensures forecast queries match the correct day's data
