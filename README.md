# SmartCharge - AI-Driven EV Charging Ecosystem

An intelligent EV charging station management platform with AI-powered station recommendations (RL scoring), a gamified reward system (coins, XP, badges, leaderboard), full charging simulation with state machine, station rating/review system, and an operator analytics dashboard.

## Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS, Leaflet | `/` (repo root) |
| Backend | Go 1.25 (Gin), Clean Architecture, JWT auth, SQLC | `smartcharge-api/` |
| Database | PostgreSQL 15, golang-migrate, SQLC (code-gen) | `smartcharge-api/db/` |
| AI/ML | RL-based station scorer (Q-learning), Ollama LLM chatbot | `smartcharge-api/internal/recommend/`, `internal/ai/` |
| Infrastructure | Docker Compose (PostgreSQL + Go API), GitHub Actions CI | `docker-compose.yml`, `.github/workflows/` |

```
Browser (3000) -> Next.js -> proxy /api/* -> Go API (8080, /v1/*) -> PostgreSQL (5432)
```

## Features

### Driver
- Interactive map with real-time station status markers (Leaflet, color-coded GREEN/YELLOW/RED)
- AI-powered station recommendations with composite scoring (load 35%, green 25%, distance 20%, price 15% + RL bonus)
- Green energy slots (hours 23:00-06:00) with 5x coin bonus and CO2 savings
- Full charging simulation with state machine (PENDING -> CONFIRMED -> CHARGING -> COMPLETED)
- Dynamic badge engine with progress tracking (5 badges with criteria-based earning)
- Station rating and review system (1-5 stars, post-completion)
- Gamification: XP, coins, badges, leaderboard
- 24-hour slot-based reservations with capacity control and duplicate prevention
- Digital wallet with real-time stats, badge progress, and AI recommendations
- Grouped time slot display (Gece/Sabah/Ogle/Aksam/Gece Gec) with load indicators
- Browser geolocation for distance-aware recommendations

### Operator
- Revenue, usage, and CO2 analytics dashboard
- Campaign management (discounts, bonus coins, badge targeting)
- Station CRUD with ownership-enforced access control
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

There are 5 migrations:
1. `000001_init_schema` - Base tables (users, stations, badges, reservations, campaigns, forecasts)
2. `000002_reservation_fixes` - Capacity column, timestamps, saved_co2
3. `000003_badge_engine` - Badge criteria, badge progress, earned_at
4. `000004_state_machine` - Reservation state timestamps (confirmed_at, started_at, completed_at)
5. `000005_station_reviews` - Station reviews table (rating, comment, unique per reservation)

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
│   │   ├── migrations/         # SQL migrations (000001-000005)
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
│   │   ├── operator/           # Operator dashboard + station management
│   │   ├── recommend/          # RL-based station recommendation engine
│   │   ├── reservation/        # Reservation lifecycle + state machine
│   │   ├── response/           # Unified JSON response wrapper
│   │   ├── review/             # Station rating/review system
│   │   ├── station/            # Station CRUD + timeslot generation
│   │   └── user/               # User profiles + leaderboard
│   └── scripts/seed.go         # Database seed script
├── .plan/                      # Implementation plan files
│   ├── ROADMAP.md              # Phased implementation checklist
│   └── AUDIT.md                # Codebase audit findings
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

### API Response Format

All endpoints return a unified JSON envelope:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "station not found" },
  "meta": null
}
```

Paginated responses include `meta`:
```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": { "page": 1, "perPage": 10, "totalCount": 46 }
}
```

### Authentication

JWT-based authentication. Token is sent via the `Authorization` header:

```
Authorization: Bearer <token>
```

JWT claims contain `user_id` (int) and `role` (`"DRIVER"` or `"OPERATOR"`).

Endpoints marked with **Auth: Yes** require a valid JWT token. Endpoints marked **Auth: No** are public.

---

## API Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/auth/login` | No | Login, returns JWT + user data |
| POST | `/v1/auth/register` | No | Register new user |

**POST /v1/auth/login**
```json
// Request
{ "email": "driver@test.com", "password": "demo123" }

// Response data
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1, "name": "Hackathon Surucu", "email": "driver@test.com",
    "role": "DRIVER", "xp": 2100, "coins": 1500
  }
}
```

**POST /v1/auth/register**
```json
// Request
{ "name": "Yeni Kullanici", "email": "yeni@test.com", "password": "pass123" }

// Response data
{ "token": "eyJ...", "user": { "id": 14, "name": "Yeni Kullanici", ... } }
```

Note: `role` is not accepted in the request body. Role is always server-determined (DRIVER by default, OPERATOR auto-detected for company email domains).

---

### Stations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/stations` | No | List all stations (with load/status) |
| GET | `/v1/stations/:id` | No | Station detail + 24h timeslots |
| POST | `/v1/stations` | Yes | Create a new station |
| PUT | `/v1/stations/:id` | Yes | Update station |
| GET | `/v1/stations/forecast` | No | Density forecasts (day/hour params) |
| GET | `/v1/stations/recommend` | No | AI-powered station recommendations |
| GET | `/v1/stations/:id/reviews` | No | Station reviews (paginated) |

**GET /v1/stations** - List all stations
```json
// Response data (array)
[
  {
    "id": 1, "name": "Manisa Sarj 1", "lat": 38.614, "lng": 27.405,
    "load": 45, "status": "MEDIUM",
    "densityProfile": "central", "capacity": 3, "pricePerKwh": 4.5,
    "ownerId": 11
  }
]
```

**GET /v1/stations/:id** - Station detail with 24h timeslots
```json
// Response data
{
  "station": { "id": 1, "name": "Manisa Sarj 1", ... },
  "slots": [
    {
      "hour": "00:00", "load": 20, "status": "LOW",
      "isGreen": true, "coins": 50, "co2Saved": 2.5
    }
  ],
  "averageRating": 4.2,
  "reviewCount": 5
}
```

**GET /v1/stations/recommend** - AI recommendations
```json
// Query params: ?lat=38.614&lng=27.405&hour=14&day=0
// Response data (array)
[
  {
    "stationId": 5, "stationName": "Manisa Sarj 5",
    "lat": 38.62, "lng": 27.41,
    "score": 78.5,
    "loadScore": 85.0, "greenScore": 100.0,
    "distanceScore": 72.0, "priceScore": 60.0,
    "rlBonus": 0.0, "load": 30, "pricePerKwh": 3.8
  }
]
```

**GET /v1/stations/forecast** - Density forecasts
```json
// Query params: ?day=1&hour=14
// Response data (array)
[
  { "stationId": 1, "dayOfWeek": 1, "hour": 14, "load": 65.5 }
]
```

---

### Reservations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/reservations` | Yes | Create reservation |
| PATCH | `/v1/reservations/:id` | Yes | Update reservation status (cancel) |
| POST | `/v1/reservations/:id/confirm` | Yes | Confirm reservation |
| POST | `/v1/reservations/:id/start` | Yes | Start charging |
| POST | `/v1/reservations/:id/complete` | Yes | Complete reservation (awards coins/XP/badges) |

**POST /v1/reservations** - Create reservation
```json
// Request
{
  "stationId": 1,
  "date": "2026-03-15",
  "hour": "14:00"
}

// Response data
{
  "id": 1, "userId": 1, "stationId": 1,
  "date": "2026-03-15", "hour": "14:00",
  "status": "PENDING", "isGreen": false,
  "earnedCoins": 0, "earnedXp": 0, "savedCo2": 0
}
```

Note: `isGreen` is computed server-side from the hour (23:00-06:00 = green). Duplicate reservations (same user + station + date + hour) return 409 CONFLICT.

**POST /v1/reservations/:id/confirm** - Confirm reservation
```json
// No request body needed
// Response: updated reservation with status "CONFIRMED"
```

**POST /v1/reservations/:id/start** - Start charging
```json
// No request body needed
// Response: updated reservation with status "CHARGING"
```

**POST /v1/reservations/:id/complete** - Complete reservation
```json
// No request body needed
// Response data
{
  "reservation": {
    "id": 1, "status": "COMPLETED",
    "earnedCoins": 50, "earnedXp": 100, "savedCo2": 2.5
  },
  "awardedBadges": [
    { "id": 1, "name": "Gece Kusu", "description": "...", "icon": "moon" }
  ]
}
```

**PATCH /v1/reservations/:id** - Cancel reservation
```json
// Request
{ "status": "CANCELLED" }
```

#### Reservation State Machine

```
PENDING -> CONFIRMED -> CHARGING -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
CHARGING -> CANCELLED
CHARGING -> FAILED
```

Each transition is validated server-side. Ownership is enforced (JWT userID must match reservation userID).

**Coin/XP/CO2 formulas on completion:**
- Coins: green hour = 50, non-green = 10 (+ campaign bonus if applicable)
- XP: 100 (flat, per completed reservation)
- CO2: green hour = 2.5 kg, non-green = 0.5 kg

---

### Reviews

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/reviews` | Yes | Create a review for a completed reservation |
| GET | `/v1/stations/:id/reviews` | No | Get station reviews (paginated) |

**POST /v1/reviews** - Create review
```json
// Request
{
  "stationId": 1,
  "reservationId": 5,
  "rating": 4,
  "comment": "Temiz ve hizli sarj."
}

// Response: created review object
```

Rating must be 1-5. Each reservation can only be reviewed once (UNIQUE constraint). Duplicate attempts return 409 CONFLICT.

**GET /v1/stations/:id/reviews** - Get reviews
```json
// Query params: ?page=1&perPage=10
// Response data (array with meta pagination)
[
  {
    "id": 1, "userId": 1, "userName": "Hackathon Surucu",
    "rating": 4, "comment": "Temiz ve hizli sarj.",
    "createdAt": "2026-03-15T14:30:00Z"
  }
]
```

---

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/users/:id` | Yes | User profile + badges + reservations |
| PUT | `/v1/users/:id` | Yes | Update profile (ownership enforced) |
| GET | `/v1/users/leaderboard` | No | XP leaderboard |

**GET /v1/users/:id** - User profile
```json
// Response data
{
  "user": {
    "id": 1, "name": "Hackathon Surucu", "email": "driver@test.com",
    "role": "DRIVER", "xp": 2100, "coins": 1500, "co2Saved": 25.0
  },
  "badges": [ { "id": 1, "name": "Gece Kusu", "earnedAt": "..." } ],
  "allBadges": [
    {
      "id": 1, "name": "Gece Kusu", "earned": true, "earnedAt": "...",
      "currentCount": 5, "threshold": 5
    },
    {
      "id": 2, "name": "Eco Sampiyonu", "earned": false,
      "currentCount": 3, "threshold": 10
    }
  ],
  "reservations": [ { "id": 1, "status": "COMPLETED", ... } ],
  "reviewedReservationIds": [5, 12]
}
```

**GET /v1/users/leaderboard** - XP leaderboard
```json
// Response data (array)
[
  { "id": 2, "name": "Zeynep Demir", "xp": 5500, "rank": 1 }
]
```

---

### Badges

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/badges` | No | All badge definitions |
| GET | `/v1/badges/progress` | Yes | All badges with user progress |

**GET /v1/badges/progress** - Badges with progress
```json
// Response data (array)
[
  {
    "id": 1, "name": "Gece Kusu", "description": "Gece sarj yap",
    "icon": "moon", "metric": "night_charges", "threshold": 5,
    "currentCount": 3, "earned": false
  }
]
```

---

### Campaigns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/campaigns` | Yes | List operator's own campaigns |
| POST | `/v1/campaigns` | Yes | Create campaign |
| PUT | `/v1/campaigns/:id` | Yes | Update campaign (ownership enforced) |
| DELETE | `/v1/campaigns/:id` | Yes | Delete campaign (ownership enforced) |
| GET | `/v1/campaigns/for-user` | Yes | Active campaigns matching user badges |

**GET /v1/campaigns/for-user** - Campaigns for driver
```json
// Response data (array)
[
  {
    "id": 1, "title": "Gece Sarj Kampanyasi",
    "description": "Gece sarj yapanlara ozel indirim",
    "discountPercent": 20, "bonusCoins": 25,
    "targetBadges": [1, 3],
    "matchedBadges": ["Gece Kusu"],
    "startDate": "2026-03-01", "endDate": "2026-04-01"
  }
]
```

---

### Operator

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/company/my-stations` | Yes | Operator's stations + stats |
| POST | `/v1/company/my-stations` | Yes | Create station (as operator) |
| PUT | `/v1/company/my-stations/:id` | Yes | Update station (ownership enforced) |
| DELETE | `/v1/company/my-stations/:id` | Yes | Delete station (ownership enforced) |

**GET /v1/company/my-stations** - Operator's stations
```json
// Response data
{
  "stations": [ { "id": 1, "name": "...", "load": 45, ... } ],
  "stats": {
    "totalStations": 15, "totalReservations": 120,
    "totalRevenue": 5400.0, "totalCo2Saved": 150.0
  }
}
```

---

### Chat & Misc

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/chat` | No* | AI chatbot (Ollama LLM) |
| GET | `/v1/demo-user` | No | Demo user fallback |
| GET | `/health` | No | Health check |

*Chat endpoint has a known auth bug (userID always 0). See `.plan/AUDIT.md` Section 4.

---

## Reservation State Machine

```
          ┌──────────┐
          │ PENDING  │
          └────┬─────┘
               │
        ┌──────┴──────┐
        v             v
  ┌──────────┐  ┌───────────┐
  │CONFIRMED │  │ CANCELLED │
  └────┬─────┘  └───────────┘
       │              ^
       v              │
  ┌──────────┐        │
  │ CHARGING ├────────┘
  └────┬─────┤
       │     │
       v     v
┌──────────┐ ┌────────┐
│COMPLETED │ │ FAILED │
└──────────┘ └────────┘
```

**Valid transitions:**
- `PENDING` -> `CONFIRMED` | `CANCELLED`
- `CONFIRMED` -> `CHARGING` | `CANCELLED`
- `CHARGING` -> `COMPLETED` | `FAILED` | `CANCELLED`

---

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
| `API_URL` | Go API backend URL (default: `http://localhost:8080`). Used in `next.config.ts` rewrites. |

### Backend (`smartcharge-api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing. **Required** in `GIN_MODE=release` (API panics if empty). |
| `PORT` | API server port (default: 8080) |
| `GIN_MODE` | `debug` or `release` |
| `FRONTEND_URL` | Frontend URL for CORS |
| `LLM_URL` | Ollama LLM URL (e.g., `http://localhost:11434`) |
| `LLM_MODEL` | Ollama model name (e.g., `llama3.2`) |

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`): lint, build, test (Go + Next.js) + Docker build verification
- **Railway** deployment: `railway.toml` for API + frontend, Nixpacks for Next.js, Dockerfile for Go API
