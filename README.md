# SmartCharge - AI-Driven EV Charging Ecosystem

An intelligent EV charging station management platform with green energy slot recommendations, a gamified reward system, and an operator analytics dashboard.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS | `/` (repo root) |
| Backend | Go (Gin), Clean Architecture, JWT auth | `smartcharge-api/` |
| Database | PostgreSQL 15, SQLC (code-gen) | `smartcharge-api/db/` |
| Infrastructure | Docker Compose | `docker-compose.yml` |

The frontend proxies all `/api/*` requests to the Go backend at `http://localhost:8080/v1/*` via Next.js rewrites (see `next.config.ts`).

## Features

### Driver
- Interactive map with real-time station status (Leaflet)
- AI assistant for smart charging recommendations
- Green energy slots with CO2 savings and bonus coins
- Gamification: XP, badges, and leaderboard
- Hourly slot-based reservations
- Digital wallet with coin rewards

### Operator
- Revenue, usage, and CO2 analytics dashboard
- Campaign management (discounts, bonus coins, badge targeting)
- Station CRUD with density-based load monitoring
- 24-hour load forecasting (linear regression)

## Prerequisites

- Docker & Docker Compose
- Go 1.25+ (for backend development)
- Node.js 20+ and npm (for frontend development)
- [golang-migrate](https://github.com/golang-migrate/migrate) CLI (for running migrations)
- [SQLC](https://sqlc.dev/) (only if modifying database queries)

## Quick Start

### 1. Clone and configure

```bash
git clone <repo-url>
cd smartcharge
```

Copy environment files:

```bash
# Frontend
cp .env.example .env

# Backend
cp smartcharge-api/.env.example smartcharge-api/.env
```

### 2. Start the database and API

```bash
docker-compose up -d
```

This starts PostgreSQL (port 5432) and the Go API (port 8080). The API waits for the database health check before starting.

### 3. Run database migrations

```bash
migrate -database "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable" \
        -path smartcharge-api/db/migrations up
```

### 4. Seed the database

```bash
go run ./scripts/seed.go
```

This creates demo users, 46 stations (Manisa/Izmir), 5 badges, 4 campaigns, and 7,728 forecast records.

### 5. Start the frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Users

| Role | Email | Password |
|------|-------|----------|
| Driver | `driver@test.com` | `password123` |
| Operator | `info@zorlu.com` | `password123` |

## Project Structure

```
smartcharge/
├── app/
│   ├── (driver)/           # Driver dashboard pages
│   ├── (operator)/         # Operator dashboard pages
│   └── page.tsx            # Login/Register page
├── components/
│   ├── ChatWidget.tsx      # AI assistant widget
│   ├── GlobalAIWidget.tsx  # Floating AI widget
│   └── Map.tsx             # Leaflet map component
├── lib/
│   ├── auth.ts             # JWT auth utilities (authFetch, token management)
│   └── utils-ai.ts         # Green energy helpers
├── smartcharge-api/
│   ├── cmd/server/         # Main entry point
│   ├── db/
│   │   ├── migrations/     # SQL migrations
│   │   ├── queries/        # SQLC query definitions
│   │   └── generated/      # SQLC generated code (do not edit)
│   ├── internal/
│   │   ├── auth/           # Authentication (JWT, login, register)
│   │   ├── station/        # Station CRUD + timeslot generation
│   │   ├── reservation/    # Reservation lifecycle
│   │   ├── user/           # User profiles + leaderboard
│   │   ├── campaign/       # Campaign CRUD + for-user listing
│   │   ├── operator/       # Operator dashboard + stats
│   │   ├── badge/          # Badge listing
│   │   ├── chat/           # AI chat (stub)
│   │   ├── demouser/       # Demo user endpoint
│   │   ├── config/         # Environment config
│   │   ├── middleware/      # JWT auth + CORS middleware
│   │   ├── response/       # Unified JSON response wrapper
│   │   └── errors/         # Application error types
│   └── scripts/seed.go     # Database seed script
└── docker-compose.yml      # PostgreSQL + Go API
```

## Backend Development

### Running the Go API locally (without Docker)

```bash
cd smartcharge-api
cp .env.example .env        # Edit DATABASE_URL if needed
make run                    # or: go run ./cmd/server
```

The API starts at `http://localhost:8080`. Health check: `GET /health`.

### SQLC workflow

After modifying query files in `db/queries/`:

```bash
cd smartcharge-api
make sqlc                   # or: sqlc generate
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
| GET | `/v1/stations` | No | List all stations |
| GET | `/v1/stations/:id` | No | Station detail + 24h timeslots |
| GET | `/v1/stations/forecast` | No | Density forecasts |
| POST | `/v1/reservations` | Yes | Create reservation |
| POST | `/v1/reservations/:id/complete` | Yes | Complete reservation |
| GET | `/v1/users/:id` | Yes | User profile |
| GET | `/v1/users/leaderboard` | No | XP leaderboard |
| GET | `/v1/company/my-stations` | Yes | Operator's stations + stats |
| GET | `/v1/campaigns` | Yes | Operator's campaigns |
| GET | `/v1/campaigns/for-user` | No | Active campaigns for drivers |
| GET | `/v1/badges` | No | All badges |
| POST | `/v1/chat` | No | AI chat (stub) |
| GET | `/v1/demo-user` | No | Demo user fallback |

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
