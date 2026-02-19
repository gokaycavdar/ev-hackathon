# SmartCharge - Implementation Roadmap

> Last updated: 2026-02-19
> Track progress by checking boxes as tasks are completed

---

## Phase 1: Critical Security Fixes [PRIORITY: IMMEDIATE]

- [ ] **S1: Fix privilege escalation** - Remove `Role` field from `RegisterRequest` DTO. Always determine role server-side via email domain check only.
  - Files: `internal/auth/dto.go` (remove Role field), `internal/auth/service.go:100-114` (remove `req.Role` usage)

- [ ] **S2: Add RBAC middleware** - Create `OperatorRequired()` middleware that checks `GetUserRole() == "OPERATOR"`. Apply to all operator routes.
  - Files: `internal/middleware/auth.go` (add new middleware), `cmd/server/main.go:97` (wrap operator routes)

- [ ] **S3: Add ownership checks** - In station update/delete, campaign update/delete, reservation complete/cancel, verify the authenticated user owns the resource.
  - Files: `internal/station/service.go:228`, `internal/reservation/service.go:73`, `internal/campaign/service.go`, `internal/operator/service.go`

- [ ] **S4: Remove hardcoded JWT fallback** - Panic if `JWT_SECRET` env var is empty in production (`GIN_MODE=release`).
  - File: `internal/config/config.go:22`

- [ ] **S5: Remove JWT secret from docker-compose** - Use `.env` file reference instead.
  - File: `docker-compose.yml:27`

- [ ] **S6: Add auth to chat endpoint** - Pass `authMiddleware` to `chatHandler.RegisterRoutes()`.
  - File: `cmd/server/main.go:98`

---

## Phase 2: Code Quality & DRY [PRIORITY: HIGH]

- [ ] **Q1: Extract shared `handleError()`** - Create `internal/response/handler_helpers.go` with a single `HandleError()`. Remove 7 duplicate copies.
  - Files: All `handler.go` files

- [ ] **Q2: Extract shared `parseID()`** - Add to the same helper file. Remove 5 duplicate copies.
  - Files: All `handler.go` files

- [ ] **Q3: Consolidate badge DTOs** - Create a single `BadgeResponse` struct in `internal/badge/dto.go`. Import from `auth/`, `user/`, `campaign/`.
  - Files: `auth/dto.go`, `user/dto.go`, `badge/service.go`, `campaign/dto.go`

- [ ] **Q4: Rename MockLoad/MockStatus** - Rename to `Load`/`Status` in Go DTO and all frontend files.
  - Backend: `internal/station/dto.go:34-35`
  - Frontend: `app/(driver)/driver/page.tsx`, `components/Map.tsx`, `app/(operator)/operator/stations/page.tsx`

- [ ] **R1: Rename localStorage keys** - `ecocharge:token` -> `smartcharge:token`, `ecocharge:userId` -> `smartcharge:userId`.
  - Files: `lib/auth.ts:6-7`, `app/page.tsx:88-89`

- [ ] **R2: Rename fallback DB name** - `evcharge` -> `smartcharge`.
  - File: `internal/config/config.go:21`

- [ ] **R4: Fix README password** - Change `password123` to `demo123` to match seed.
  - File: `README.md`

---

## Phase 3: Database Hardening [PRIORITY: HIGH]

Create new migration `000002_add_constraints.up.sql`:

- [ ] **D1-D3: Add CHECK constraints** on `users.role`, `reservations.status`, `campaigns.status`
- [ ] **D4: Add CHECK on `stations.density_profile`** - `IN ('central', 'suburban', 'outskirt')`
- [ ] **D5: Add `earned_at` column** to `user_badges` - `TIMESTAMPTZ DEFAULT NOW()`
- [ ] **D6: Add timestamps to `reservations`** - `created_at`, `updated_at` columns
- [ ] **D7: Add index on `reservations.status`**
- [ ] Update SQLC queries and regenerate code after migration

---

## Phase 4: Observability & Error Handling [PRIORITY: MEDIUM]

- [ ] **Add structured logging with `log/slog`** (Go stdlib, zero dependencies)
  - Create logger in `main.go`, inject into services via constructor
  - All service constructors get a `*slog.Logger` parameter

- [ ] **Log original errors before wrapping** - Every `return apperrors.ErrInternal` should be preceded by `s.logger.Error("context", "error", err)`
  - Files: All `service.go` files

- [ ] **Add request logging middleware** - Log method, path, status, duration, request ID
  - File: New `internal/middleware/logger.go`

- [ ] **Q5: Fix error swallowing in campaign badge linking**
  - File: `internal/campaign/service.go:139,216-221,242`

---

## Phase 5: Dead Code Cleanup [PRIORITY: LOW]

- [ ] Delete `ParseToken()` function - `internal/auth/jwt.go:23`
- [ ] Delete `Paginated()` function - `internal/response/response.go:47`
- [ ] Delete or archive `MIGRATION_STATUS.md` - `smartcharge-api/MIGRATION_STATUS.md`
- [ ] Remove hardcoded locked badge UI placeholder - `app/(driver)/driver/wallet/page.tsx:293-304`

---

## Phase 6: Dynamic Badge Earning Engine [PRIORITY: HIGH - Feature]

> See `.plan/REFACTORING.md` Section 2 for detailed design

- [ ] Create `internal/badge/evaluator.go` with `BadgeEvaluator` interface
- [ ] Create `badge_criteria` table (badge_id, metric, threshold, window)
- [ ] Create `badge_progress` table (user_id, badge_id, current_count, last_updated)
- [ ] Add `earned_at` to `user_badges` (done in Phase 3)
- [ ] Implement badge evaluation in `reservation.Complete()` transaction
- [ ] Connect campaign badge matching to real user badges
- [ ] Update frontend wallet page to show real progress

---

## Phase 7: Reservation State Machine [PRIORITY: MEDIUM - Feature]

> See `.plan/REFACTORING.md` Section 3 for detailed design

- [ ] Define state machine: PENDING -> CONFIRMED -> CHARGING -> COMPLETED; with CANCELLED and FAILED branches
- [ ] Add DB CHECK constraint for valid statuses
- [ ] Implement transition validation in `reservation/service.go`
- [ ] Add timestamps: `confirmed_at`, `started_at`, `completed_at`, `cancelled_at`
- [ ] Update frontend to reflect new states

---

## Phase 8: Smart Recommendations Engine [PRIORITY: HIGH - Feature]

> See `.plan/REFACTORING.md` Section 1 for detailed design

- [ ] Define `Scorer` interface in `internal/recommend/scorer.go`
- [ ] Implement `LinearRegressionScorer` (migrate logic from seed.go)
- [ ] Create composite scoring: load (40%) + green bonus (25%) + proximity (20%) + campaign (15%)
- [ ] Replace `MockLoad`/`MockStatus` with real scoring results
- [ ] Add user location support to scoring
- [ ] Build forecast retraining pipeline (ingest real reservation data)

---

## Phase 9: AI Chatbot with LLM Integration [PRIORITY: MEDIUM - Feature]

> See `.plan/REFACTORING.md` Section 4 for detailed design

- [ ] Define `AIProvider` interface in `internal/ai/provider.go`
- [ ] Add LLM API key to `config.go`
- [ ] Implement `OpenAIProvider` (or Claude)
- [ ] Rewrite `chat/service.go` to parse messages, build context-aware prompts
- [ ] Add conversation memory (session-scoped, DB-backed)
- [ ] Add streaming support (SSE) for typewriter UX
- [ ] Phase 2: Add RAG with pgvector

---

## Phase 10: Real-Time Features [PRIORITY: LOW - Feature]

- [ ] Add SSE endpoint `GET /v1/reservations/:id/stream` for charging status
- [ ] Push density updates to map via SSE
- [ ] Add Go `http.Flusher` based SSE infrastructure
- [ ] Frontend: EventSource integration for live updates

---

## Phase 11: Testing [PRIORITY: ONGOING]

- [ ] Add unit tests for all service functions (start with `reservation/service_test.go`)
- [ ] Add integration tests for auth flow
- [ ] Add handler tests with httptest
- [ ] Set up CI pipeline (GitHub Actions)
- [ ] Add test coverage reporting
