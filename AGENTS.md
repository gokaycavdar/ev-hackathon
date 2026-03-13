# SmartCharge - Project Context

## Overview

SmartCharge is an EV charging ecosystem with a gamified driver experience (coins, XP, badges, leaderboard), operator dashboards, AI-powered station recommendations, and an AI chatbot. The project is a polyglot monorepo: Next.js 16 frontend at the repo root, Go (Gin) backend in `smartcharge-api/`.

This is a **thesis project**. The RL (reinforcement learning) component was requested by the advisor.

## Architecture

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, TailwindCSS, Leaflet | Repo root: `app/`, `components/`, `lib/` |
| Backend API | Go 1.25, Gin, SQLC (code-gen from SQL), pgx/v5 | `smartcharge-api/` |
| Database | PostgreSQL 15 (Docker), 5 migrations applied | `smartcharge-api/db/` |
| Infra | Docker Compose (Postgres + Go API), GitHub Actions CI | `docker-compose.yml`, `.github/workflows/` |

### Data Flow

```
Web Browser (port 3000) -> Next.js -> proxy rewrite /api/* -> Go API (port 8080, /v1/*) -> PostgreSQL (port 5432)
```

### Backend Pattern (Clean Architecture)

```
Handler (HTTP/Gin) -> Service (business logic) -> SQLC Queries (generated DB access)
```

Each domain module has up to 3 files: `dto.go`, `service.go`, `handler.go`.

### Domain Modules (smartcharge-api/internal/)

- `auth/` - JWT authentication, bcrypt (cost 12), login/register
- `station/` - Station CRUD, 24h timeslots, forecast-based load data
- `reservation/` - Reservation lifecycle (PENDING->CONFIRMED->CHARGING->COMPLETED), atomic completion (coins/XP/CO2/badges in transaction)
- `user/` - Profile, badges with progress, leaderboard
- `badge/` - Badge listing, progress tracking, `BadgeEvaluator` (event-driven, runs inside reservation TX)
- `campaign/` - Operator campaign CRUD, real badge targeting (intersects user badges)
- `operator/` - Operator dashboard stats, station management (ownership-checked)
- `review/` - Station rating/review system (1-5 stars, post-completion)
- `recommend/` - RL-based station scoring (weighted composite: load 35%, green 25%, distance 20%, price 15%)
- `chat/` - AI chatbot (Ollama LLM integration, [EXT]-owned, has known auth bug)
- `ai/` - LLM provider interface (`Provider` with `Complete`/`Stream` methods)
- `demouser/` - Demo user helper
- `config/` - Environment config loader
- `middleware/` - JWT auth middleware, CORS
- `response/` - Unified JSON response envelope `{ success, data, error, meta }`
- `errors/` - AppError type + sentinel errors

### Frontend Structure (Next.js App Router)

- `app/page.tsx` - Login/Register
- `app/(driver)/driver/` - Driver dashboard: map, stations, appointments, wallet
- `app/(operator)/operator/` - Operator dashboard: stats, stations CRUD, campaigns, settings
- `components/` - ChatWidget, GlobalAIWidget, Map, ui/Card
- `lib/auth.ts` - JWT token management, authFetch wrapper, response unwrapper

## Coding Conventions

### Go Backend

- Use the `response.OK()` / `response.Err()` wrapper for all handler responses
- Use `apperrors.NewXxxError()` for domain errors; always log original errors before wrapping
- Services accept `context.Context` as first parameter
- Constructor DI pattern: `NewService(queries *generated.Queries) *Service`
- SQLC generates the DB layer -- edit `db/queries/*.sql`, then run `sqlc generate -f db/sqlc.yaml` from `smartcharge-api/`
- Migrations in `db/migrations/` (5 applied: reservation_fixes, badge_engine, state_machine, station_reviews)
- After Go code changes, rebuild Docker: `docker compose build api && docker compose up -d api`

### Frontend

- TailwindCSS for styling; custom theme in `tailwind.config.ts`
- Use `authFetch()` from `lib/auth.ts` for authenticated API calls
- Use `unwrapResponse<T>()` to extract `data` from the Go backend's envelope
- File-based routing via Next.js App Router

## Plan Files

- `.plan/AUDIT.md` - Codebase audit findings with fix status tracking
- `.plan/ROADMAP.md` - Phased implementation plan with completion checkboxes

## Project Status

**Completed:** Phases 1-6, 9, 10A-10D (reservation fixes, recommendations, field renames, AI Smart Pick, badge engine, state machine, UX polish, security hardening, review system, CI/CD, score UX polish)

**Remaining:**
- Phase 7 (Chatbot/RAG) -- [EXT]-owned. Known issues: no auth middleware, auto-reservation side effect, no conversation memory
- Phase 8 (Testing) -- deferred. Zero test files currently exist.
