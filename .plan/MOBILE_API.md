Tamam. Eski `MOBILE_API.md` ile mevcut kodu karşılaştırdım. Tüm değişiklikleri aşağıda listeliyorum:

---

## BREAKING CHANGES (Mobil uygulamayı kıran değişiklikler)

### 1. `mockLoad` / `mockStatus` -> `load` / `status` [BREAKING]

**Endpoint:** `GET /v1/stations`

Eski JSON key'ler `mockLoad` ve `mockStatus` idi. Artık `load` ve `status` olarak dönüyor. Mobilde bu field'ları parse eden her yer kırılır.

```
// Eski
"mockLoad": 42,
"mockStatus": "GREEN"

// Yeni
"load": 42,
"status": "GREEN"
```

Status thresholds aynı kaldı: GREEN (<=45), YELLOW (46-65), RED (>65).

### 2. Rezervasyon State Machine [BREAKING]

Eski davranış: `PENDING -> COMPLETED` doğrudan geçiş yapılabiliyordu.

Yeni davranış: Tam state machine zorunlu. Artık doğrudan complete yapamazsın, sırayla gitmen gerekiyor:

```
PENDING -> CONFIRMED -> CHARGING -> COMPLETED
PENDING -> CANCELLED
CONFIRMED -> CANCELLED
CHARGING -> CANCELLED | FAILED
```

İki yeni endpoint eklendi (aşağıda "NEW ENDPOINTS" bölümünde detaylı):
- `POST /v1/reservations/:id/confirm`
- `POST /v1/reservations/:id/start`

### 3. `isGreen` artık sunucu tarafında hesaplanıyor [BREAKING]

**Endpoint:** `POST /v1/reservations`

Request body'de `isGreen` field'ı hala kabul ediliyor ama **tamamen ignore ediliyor**. Sunucu `hour` değerine bakarak kendisi hesaplıyor (23:00-06:00 = green). Mobil `isGreen: true` gönderip non-green saatte coin avantajı almaya çalışıyorsa artık çalışmaz.

### 4. Aynı slot'a mükerrer rezervasyon artık 409 döndürüyor [BREAKING]

**Endpoint:** `POST /v1/reservations`

Aynı kullanıcı + aynı istasyon + aynı tarih + aynı saat için ikinci rezervasyon oluşturmaya çalışırsan artık `409 RESOURCE_CONFLICT` dönüyor. Eski API'de buna izin veriyordu.

---

## CHANGED (Mevcut endpoint'lerde değişen response shape'ler)

### 5. Station Detail'e `averageRating` ve `reviewCount` eklendi

**Endpoint:** `GET /v1/stations/:id`

Response'a iki yeni field eklendi. Eski field'lar aynen duruyor, kırıcı değil ama mobil bunları kullanmak isteyebilir:

```json
{
  "id": 1,
  "name": "...",
  "averageRating": 4.2,
  "reviewCount": 5,
  "slots": [...]
}
```

Review yoksa `averageRating: 0`, `reviewCount: 0` döner.

### 6. Complete response'a `awardedBadges` eklendi

**Endpoint:** `POST /v1/reservations/:id/complete`

Eski dokümanda "upcoming change" olarak belirtilmişti, artık aktif:

```json
{
  "reservation": { ... },
  "user": { ... },
  "awardedBadges": [
    { "badgeId": 1, "name": "Gece Kusu", "description": "...", "icon": "owl-emoji" }
  ]
}
```

Badge kazanılmadıysa boş array `[]` döner. Reservation response'un içine de `confirmedAt`, `startedAt`, `completedAt` timestamp field'ları eklendi (omitempty -- set edilmemişse JSON'da gelmez).

### 7. Profile response'a yeni field'lar eklendi

**Endpoint:** `GET /v1/users/:id`

Eski `badges` array'i aynen duruyor. Üç yeni field eklendi:

```json
{
  "id": 1,
  "badges": [...],
  "allBadges": [
    {
      "id": 1, "name": "Gece Kusu", "description": "...", "icon": "owl-emoji",
      "metric": "night_charges", "threshold": 5, "currentCount": 2,
      "earned": false, "earnedAt": null
    }
  ],
  "reservations": [
    {
      "id": 5, "status": "COMPLETED",
      "confirmedAt": "2026-03-13T10:00:00Z",
      "startedAt": "2026-03-13T10:05:00Z",
      "completedAt": "2026-03-13T10:30:00Z",
      "station": { ... }
    }
  ],
  "reviewedReservationIds": [5, 12]
}
```

- `allBadges`: Tüm badge'ler + kullanıcının progress'i (earned + unearned)
- `reviewedReservationIds`: Kullanıcının zaten review yaptığı reservation ID'leri
- Reservation item'lara `confirmedAt`, `startedAt`, `completedAt` eklendi (omitempty)

### 8. Campaign `matchedBadges` artık gerçek veri döndürüyor

**Endpoint:** `GET /v1/campaigns/for-user`

Eski dokümanda "stub, always `[]`" yazıyordu. Artık kullanıcının kazandığı badge'ler ile kampanyanın hedef badge'leri karşılaştırılıyor ve gerçek eşleşmeler dönüyor. Response shape aynı, sadece `matchedBadges` artık dolu olabiliyor.

### 9. Chat artık stub değil, gerçek LLM kullanıyor

**Endpoint:** `POST /v1/chat`

Request'e yeni opsiyonel field'lar eklendi:

```json
{
  "message": "En uygun istasyonu oner",
  "stationId": 1,
  "date": "2026-03-15",
  "hour": "14:00",
  "isGreen": false
}
```

Sadece `message` zorunlu, geri kalanı opsiyonel (omitempty).

Response'a `action` field'ı eklendi, `recommendations` artık omitempty (gelmeyebilir):

```json
{
  "role": "bot",
  "content": "Dinamik LLM yaniti...",
  "recommendations": [...],
  "action": {
    "type": "create_reservation",
    "stationId": 1,
    "date": "2026-03-15",
    "hour": "20:00",
    "success": true,
    "message": "Randevun olusturuldu!",
    "reservation": { "id": 5, "status": "PENDING", ... }
  }
}
```

**Dikkat:** `recommendations` eski API'de her zaman doluydu, artık `omitempty` olduğu için JSON'da hiç gelmeyebilir. Mobilde null-safe parse yapılmalı. Auth hala yok (bilinen bug, userID=0).

---

## NEW ENDPOINTS (Eski dokümanda hiç olmayan)

### 10. Confirm Reservation [NEW]

```
POST /v1/reservations/:id/confirm
Auth: Yes
```

Body yok. PENDING -> CONFIRMED geçişi yapar. Response olarak güncellenmiş reservation döner (status: "CONFIRMED", confirmedAt set edilir).

### 11. Start Charging [NEW]

```
POST /v1/reservations/:id/start
Auth: Yes
```

Body yok. CONFIRMED -> CHARGING geçişi yapar. Response olarak güncellenmiş reservation döner (status: "CHARGING", startedAt set edilir).

### 12. Badge Progress [NEW]

```
GET /v1/badges/progress
Auth: Yes
```

Tüm badge'leri kullanıcının progress'iyle birlikte döndürür:

```json
[
  {
    "id": 1, "name": "Gece Kusu", "description": "...", "icon": "owl-emoji",
    "metric": "night_charges", "threshold": 5, "currentCount": 2,
    "earned": false, "earnedAt": null
  }
]
```

### 13. Create Review [NEW]

```
POST /v1/reviews
Auth: Yes
```

```json
// Request
{
  "stationId": 1,
  "reservationId": 5,
  "rating": 4,
  "comment": "Harika istasyon!"
}
```

Rating 1-5 arası zorunlu. Her reservation sadece bir kez review edilebilir (tekrar denersen 409 CONFLICT). Response olarak oluşturulan review objesi döner (`id`, `userId`, `userName`, `stationId`, `reservationId`, `rating`, `comment`, `createdAt`).

### 14. Station Reviews [NEW]

```
GET /v1/stations/:id/reviews?limit=10&offset=0
Auth: No
```

```json
{
  "summary": {
    "averageRating": 4.2, "reviewCount": 15,
    "fiveStar": 5, "fourStar": 6, "threeStar": 2, "twoStar": 1, "oneStar": 1
  },
  "reviews": [
    {
      "id": 1, "userId": 1, "userName": "Ali",
      "stationId": 1, "reservationId": 5,
      "rating": 4, "comment": "Harika!",
      "createdAt": "2026-03-13T10:00:00Z"
    }
  ]
}
```

Bu API'deki ilk paginated endpoint (limit/offset destekli, default limit=10, max=50).

### 15. AI Recommendations [NEW]

```
GET /v1/stations/recommend?lat=38.614&lng=27.405&hour=14&day=0&limit=10
Auth: No
```

RL-based composite scoring ile istasyon önerisi. Tüm parametreler opsiyonel (default'lar var).

```json
{
  "algorithm": "reinforcement_learning",
  "results": [
    {
      "stationId": 5,
      "score": 78.5,
      "components": {
        "load": 85.0, "green": 100.0, "distance": 72.0, "price": 60.0,
        "rl_bonus": 0.0, "q_value": 0.0
      },
      "explanation": "Dusuk yogunluk & yesil tarife & yakin"
    }
  ]
}
```



