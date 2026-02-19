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

### Data Flow

```
Browser (port 3000) -> Next.js -> proxy rewrite /api/* -> Go API (port 8080, /v1/*) -> PostgreSQL (port 5432)
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

**Before starting any implementation task, read the relevant `.plan/` file to understand the current state and planned approach.**

## Known Critical Issues (Read .plan/AUDIT.md for details)

1. **Security**: Privilege escalation via role override in registration, no RBAC enforcement, no resource ownership checks
2. **Mock Systems**: Badges are static/seeded (no earning logic), chat is a hardcoded stub, recommendations use frozen seed-time data
3. **Code Quality**: 7 duplicate `handleError()` copies, 5 duplicate `parseID()` copies, no tests, no structured logging
4. **Legacy Names**: `ecocharge:*` localStorage keys, `evcharge` DB name fallback
