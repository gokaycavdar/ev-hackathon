# SmartCharge - Codebase Audit Report

> Last updated: 2026-02-19
> Scope: Functional audit of mock/stub systems that need to become real

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
