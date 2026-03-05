# SmartCharge - AI-Driven EV Charging Ecosystem

An intelligent EV charging station management platform with AI-powered station recommendations (RL scoring), a gamified reward system (coins, XP, badges, leaderboard), full charging simulation with state machine, and an operator analytics dashboard.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS, Leaflet | `/` (repo root) |
| Backend | Go 1.25 (Gin), Clean Architecture, JWT auth, SQLC | `smartcharge-api/` |
| Database | PostgreSQL 15, golang-migrate, SQLC (code-gen) | `smartcharge-api/db/` |
| AI/ML | RL-based station scorer (Q-learning), Ollama LLM chatbot | `smartcharge-api/internal/recommend/`, `internal/ai/` |
| Infrastructure | Docker Compose (PostgreSQL + Go API) | `docker-compose.yml` |

```
Browser (3000) -> Next.js -> proxy /api/* -> Go API (8080, /v1/*) -> PostgreSQL (5432)
Flutter App (planned) -> Go API (8080, /v1/*) -> PostgreSQL (5432)
```

## Features

### Driver
- Interactive map with real-time station status markers (Leaflet, color-coded GREEN/YELLOW/RED)
- AI-powered station recommendations with composite scoring (load 35%, green 25%, distance 20%, price 15% + RL bonus)
- Green energy slots (hours 23:00-06:00) with 5x coin bonus and CO2 savings
- Full charging simulation with state machine (PENDING -> CONFIRMED -> CHARGING -> COMPLETED)
- Dynamic badge engine with progress tracking (5 badges with criteria-based earning)
- Gamification: XP, coins, badges, leaderboard
- 24-hour slot-based reservations with capacity control
- Digital wallet with real-time stats, badge progress, and AI recommendations
- Grouped time slot display (Gece/Sabah/Ogle/Aksam/Gece Gec) with load indicators
- Browser geolocation for distance-aware recommendations

### Operator
- Revenue, usage, and CO2 analytics dashboard
- Campaign management (discounts, bonus coins, badge targeting)
- Station CRUD with density-based load monitoring
- 24-hour load forecasting (linear regression on 2-month simulated data)

## Prerequisites

- Docker & Docker Compose
- Go 1.25+ (for backend development)
- Node.js 20+ and npm (for frontend development)
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI (for running migrations)
- [SQLC](https://sqlc.dev/) (only if modifying database queries)

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/gokaycavdar/smartcharge.git
cd smartcharge
```

Copy environment files:

```bash
# Frontend
cp .env.example .env

# Backend
cp .env.example smartcharge-api/.env
```

### 2. Start the database and API

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and the Go API (port 8080). The API waits for the database health check before starting.

### 3. Run database migrations

```bash
migrate -database "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable" -path smartcharge-api/db/migrations up
```

There are 4 migrations:
1. `000001_init_schema` - Base tables (users, stations, badges, reservations, campaigns, forecasts)
2. `000002_reservation_fixes` - Capacity column, timestamps, saved_co2
3. `000003_badge_engine` - Badge criteria, badge progress, earned_at
4. `000004_state_machine` - Reservation state timestamps (confirmed_at, started_at, completed_at)

### 4. Seed the database

```bash
cd smartcharge-api
go run ./scripts/seed.go
```

This creates:
- 10 driver users with varied stats (XP 900-5500, coins 300-2500)
- 3 operator companies (Zorlu Enerji, Esarj A.S., Sharz.net)
- 46 stations (Manisa/Izmir area) with density profiles (central/suburban/outskirt)
- 5 badges with criteria (Gece Kusu, Eco Sampiyonu, Hafta Sonu Savascisi, Erken Kalkan, Uzun Yolcu)
- 4 badge-targeted campaigns
- 7,728 density forecast records (46 stations x 7 days x 24 hours)

### 5. Start the frontend

```bash
cd ..
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Users

All demo users use password `demo123`.

| Role | Email | Name | XP |
|------|-------|------|----|
| Driver | `driver@test.com` | Hackathon Surucu | 2100 |
| Driver | `zeynep@test.com` | Zeynep Demir | 5500 |
| Driver | `fatma@test.com` | Fatma Ozturk | 4100 |
| Driver | `burak@test.com` | Burak Sahin | 3800 |
| Driver | `ayse@test.com` | Ayse Yilmaz | 3200 |
| Operator | `info@zorlu.com` | Zorlu Enerji | - |
| Operator | `info@esarj.com` | Esarj A.S. | - |
| Operator | `info@sharz.net` | Sharz.net | - |

## Project Structure

```
smartcharge/
├── app/
│   ├── (driver)/               # Driver dashboard pages
│   │   └── driver/
│   │       ├── page.tsx        # Map + station detail + AI Smart Pick
│   │       ├── appointments/   # Reservation list + charging simulation
│   │       └── wallet/         # Stats, badges, recommendations, leaderboard
│   ├── (operator)/             # Operator dashboard pages
│   │   └── operator/
│   │       ├── page.tsx        # Dashboard stats
│   │       ├── stations/       # Station CRUD
│   │       ├── campaigns/      # Campaign management
│   │       └── settings/       # Operator settings
│   └── page.tsx                # Login/Register page
├── components/
│   ├── ChatWidget.tsx          # AI assistant widget
│   ├── GlobalAIWidget.tsx      # Floating AI recommendation widget
│   └── Map.tsx                 # Leaflet map component
├── lib/
│   └── auth.ts                 # JWT auth utilities (authFetch, token management)
├── smartcharge-api/
│   ├── cmd/server/             # Main entry point (main.go)
│   ├── db/
│   │   ├── migrations/         # SQL migrations (000001-000004)
│   │   ├── queries/            # SQLC query definitions
│   │   └── generated/          # SQLC generated code (do not edit)
│   ├── internal/
│   │   ├── ai/                 # LLM provider interface + Ollama implementation
│   │   ├── auth/               # Authentication (JWT, login, register)
│   │   ├── badge/              # Badge listing + evaluator (dynamic badge engine)
│   │   ├── campaign/           # Campaign CRUD + badge-targeted matching
│   │   ├── chat/               # AI chatbot (Ollama LLM integration)
│   │   ├── config/             # Environment config
│   │   ├── demouser/           # Demo user endpoint
│   │   ├── errors/             # Application error types (AppError + sentinels)
│   │   ├── middleware/         # JWT auth + CORS middleware
│   │   ├── operator/           # Operator dashboard + stats
│   │   ├── recommend/          # RL-based station recommendation engine
│   │   ├── reservation/        # Reservation lifecycle + state machine
│   │   ├── response/           # Unified JSON response wrapper
│   │   ├── station/            # Station CRUD + timeslot generation
│   │   └── user/               # User profiles + leaderboard
│   └── scripts/seed.go         # Database seed script
├── .plan/                      # Implementation plan files
│   ├── ROADMAP.md              # Phased implementation checklist
│   ├── AUDIT.md                # Codebase audit findings
│   ├── REFACTORING.md          # Technical design notes
│   ├── MOBILE_API.md           # Flutter API guide
│   └── CHANGELOG.md            # Change log
└── docker-compose.yml          # PostgreSQL + Go API
```

## Backend Development

### Running the Go API locally (without Docker)

```bash
# Start only PostgreSQL
docker run --name smartcharge-db -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=admin -e POSTGRES_DB=evcharge -p 5432:5432 -d postgres:15

# Run migrations, seed, and start API
cd smartcharge-api
migrate -database "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable" -path db/migrations up
go run ./scripts/seed.go
go run ./cmd/server
```

The API starts at `http://localhost:8080`. Health check: `GET /health`.

### SQLC workflow

After modifying query files in `db/queries/`:

```bash
cd smartcharge-api
sqlc generate -f db/sqlc.yaml
```

This regenerates Go code in `db/generated/`. Do not edit generated files directly.

### API response format

All endpoints return a unified JSON envelope:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": null
}
```

### Key endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/auth/login` | No | Login, returns JWT |
| POST | `/v1/auth/register` | No | Register new user |
| GET | `/v1/stations` | No | List all stations (with load/status) |
| GET | `/v1/stations/:id` | No | Station detail + 24h timeslots |
| GET | `/v1/stations/forecast` | No | Density forecasts (day/hour params) |
| GET | `/v1/stations/recommend` | No | AI-powered station recommendations |
| POST | `/v1/reservations` | Yes | Create reservation |
| PATCH | `/v1/reservations/:id` | Yes | Update reservation status |
| POST | `/v1/reservations/:id/confirm` | Yes | Confirm reservation |
| POST | `/v1/reservations/:id/start` | Yes | Start charging |
| POST | `/v1/reservations/:id/complete` | Yes | Complete reservation (awards coins/XP/badges) |
| GET | `/v1/users/:id` | Yes | User profile + badges + reservations |
| PUT | `/v1/users/:id` | Yes | Update profile (ownership enforced) |
| GET | `/v1/users/leaderboard` | No | XP leaderboard |
| GET | `/v1/company/my-stations` | Yes | Operator's stations + stats |
| GET | `/v1/campaigns` | Yes | Operator's campaigns |
| GET | `/v1/campaigns/for-user` | Yes | Active campaigns matching user badges |
| GET | `/v1/badges` | No | All badge definitions |
| GET | `/v1/badges/progress` | Yes | All badges with user progress |
| POST | `/v1/chat` | No | AI chatbot (Ollama LLM) |
| GET | `/v1/demo-user` | No | Demo user fallback |

### Reservation State Machine

```
PENDING -> CONFIRMED -> CHARGING -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
CHARGING -> CANCELLED
CHARGING -> FAILED
```

Each transition has a dedicated endpoint and is validated server-side.

## Frontend Development

```bash
npm run dev     # Start dev server (port 3000)
npm run build   # Production build
npm run lint    # ESLint
```

The frontend uses `authFetch()` from `lib/auth.ts` for all API calls, which automatically attaches JWT Bearer tokens and handles 401 redirects.

## Environment Variables

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (reserved for future use) |
| `NODE_ENV` | `development` or `production` |

### Backend (`smartcharge-api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `PORT` | API server port (default: 8080) |
| `GIN_MODE` | `debug` or `release` |
| `FRONTEND_URL` | Frontend URL for CORS |
| `LLM_URL` | Ollama LLM URL (e.g., `http://localhost:11434`) |
| `LLM_MODEL` | Ollama model name (e.g., `llama3`) |
