# SmartCharge - Project Context

## Overview

SmartCharge is an EV charging ecosystem with a gamified driver experience (coins, XP, badges, leaderboard), operator dashboards, AI-powered station recommendations, and an AI chatbot. The project is a polyglot monorepo: Next.js 16 frontend at the repo root, Go (Gin) backend in `smartcharge-api/`.

## Architecture

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, TailwindCSS, Leaflet | Repo root: `app/`, `components/`, `lib/` |
| Backend API | Go 1.25, Gin, SQLC (code-gen from SQL), pgx/v5 | `smartcharge-api/` |
| Database | PostgreSQL 15 (Docker), 7 tables, golang-migrate | `smartcharge-api/db/` |
| Infra | Docker Compose (Postgres + Go API) | `docker-compose.yml` |
| Mobile (planned) | Flutter (driver-only app consuming the Go API directly) | Separate repo |

### Data Flow

```
Web Browser (port 3000) -> Next.js -> proxy rewrite /api/* -> Go API (port 8080, /v1/*) -> PostgreSQL (port 5432)
Flutter App -> Go API (port 8080, /v1/*) -> PostgreSQL (port 5432)
```

### Backend Pattern (Clean Architecture)

```
Handler (HTTP/Gin) -> Service (business logic) -> SQLC Queries (generated DB access)
```

Each domain module has up to 3 files: `dto.go`, `service.go`, `handler.go`.

### Domain Modules (smartcharge-api/internal/)

- `auth/` - JWT authentication, bcrypt, login/register
- `station/` - Station CRUD, 24h timeslots, forecast-based load data
- `reservation/` - Reservation lifecycle, atomic completion (coins/XP/CO2 in transaction)
- `user/` - Profile, badges, leaderboard
- `badge/` - Badge listing (read-only, no earning logic yet)
- `campaign/` - Operator campaign CRUD, badge targeting (stub matching)
- `operator/` - Operator dashboard stats, station management
- `chat/` - AI chatbot (currently a static stub)
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
- `lib/utils-ai.ts` - Green energy helper functions

## Coding Conventions

### Go Backend

- Use the `response.OK()` / `response.Err()` wrapper for all handler responses
- Use `apperrors.NewXxxError()` for domain errors; always log original errors before wrapping
- Services accept `context.Context` as first parameter
- Constructor DI pattern: `NewService(queries *generated.Queries) *Service`
- SQLC generates the DB layer -- edit `db/queries/*.sql`, then run `make sqlc`
- Migrations in `db/migrations/` -- run `make migrate-up`
- All driver-facing endpoints must be mobile-friendly (see `.plan/MOBILE_API.md`)

### Frontend

- TailwindCSS for styling; custom theme in `tailwind.config.ts`
- Use `authFetch()` from `lib/auth.ts` for authenticated API calls
- Use `unwrapResponse<T>()` to extract `data` from the Go backend's envelope
- File-based routing via Next.js App Router

## Active Improvement Plan

This project has a detailed improvement plan in the `.plan/` directory:

- `.plan/AUDIT.md` - Complete codebase audit findings (security, quality, technical debt)
- `.plan/ROADMAP.md` - Phased implementation plan with checklists
- `.plan/REFACTORING.md` - Detailed refactoring proposals for recommendations, badges, and chat
- `.plan/MOBILE_API.md` - Flutter developer handoff guide (driver API endpoint catalog)

**Before starting any implementation task, read the relevant `.plan/` file to understand the current state and planned approach.**

## Autonomous Execution Mode

**Work through Phase 5 without asking for user confirmation.** Do not ask questions or wait for approval -- just implement each phase and move to the next. The user will say "devam et" (continue) at each turn to keep you going.

Execution order: Phase 2 -> Phase 3 -> Phase 4 -> Phase 5. After each phase:
1. Verify builds pass (`go build ./...` in `smartcharge-api/`, `npx next build` in root)
2. Update `.plan/` files immediately (ROADMAP checkboxes, AUDIT.md fixes, CHANGELOG.md)
3. Continue to next phase without stopping

**Phases 1-6 are COMPLETE.** Phase 7 (Chatbot/RAG) is [EXT]-owned. Phase 8 (Testing) is next.

## Current Priority: Functional Completeness

The primary goal right now is making the mock/stub systems actually work:

1. **Badges are static** - Seeded in DB, no earning logic. Needs event-driven `BadgeEvaluator`. (See ROADMAP Phase 5)
2. **Chat has LLM integration (Ollama)** - But has critical auth bug and missing features. (See ROADMAP Phase 7, [EXT] owner)
3. **Recommendations engine exists** - But has bugs: hardcoded date, wrong default coords, no geolocation, dead code. (See ROADMAP Phase 2)
4. **MockLoad/MockStatus field names** - Need renaming + coin formula inconsistencies. (See ROADMAP Phase 3)
5. **Driver page AI Smart Pick is fake** - Does JS sort, not real AI. (See ROADMAP Phase 4)
6. **Mobile app coming** - A Flutter app will consume the same Go API directly (driver side only). Endpoints must be mobile-ready. (See `.plan/MOBILE_API.md`)
