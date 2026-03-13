-- name: CreateReview :one
INSERT INTO station_reviews (user_id, station_id, reservation_id, rating, comment)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetStationReviews :many
SELECT sr.id, sr.user_id, sr.station_id, sr.reservation_id, sr.rating, sr.comment, sr.created_at,
       u.name AS user_name
FROM station_reviews sr
JOIN users u ON u.id = sr.user_id
WHERE sr.station_id = $1
ORDER BY sr.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetStationAverageRating :one
SELECT
    COALESCE(AVG(rating), 0)::double precision AS average_rating,
    COUNT(*)::int AS review_count
FROM station_reviews
WHERE station_id = $1;

-- name: GetUserReviewForReservation :one
SELECT * FROM station_reviews
WHERE user_id = $1 AND reservation_id = $2;

-- name: GetUserReviewedReservationIDs :many
SELECT reservation_id FROM station_reviews
WHERE user_id = $1;

-- name: GetStationReviewSummary :one
SELECT
    COALESCE(AVG(rating), 0)::double precision AS average_rating,
    COUNT(*)::int AS review_count,
    COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
    COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
    COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
    COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
    COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
FROM station_reviews
WHERE station_id = $1;
