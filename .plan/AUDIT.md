# SmartCharge - Codebase Audit Report

> Last updated: 2026-03-13
> Scope: Full codebase audit -- security, functional gaps, dead code, data integrity

---

## 1. Reservation System Audit

### Verdict: ALL CRITICAL FLAWS FIXED (Phase 1, completed 2026-03-05)

All 8 findings below were fixed in Phase 1. Migration `000002_reservation_fixes` applied.

| Finding | Status | Fix |
|---------|--------|-----|
| No ownership check on Cancel/Complete | **[FIXED]** | Handler extracts userID from JWT; service verifies `reservation.UserID == userID` |
| `isGreen` not validated server-side | **[FIXED]** | Server computes `isGreenHour(parseHourFromString(req.Hour))`; client value ignored |
| No status transition validation | **[FIXED]** | `validateTransition()` with full state machine: PENDING->CONFIRMED->CHARGING->COMPLETED, +CANCELLED/FAILED (Phase 1 + Phase 6) |
| No capacity/slot tracking | **[FIXED]** | `stations.capacity` column (default 3); `CountActiveReservations` query enforces limit |
| `saved_co2` not written to reservation record | **[FIXED]** | `CompleteReservation` SQL now sets `saved_co2 = $3` |
| Simulation always shows "+50 coins" | **[FIXED]** | `appointments/page.tsx` uses `reservation.earnedCoins` instead of hardcoded `50` |
| Slot status meaning inconsistent | **[FIXED]** | `GetStation` slots now use `loadStatus(load)` matching `ListStations` |
| No created_at/updated_at timestamps | **[FIXED]** | Migration 000002 adds both columns to reservations table |

---

## 2. Badge System Audit

### Verdict: ALL CRITICAL GAPS FIXED (Phase 5, completed 2026-03-05)

All 8 findings below were fixed in Phase 5. Migration `000003_badge_engine` applied.

| Finding | Status | Fix |
|---------|--------|-----|
| `AddUserBadge` SQL only called from seed script | **[FIXED]** | `AwardBadge` query called by `BadgeEvaluator` inside `reservation.Complete()` TX |
| Badge service only has `List()` | **[FIXED]** | Added `ListWithProgress()` method returning all badges with user progress |
| Only endpoint is `GET /v1/badges` | **[FIXED]** | Added `GET /v1/badges/progress` (auth required) returning earned/unearned badges with progress |
| `reservation.Complete()` never checks/awards badges | **[FIXED]** | `BadgeEvaluator.Evaluate()` called INSIDE the completion TX |
| No event bus, hooks, cron, or triggers exist | **[FIXED]** | Inline evaluation in TX (no event bus needed -- synchronous, atomic) |
| Campaign badge matching stubbed `MatchedBadges: []` | **[FIXED]** | `ListForUser(ctx, userID)` queries user badges, intersects with campaign target badges |
| Frontend hardcoded locked badge mockup | **[FIXED]** | Replaced with real `/api/badges/progress` data showing all badges with progress bars |
| `user_badges` table has no `earned_at` | **[FIXED]** | Migration 000003 adds `earned_at TIMESTAMPTZ DEFAULT NOW()` |

---

## 3. Smart Recommendations Audit

### Verdict: Core bugs fixed (Phase 2, completed 2026-03-05). RL feedback loop still unwired [EXT].

**What was built (by external contributor):**
- `internal/recommend/` package: `Scorer` interface, `RLScorer` (Q-learning)
- `GET /v1/stations/recommend` endpoint wired into `station.Handler`
- Composite scoring: load (35%) + green (25%) + distance (20%) + price (15%) + RL bonus (5% max, currently always 0)
- Haversine distance calculation
- Frontend `GlobalAIWidget.tsx` rewritten to display RL-scored results

| Finding | Status | Fix |
|---------|--------|-----|
| `LinearRegressionScorer` is dead code | **[FIXED]** | `linear.go` deleted; `sortAndLimit`/`joinParts` moved to `service.go` |
| Hardcoded date bug (`time.Date(2026,2,25,...)`) | **[FIXED]** | Dynamic date from `time.Now()` + `day` query param support |
| Default coordinates are Manisa (distance scores meaningless) | **[FIXED]** | Default coords updated to station cluster center; frontend sends real browser geolocation via `useGeolocation` hook |
| No JSON struct tags on `ScoredStation` | **[FIXED]** | Added `json:"camelCase"` tags to all fields |
| `SetScorer()` dead code | **[FIXED]** | Removed from `recommend/service.go` |
| Misleading comment about `algorithm` query param | **[FIXED]** | Comment removed |
| RL feedback loop NOT wired (`UpdateQValue()` never called) | OPEN [EXT] | Q-table always empty, `rl_bonus` always 0 |
| `GetEpsilon()`, `GetQTableSize()` dead code | OPEN (LOW) | Kept for potential debugging use |

**MockLoad/MockStatus renamed in Phase 3:**
- `station/dto.go` -- JSON tags `"mockLoad"` -> `"load"`, `"mockStatus"` -> `"status"` **[FIXED]**
- All frontend references updated (driver page, Map, GlobalAIWidget, operator stations) **[FIXED]**
- `NextGreenHour: "23:00"` still hardcoded (minor, not a field rename issue)

---

## 4. AI Chatbot Audit

### Verdict: Core LLM integration done (Ollama), but has critical auth bug and missing features

**What was built (by external contributor):**
- `internal/ai/provider.go` -- `Provider` interface + `OllamaProvider` with Complete/Stream support (244 lines)
- `internal/chat/service.go` -- Rewritten: parses user message, builds context-aware Turkish system prompt, calls Ollama LLM, parses structured `[ACTION]...[/ACTION]` output for reservation creation
- `internal/chat/handler.go` -- Rewritten: `ShouldBindJSON` parses `ChatRequest`
- Config updated with `LLMURL` and `LLMModel`

**Remaining issues:**

| Finding | Severity | Location |
|---------|----------|----------|
| **Auth bug: `userID: 0`** -- chat endpoint has NO auth middleware, reservation created from AI action uses `userID=0`, which either fails (FK violation) or creates orphaned reservation | CRITICAL | `chat/service.go:165`, `chat/handler.go` (no auth middleware in RegisterRoutes), `main.go:103` |
| **Provider hard-coded in constructor** -- `OllamaProvider` created inside `NewService()` instead of DI injection | MEDIUM | `chat/service.go:27` |
| **Chat bypasses station scoring** -- calls raw `queries.ListStations()` instead of `recommend.Service` | MEDIUM | `chat/service.go:78,83` |
| **No conversation memory** -- each request is stateless, no `chat_sessions`/`chat_messages` tables | MEDIUM | -- |
| **`GlobalAIWidget` uses plain `fetch()` not `authFetch()`** -- will break if auth is added to chat endpoint | MEDIUM | `GlobalAIWidget.tsx:124-128` |
| **Stream() method exists but unused** -- `OllamaProvider.Stream()` never called from handler | LOW | `ai/provider.go` |
| **Two frontend consumers unaware of each other** -- `ChatWidget` and `GlobalAIWidget` both call `/api/chat` independently | LOW | -- |

**Modularity assessment:** Chat system is well-isolated. It is a leaf node in the dependency graph (no module imports chat). Provider can be swapped with one-line change. RAG can be added entirely within `chat/service.go`. Updates will NOT affect the rest of the system.

---

## 5. Coin/CO2/XP Logic Audit

### Coin Formula

```
coins = (isGreen ? 50 : 10) + campaignCoinReward
```

- Green charging gives 5x coins -- reasonable incentive for off-peak usage
- Campaign bonus is additive -- reasonable
- **[FIXED]:** `isGreen` is now validated server-side (Phase 1)

**Frontend coin inconsistencies:**

| Location | Formula | Correct? |
|----------|---------|----------|
| `reservation/service.go:44-52` (backend) | `isGreen ? 50 : 10 + campaign` | YES (source of truth) |
| `station/service.go:117-132` (station detail slots) | `isGreen ? 50 : 10 + campaign` | YES (matches) |
| `GlobalAIWidget.tsx` (forecast tab) | `isGreen ? 50 : 10` based on hour | **YES** -- **[FIXED]** in Phase 3, now matches backend |
| `appointments/page.tsx:358,425,436` (simulation) | Uses `reservation.earnedCoins` | **YES** -- **[FIXED]** in Phase 1 |
| `lib/utils-ai.ts:calculateGreenRewards` | `isGreen ? 50 : 10` (coins), `isGreen ? 25 : 5` (XP) | **[FIXED]** -- File deleted in Phase 2 (was dead code, never imported) |

### CO2 Formula

```
co2_saved = isGreen ? 2.5 : 0.5 (kg)
```

- Values are arbitrary, no scientific basis (no kWh tracking, no grid intensity data)
- Acceptable as gamification metric if not presented as real CO2 measurement
- **[FIXED]:** Now written to `reservations.saved_co2` column via `CompleteReservation` SQL (Phase 1)
- Frontend simulation shows incrementing CO2 (`prev.co2 + 0.08` per tick) reaching ~8.0 kg -- doesn't match either backend value

### XP Formula

```
xp = 100 (always, per completed reservation)
```

- Flat 100 XP regardless of green/non-green, station, time
- No variation, no streak bonuses, no differentiation
- Only used for leaderboard ranking (`ORDER BY xp DESC`)
- **[FIXED]:** Wallet page XP progress now computed dynamically (Phase 3)

---

## 6. Dead Code Inventory

| Item | Location | Action |
|------|----------|--------|
| ~~`LinearRegressionScorer` (entire file)~~ | ~~`internal/recommend/linear.go`~~ | **[REMOVED]** Phase 2 |
| ~~`Service.SetScorer()`~~ | ~~`recommend/service.go:47`~~ | **[REMOVED]** Phase 2 |
| `RLScorer.UpdateQValue()` | `recommend/rl.go:143` | Dead until feedback loop wired (other dev's task) |
| `RLScorer.CalculateReward()` | `recommend/rl.go:198` | Dead until feedback loop wired |
| `RLScorer.GetEpsilon()` | `recommend/rl.go:192` | Remove or keep for debugging |
| `RLScorer.GetQTableSize()` | `recommend/rl.go:215` | Remove or keep for debugging |
| ~~`lib/utils-ai.ts` (entire file)~~ | ~~Frontend~~ | **[REMOVED]** Phase 2 |
| ~~`minLoad/maxLoad/minDist/maxDist` computation~~ | ~~`linear.go:45-46`~~ | **[REMOVED]** with linear.go Phase 2 |

---

## 7. Frontend-Specific Issues

| Finding | Location |
|---------|----------|
| ~~Driver page "AI Smart Pick" is NOT AI -- does a JavaScript `sort` on `load`, never calls recommend endpoint~~ | **[FIXED]** Phase 4 -- calls real `/api/stations/recommend` endpoint |
| ~~Wallet XP level progress hardcoded "450 XP kaldi"~~ | **[FIXED]** Phase 3 -- dynamic calculation |
| ~~Wallet locked badge mockup hardcoded "Hizli Sarj Ustasi 1/5"~~ | **[FIXED]** Bug Fix Phase -- badges tab rewritten with real progress from API |
| Map centered on Manisa/Izmir area [38.614, 27.405] matching station cluster -- **[CORRECT]** stations are in this area | `components/Map.tsx` |
| localStorage keys use legacy name `ecocharge:token` | `lib/auth.ts` |

---

## 8. Post-Phase Bug Fixes

| Finding | Status | Fix |
|---------|--------|-----|
| Station load/status fields missing from API response (Bug 1) | **[FIXED]** | Docker container rebuilt with Phase 3 DTO changes |
| Reservation confirm endpoint 404 (Bug 2) | **[FIXED]** | Docker container rebuilt with Phase 6 routes |
| Badges progress JSON parse error (Bug 3) | **[FIXED]** | Docker container rebuilt with Phase 5 badge progress endpoint |
| Badges UI missing criteria/conditions (Bug 4) | **[FIXED]** | Wallet badges tab rewritten: criteria labels, progress bars for all badges, fraction display |
| RL day-of-week mismatch (Sunday=0 vs Monday=0) | **[FIXED]** | `rl.go:55`: `(int(Weekday()) + 6) % 7` aligns Go convention with seed data |

---

## 9. Security Hardening (Phase 10A)

### Verdict: ALL CRITICAL + HIGH SECURITY FIXES APPLIED (2026-03-13)

| Finding | Severity | Status | Fix |
|---------|----------|--------|-----|
| C1: Role escalation via `RegisterRequest.Role` | CRITICAL | **[FIXED]** | Removed `Role` field from DTO; role always server-determined (DRIVER default + operator domain auto-detection) |
| C3/C5: Operator station update/delete no ownership check | CRITICAL | **[FIXED]** | `UpdateStation` and `DeleteStation` verify `OwnerID.Int32 == ownerID` from JWT |
| C4: Campaign update/delete no ownership check | CRITICAL | **[FIXED]** | `Update` and `Delete` verify `existing.OwnerID == ownerID` from JWT |
| C6: JWT secret weak default `"default-dev-secret"` | CRITICAL | **[FIXED]** | Default removed; startup panics if `JWT_SECRET` empty in `GIN_MODE=release`; warning in debug |
| H3: Docker container runs as root | HIGH | **[FIXED]** | Dockerfile adds `appuser:appgroup`, runs as non-root |
| H6: Duplicate reservation possible (same user+station+date+hour) | HIGH | **[FIXED]** | `HasActiveReservation` SQLC query checks before create; returns 409 CONFLICT |
| M1: bcrypt cost 10 (should be 12) | MEDIUM | **[FIXED]** | Cost increased to 12 in `auth/service.go` |
