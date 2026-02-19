# SmartCharge - Flutter Mobile API Guide

> Last updated: 2026-02-19
> Audience: Flutter developer building the driver-side mobile app
> This document covers every API endpoint the mobile app needs

---

## Quick Start

- **Base URL**: `http://<server-ip>:8080/v1` (no Next.js proxy -- Flutter hits Go API directly)
- **Auth**: JWT Bearer token in `Authorization` header
- **Response format**: Every response follows the same envelope (see below)
- **Content-Type**: `application/json` for all requests and responses

---

## Response Envelope

Every API response uses this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

On error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**Flutter parsing tip**: Always check `success` first, then access `data` or `error`. All list endpoints return arrays directly inside `data` (no wrapper object).

---

## Authentication

### JWT Token

- **Algorithm**: HMAC-SHA256 (HS256)
- **Expiry**: 24 hours from issue
- **Claims**: `user_id` (int), `role` (string: "DRIVER" or "OPERATOR"), `exp`, `iat`
- **Storage**: Store token securely (e.g., `flutter_secure_storage`)
- **Refresh**: No refresh token endpoint exists yet. When token expires, user must re-login.
- **401 handling**: If any request returns HTTP 401, clear stored token and redirect to login screen

### Login Flow

1. `POST /v1/auth/login` with email + password
2. Receive JWT token + full user object
3. Store token, use it in all subsequent requests as `Authorization: Bearer <token>`

---

## Driver Endpoints (Complete Catalog)

### 1. Register

```
POST /v1/auth/register
Auth: No
```

**Request:**
```json
{
  "name": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Ali",
      "email": "ali@test.com",
      "role": "DRIVER",
      "coins": 0,
      "co2Saved": 0.0,
      "xp": 0
    }
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Missing/invalid fields
- `409 RESOURCE_CONFLICT` - Email already in use

---

### 2. Login

```
POST /v1/auth/login
Auth: No
```

**Request:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "name": "Ali",
      "email": "ali@test.com",
      "role": "DRIVER",
      "coins": 150,
      "co2Saved": 7.5,
      "xp": 300,
      "badges": [
        { "id": 1, "name": "Eco Warrior", "description": "...", "icon": "leaf-emoji" }
      ],
      "stations": []
    }
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Missing fields
- `401 AUTH_INVALID_CREDENTIALS` - Wrong email or password

**Note:** `badges` and `stations` arrays are included in login but NOT in register (user has none yet).

---

### 3. List All Stations

```
GET /v1/stations
Auth: No
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Kadikoy Sarj",
      "lat": 40.9903,
      "lng": 29.0297,
      "price": 5.50,
      "ownerId": 2,
      "ownerName": "Zorlu Enerji",
      "mockLoad": 42,
      "mockStatus": "GREEN",
      "nextGreenHour": "23:00"
    }
  ]
}
```

**Important notes:**
- Returns ALL stations (currently ~46). No pagination.
- `mockLoad` (0-100): station density/busyness. Will be renamed to `load` in a future update.
- `mockStatus`: `"GREEN"` (load <= 45), `"YELLOW"` (46-65), `"RED"` (> 65). Will be renamed to `status`.
- `nextGreenHour`: Currently hardcoded to `"23:00"` for all stations. Will become dynamic.
- `ownerId` and `ownerName` can be `null` for stations without an operator.

---

### 4. Station Detail (with 24h time slots)

```
GET /v1/stations/:id
Auth: No
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Kadikoy Sarj",
    "lat": 40.9903,
    "lng": 29.0297,
    "address": "Kadikoy, Istanbul",
    "price": 5.50,
    "density": 42,
    "densityProfile": "suburban",
    "slots": [
      {
        "hour": 0,
        "label": "00:00",
        "startTime": "2026-02-19T00:00:00Z",
        "isGreen": true,
        "coins": 50,
        "price": 4.40,
        "status": "GREEN",
        "load": 28,
        "campaignApplied": null
      },
      {
        "hour": 14,
        "label": "14:00",
        "startTime": "2026-02-19T14:00:00Z",
        "isGreen": false,
        "coins": 30,
        "price": 4.40,
        "status": "RED",
        "load": 72,
        "campaignApplied": {
          "title": "Yaz Kampanyasi",
          "discount": "%20"
        }
      }
    ],
    "activeCampaign": {
      "id": 1,
      "title": "Yaz Kampanyasi",
      "description": "Yaz boyunca %20 indirim",
      "discount": "%20",
      "coinReward": 20,
      "stationId": 1
    }
  }
}
```

**Notes:**
- `slots` always has exactly 24 entries (hours 0-23)
- `isGreen` is true for hours 23, 0, 1, 2, 3, 4, 5, 6 (green energy window)
- `load` comes from forecast data (linear regression predictions from DB)
- `campaignApplied` is `null` when no campaign is active
- `activeCampaign` is `null` when no campaign targets this station
- `address` can be `null`

**Errors:**
- `400 VALIDATION_ERROR` - Invalid station ID
- `404 RESOURCE_NOT_FOUND` - Station does not exist

---

### 5. Station Forecasts

```
GET /v1/stations/forecast?day=0&hour=14
Auth: No
```

**Query params:**
- `day` (int, 0-6): 0=Monday, 6=Sunday. Defaults to current day.
- `hour` (int, 0-23): Defaults to current hour.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currentTime": { "dayOfWeek": 0, "hour": 14 },
    "forecasts": [
      {
        "stationId": 1,
        "stationName": "Kadikoy Sarj",
        "lat": 40.9903,
        "lng": 29.0297,
        "price": 5.50,
        "address": "Kadikoy, Istanbul",
        "densityProfile": "suburban",
        "predictedLoad": 28,
        "dayOfWeek": 0,
        "hour": 14
      }
    ]
  }
}
```

**Notes:**
- Returns ALL stations with their predicted load at the given day/hour
- Sorted by `predictedLoad ASC` (least busy first)
- Useful for "best time to charge" recommendations in the mobile app

---

### 6. Create Reservation

```
POST /v1/reservations
Auth: Yes (Bearer token)
```

**Request:**
```json
{
  "stationId": 1,
  "date": "2026-02-19T14:00:00Z",
  "hour": "14:00",
  "isGreen": false
}
```

**Notes on `date` field:** Accepts both RFC3339 (`"2026-02-19T14:00:00Z"`) and date-only (`"2026-02-19"`) formats.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "userId": 1,
    "stationId": 1,
    "date": "2026-02-19T14:00:00Z",
    "hour": "14:00",
    "isGreen": false,
    "earnedCoins": 30,
    "savedCo2": 0.0,
    "status": "PENDING"
  }
}
```

**Notes:**
- `earnedCoins` is calculated server-side: 10 (non-green) or 50 (green) + campaign coin bonus
- `savedCo2` is 0.0 at creation, set on completion
- `status` starts as `"PENDING"`
- The authenticated user's ID is extracted from the JWT -- no need to send it

---

### 7. Update Reservation Status (Cancel)

```
PATCH /v1/reservations/:id
Auth: Yes (Bearer token)
```

**Request:**
```json
{
  "status": "CANCELLED"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Status updated"
  }
}
```

**Errors:**
- `400 RESERVATION_ALREADY_COMPLETED` - Cannot modify completed reservations
- `404 RESOURCE_NOT_FOUND` - Reservation not found

---

### 8. Complete Reservation

```
POST /v1/reservations/:id/complete
Auth: Yes (Bearer token)
```

**Request:** No body needed.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reservation": {
      "id": 5,
      "userId": 1,
      "stationId": 1,
      "date": "2026-02-19T14:00:00Z",
      "hour": "14:00",
      "isGreen": true,
      "earnedCoins": 50,
      "savedCo2": 2.5,
      "status": "COMPLETED"
    },
    "user": {
      "id": 1,
      "coins": 200,
      "co2Saved": 10.0,
      "xp": 400
    }
  }
}
```

**Notes:**
- Atomic transaction: reservation status + user stats updated together
- XP awarded: always +100
- CO2 saved: +0.5 (non-green) or +2.5 (green)
- `user` object shows UPDATED totals (not deltas)
- **Upcoming change**: Response will include `awardedBadges[]` once badge earning is implemented

**Errors:**
- `400 RESERVATION_ALREADY_COMPLETED`
- `404 RESOURCE_NOT_FOUND`

---

### 9. User Profile

```
GET /v1/users/:id
Auth: Yes (Bearer token)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ali",
    "email": "ali@test.com",
    "role": "DRIVER",
    "coins": 200,
    "co2Saved": 10.0,
    "xp": 400,
    "badges": [
      { "id": 1, "name": "Gece Kusu", "description": "Gece tarifesinde 5 sarj", "icon": "owl-emoji" }
    ],
    "stations": [],
    "reservations": [
      {
        "id": 5,
        "date": "2026-02-19T14:00:00Z",
        "hour": "14:00",
        "isGreen": true,
        "earnedCoins": 50,
        "status": "COMPLETED",
        "station": {
          "id": 1,
          "name": "Kadikoy Sarj",
          "price": 5.50
        }
      }
    ]
  }
}
```

**Notes:**
- `reservations` returns the last 10 reservations (hardcoded limit, no pagination)
- `stations` is always empty for DRIVER role users (only operators own stations)
- `badges` are currently static/seeded -- will become dynamic once badge earning is implemented
- **Upcoming change**: Badge progress data will be added to the response

---

### 10. Update Profile

```
PUT /v1/users/:id
Auth: Yes (Bearer token)
```

**Request:**
```json
{
  "name": "Ali Updated",
  "email": "ali.new@test.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ali Updated",
    "email": "ali.new@test.com",
    "role": "DRIVER",
    "coins": 200,
    "co2Saved": 10.0,
    "xp": 400
  }
}
```

**Notes:**
- This is the ONLY endpoint with ownership enforcement: JWT `user_id` must match `:id`
- Returns `403 AUTH_FORBIDDEN` if you try to update another user's profile

---

### 11. Leaderboard

```
GET /v1/users/leaderboard?limit=10
Auth: No
```

**Query params:**
- `limit` (int, default 10, max 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Ali", "xp": 400 },
    { "id": 3, "name": "Ayse", "xp": 250 }
  ]
}
```

**Notes:** Sorted by XP descending. No pagination (no offset/cursor parameter).

---

### 12. List All Badges

```
GET /v1/badges
Auth: No
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Gece Kusu", "description": "Gece tarifesinde 5 sarj", "icon": "owl-emoji" }
  ]
}
```

**Notes:** Returns all 5 badges. These are the system-wide badge definitions (not user's earned badges -- those are in the profile endpoint).

---

### 13. Campaigns For User

```
GET /v1/campaigns/for-user
Auth: Yes (Bearer token)
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": 1,
        "title": "Yaz Kampanyasi",
        "description": "Yaz boyunca %20 indirim",
        "discount": "%20",
        "coinReward": 20,
        "endDate": "2026-09-01T00:00:00Z",
        "targetBadges": [
          { "id": 1, "name": "Gece Kusu", "description": "...", "icon": "owl-emoji" }
        ],
        "matchedBadges": []
      }
    ]
  }
}
```

**Notes:**
- Currently a STUB: returns all ACTIVE campaigns regardless of user's badges
- `matchedBadges` is always `[]` (badge matching not yet implemented)
- `endDate` can be `null`
- **Upcoming change**: `matchedBadges` will show which of the user's badges match the campaign's target badges

---

### 14. AI Chatbot

```
POST /v1/chat
Auth: No (will require auth in future)
```

**Request:**
```json
{
  "message": "En uygun istasyonu oner"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "role": "bot",
    "content": "Hardcoded Turkish response...",
    "recommendations": [
      {
        "id": 1,
        "name": "Station Name",
        "hour": "20:00",
        "coins": 50,
        "reason": "Dusuk sebeke yuku & Yuksek odul",
        "isGreen": true
      }
    ]
  }
}
```

**IMPORTANT -- THIS IS CURRENTLY A STUB:**
- The `message` field in the request is completely ignored
- Response is always the same hardcoded text with the first 3 stations
- **Upcoming change**: Will be replaced with real LLM-powered responses. The response format will remain the same (role, content, recommendations) but content will be dynamic. Streaming (SSE) support may be added.

---

### 15. Demo User (Development Only)

```
GET /v1/demo-user
Auth: No
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Demo Driver",
    "email": "driver@test.com",
    "role": "DRIVER"
  }
}
```

---

## Error Codes Reference

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 401 | `AUTH_UNAUTHORIZED` | Missing or invalid JWT token |
| 401 | `AUTH_INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `AUTH_FORBIDDEN` | Authenticated but not allowed (ownership check) |
| 404 | `RESOURCE_NOT_FOUND` | Requested entity does not exist |
| 409 | `RESOURCE_CONFLICT` | Duplicate resource (e.g., email already exists) |
| 400 | `RESERVATION_ALREADY_COMPLETED` | Cannot modify a completed reservation |
| 500 | `INTERNAL_ERROR` | Server-side error |

---

## Known Limitations (Current State)

| Limitation | Impact on Mobile | Future Fix |
|------------|-----------------|------------|
| No pagination on any list endpoint | All stations (~46) returned at once. Manageable now but won't scale. | Pagination will be added (ROADMAP Phase 5) |
| No token refresh | User must re-login after 24h | May add `POST /v1/auth/refresh` |
| No push notifications | No real-time updates for charging status | SSE planned (ROADMAP Phase 6) |
| No image/avatar endpoints | No profile pictures or station images | Not currently planned |
| No password reset | User cannot recover account | Needs email integration |
| Chat is a stub | Always returns same response | LLM integration in progress (ROADMAP Phase 3) |
| Badges are static | No earning logic, display only | Badge engine in progress (ROADMAP Phase 2) |
| Campaign matching is stubbed | `matchedBadges` always empty | Will work after badge engine |
| `mockLoad`/`mockStatus` field names | Will be renamed to `load`/`status` -- plan for this | ROADMAP Phase 1 |

---

## Upcoming API Changes (Breaking)

The following changes are planned and WILL affect the mobile app. Build with these in mind:

1. **Field rename**: `mockLoad` -> `load`, `mockStatus` -> `status` in `GET /v1/stations` response
2. **New fields in completion response**: `awardedBadges[]` in `POST /v1/reservations/:id/complete`
3. **New reservation statuses**: `CONFIRMED`, `CHARGING`, `FAILED` in addition to `PENDING`, `COMPLETED`, `CANCELLED`
4. **Chat will become dynamic**: Same endpoint shape but response content will vary. May add SSE streaming.
5. **Campaign matching will work**: `matchedBadges` will contain actual matched badges
6. **Possible new endpoints**:
   - `GET /v1/reservations` (user's reservation list with filters)
   - `GET /v1/users/:id/reservations` (paginated reservation history)
   - `POST /v1/auth/refresh` (token refresh)

---

## Flutter Integration Tips

### HTTP Client Setup

```dart
// Suggested: use dio package with interceptor for auth
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = SecureStorage.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    options.headers['Content-Type'] = 'application/json';
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Clear token, navigate to login
      SecureStorage.clearToken();
      NavigationService.navigateToLogin();
    }
    handler.next(err);
  }
}
```

### Response Parsing

```dart
class ApiResponse<T> {
  final bool success;
  final T? data;
  final ApiError? error;

  ApiResponse({required this.success, this.data, this.error});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromData,
  ) {
    return ApiResponse(
      success: json['success'] as bool,
      data: json['success'] ? fromData(json['data']) : null,
      error: json['error'] != null
          ? ApiError.fromJson(json['error'])
          : null,
    );
  }
}

class ApiError {
  final String code;
  final String message;

  ApiError({required this.code, required this.message});

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      code: json['code'] as String,
      message: json['message'] as String,
    );
  }
}
```

### Map Integration

Station data includes `lat`/`lng` coordinates. Use `google_maps_flutter` or `flutter_map` (Leaflet-based, matching the web app) to display stations on a map. Color markers based on `mockStatus` (GREEN/YELLOW/RED).
