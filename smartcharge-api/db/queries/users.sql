-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateUser :one
INSERT INTO users (name, email, password, role)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateUserProfile :one
UPDATE users
SET name = $2, email = $3, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateUserStats :one
UPDATE users
SET coins = coins + $2, co2_saved = co2_saved + $3, xp = xp + $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: GetLeaderboard :many
SELECT id, name, xp FROM users
WHERE role = 'DRIVER'
ORDER BY xp DESC
LIMIT $1;

-- name: GetUserBadges :many
SELECT b.id, b.name, b.description, b.icon
FROM badges b
JOIN user_badges ub ON ub.badge_id = b.id
WHERE ub.user_id = $1
ORDER BY b.name ASC;

-- name: AddUserBadge :exec
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES ($1, $2, NOW())
ON CONFLICT DO NOTHING;

-- name: GetUserStations :many
SELECT id, name, price, lat, lng
FROM stations
WHERE owner_id = $1
ORDER BY id ASC;

-- name: GetUserReservations :many
SELECT r.id, r.date, r.hour, r.is_green, r.earned_coins, r.status,
       r.confirmed_at, r.started_at, r.completed_at,
       s.id AS station_id, s.name AS station_name, s.price AS station_price
FROM reservations r
JOIN stations s ON s.id = r.station_id
WHERE r.user_id = $1
ORDER BY r.id DESC
LIMIT $2;

-- name: GetDemoUser :one
SELECT id, name, email, role FROM users WHERE email = 'driver@test.com';
