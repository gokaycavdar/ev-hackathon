-- name: CreateReservation :one
INSERT INTO reservations (user_id, station_id, date, hour, is_green, earned_coins, status)
VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
RETURNING *;

-- name: GetReservationByID :one
SELECT * FROM reservations WHERE id = $1;

-- name: UpdateReservationStatus :one
UPDATE reservations
SET status = $2
WHERE id = $1
RETURNING *;

-- name: ConfirmReservation :one
UPDATE reservations
SET status = 'CONFIRMED', confirmed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: StartCharging :one
UPDATE reservations
SET status = 'CHARGING', started_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CompleteReservation :one
UPDATE reservations
SET status = 'COMPLETED', earned_coins = $2, saved_co2 = $3, completed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: FailReservation :one
UPDATE reservations
SET status = 'FAILED'
WHERE id = $1
RETURNING *;

-- name: ListReservationsByStation :many
SELECT * FROM reservations
WHERE station_id = $1
ORDER BY id DESC;

-- name: GetStationReservationStats :one
SELECT
    COUNT(*)::int AS total_reservations,
    COUNT(*) FILTER (WHERE is_green = true)::int AS green_reservations
FROM reservations
WHERE station_id = $1;

-- name: GetStationRevenue :one
SELECT COALESCE(SUM(
    CASE WHEN r.is_green THEN s.price * 0.8 ELSE s.price END
), 0)::double precision AS revenue
FROM reservations r
JOIN stations s ON s.id = r.station_id
WHERE r.station_id = $1;

-- name: CountActiveReservations :one
SELECT COUNT(*)::int FROM reservations
WHERE station_id = $1
  AND date::date = $2::date
  AND hour = $3
  AND status NOT IN ('CANCELLED', 'FAILED');

-- name: HasActiveReservation :one
SELECT COUNT(*)::int FROM reservations
WHERE user_id = $1
  AND station_id = $2
  AND date::date = $3::date
  AND hour = $4
  AND status NOT IN ('CANCELLED', 'FAILED', 'COMPLETED');
