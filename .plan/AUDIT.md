# SmartCharge - Codebase Audit Report

> Last updated: 2026-02-19
> Status: Complete audit of all modules

---

## 1. Badge System Audit

### Verdict: 100% Static, Zero Dynamic Earning Logic

**5 badges** are seeded in `scripts/seed.go`. 4 are hardcoded to the demo driver. There is NO runtime badge-earning logic anywhere.

| Finding | Location |
|---------|----------|
| `AddUserBadge` SQL exists but only called from seed script | `scripts/seed.go:408` |
| Badge service only has `List()` - no `Award()`, no `CheckEligibility()` | `internal/badge/service.go` |
| Only endpoint is `GET /v1/badges` - no POST to award | `internal/badge/handler.go` |
| `reservation.Complete()` awards coins/XP/CO2 but never checks/awards badges | `internal/reservation/service.go:96-160` |
| No event bus, hooks, cron, or triggers exist | Codebase-wide |
| Campaign badge matching stubbed: `MatchedBadges: []BadgeResponse{}` | `internal/campaign/service.go:82` |
| Frontend has hardcoded locked badge mockup ("Hizli Sarj Ustasi" 1/5) | `app/(driver)/driver/wallet/page.tsx:293-304` |
| `user_badges` table has no `earned_at` timestamp | `db/migrations/000001_init_schema.up.sql:48-52` |

Badge descriptions define criteria never evaluated (e.g., "Gece tarifesinde 5 sarj" = 5 night charges - no counter exists).

---

## 2. Smart Recommendations Audit

### Verdict: Mocked/Hardcoded with Seed-Time-Only Regression

| Component | Status | Location |
|-----------|--------|----------|
| Linear Regression | Real algorithm, runs ONLY during `seed.go` on synthetic random data | `scripts/seed.go` |
| Station List | Fields named `MockLoad` / `MockStatus`. Load = seed-derived density. Status = threshold (>65 RED, >45 YELLOW, else GREEN) | `internal/station/service.go:63-64`, `dto.go:34-35` |
| NextGreenHour | Hardcoded `"23:00"` for ALL stations | `internal/station/service.go:65` |
| Station Detail | Queries `station_density_forecasts` for per-hour load. But green/not-green is hardcoded hour range 23:00-06:00 | `internal/station/service.go:136-143` |
| Forecast Endpoint | Sorted by `predicted_load ASC`. Frontend takes top 3, labels "AI Oneri" | `internal/station/service.go:255-287` |
| Frontend Driver Page | Simple min-value sort on `mockLoad`. Not ML | `app/(driver)/driver/page.tsx:240-257` |
| GlobalAIWidget | Hardcoded coin thresholds (<30=50, <50=35, else 20). Labels this "Linear Regression ile tahmin edilen" | `components/GlobalAIWidget.tsx` |

**Regression coefficients are pre-computed and frozen in DB. No runtime inference, no retraining, no real data input.**

---

## 3. Chatbot Audit

### Verdict: Pure Static Stub, Zero Intelligence

| Aspect | Finding | Location |
|--------|---------|----------|
| User message | Completely ignored: `_ = c.Request.Body` | `internal/chat/handler.go:29` |
| Response | Same hardcoded Turkish string every time | `internal/chat/service.go:68` |
| Recommendations | First 3 stations by ID, hardcoded hours/coins/reasons | `internal/chat/service.go:51-63` |
| LLM SDK | None imported | `go.mod` |
| OPENAI_API_KEY | Placeholder in `.env.example`, NOT loaded by `config.go` | `.env.example`, `internal/config/config.go` |
| RAG/Embeddings/Vectors | Zero references anywhere | Codebase-wide |
| Architecture readiness | Clean service pattern, context propagation, easy to extend | `cmd/server/main.go:68` |

---

## 4. Security Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| S1 | **Privilege escalation**: Users send `{"role":"OPERATOR"}` in register to self-assign operator role, bypassing domain check | CRITICAL | `internal/auth/dto.go:14`, `service.go:100-101` |
| S2 | **No RBAC enforcement**: `GetUserRole()` defined but never called. Any driver can access operator endpoints | CRITICAL | `internal/middleware/auth.go:79`, `main.go:92-97` |
| S3 | **No resource ownership checks**: Station/campaign/reservation mutations don't verify requester owns resource | CRITICAL | Multiple service files |
| S4 | Hardcoded JWT secret fallback `"default-dev-secret"` | HIGH | `internal/config/config.go:22` |
| S5 | JWT secret exposed in `docker-compose.yml` (tracked in git) | HIGH | `docker-compose.yml:27` |
| S6 | Hardcoded CORS localhost origins always allowed | MEDIUM | `internal/middleware/cors.go:15-16` |
| S7 | Chat endpoint has no auth middleware | MEDIUM | `cmd/server/main.go:98` |
| S8 | No rate limiting on any endpoint | MEDIUM | Codebase-wide |

---

## 5. Code Quality Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| Q1 | 7 identical copies of `handleError()` across all handler files | HIGH | All `handler.go` files |
| Q2 | 5 copies of `parseID()` across handler files | HIGH | station/reservation/user/campaign/operator handlers |
| Q3 | 4 duplicate badge DTO structs (`BadgeItem` in auth + user, `BadgeResponse` in badge + campaign) | HIGH | `auth/dto.go`, `user/dto.go`, `badge/service.go`, `campaign/dto.go` |
| Q4 | Services swallow original errors - `return apperrors.ErrInternal` loses actual error | HIGH | All `service.go` files |
| Q5 | Campaign badge linking silently ignores errors | MEDIUM | `internal/campaign/service.go:139,216-221,242` |
| Q6 | `MockLoad`/`MockStatus` field names are misleading (data is real, from DB density) | MEDIUM | `internal/station/dto.go:34-35` |
| Q7 | Zero test files (`*_test.go`) exist | HIGH | Codebase-wide |
| Q8 | Dead code: `ParseToken()` never called | LOW | `internal/auth/jwt.go:23` |
| Q9 | Dead code: `Paginated()` never used | LOW | `internal/response/response.go:47` |

---

## 6. Database Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| D1 | No CHECK constraint on `users.role` (accepts any string) | HIGH | `migrations:9` |
| D2 | No CHECK constraint on `reservations.status` | HIGH | `migrations:38` |
| D3 | No CHECK constraint on `campaigns.status` | HIGH | `migrations:58` |
| D4 | No CHECK on `stations.density_profile` | MEDIUM | `migrations:26` |
| D5 | `user_badges` has no `earned_at` timestamp | MEDIUM | `migrations:48-52` |
| D6 | `reservations` has no `created_at` / `updated_at` | MEDIUM | `migrations:29-39` |
| D7 | Missing index on `reservations.status` | LOW | Schema |

---

## 7. Logging & Observability

| Finding | Location |
|---------|----------|
| Only `log.Println`/`log.Fatalf` from stdlib, exclusively in `main.go` | `cmd/server/main.go` |
| Zero logging in any service or handler | All internal modules |
| Errors returned as generic `apperrors.ErrInternal` - original context lost | All service files |
| No structured logging, no request ID, no correlation tracing | Codebase-wide |

---

## 8. Legacy/Redundancy Issues

| # | Issue | Location | Action |
|---|-------|----------|--------|
| R1 | localStorage keys use old name `ecocharge:*` | `lib/auth.ts:6-7`, `app/page.tsx:88-89` | Rename to `smartcharge:*` |
| R2 | Fallback DB name `evcharge` | `internal/config/config.go:21` | Rename to `smartcharge` |
| R3 | 359-line `MIGRATION_STATUS.md` dev journal | `smartcharge-api/MIGRATION_STATUS.md` | Archive or delete |
| R4 | README says password is `password123`, seed uses `demo123` | `README.md` vs `seed.go` | Fix README |
| R5 | No old Prisma files or `app/api` routes remain | Confirmed clean | No action |
