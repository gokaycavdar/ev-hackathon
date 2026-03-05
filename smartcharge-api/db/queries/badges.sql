-- name: ListBadges :many
SELECT * FROM badges ORDER BY name ASC;

-- name: GetBadgeByID :one
SELECT * FROM badges WHERE id = $1;

-- name: CreateBadge :one
INSERT INTO badges (name, description, icon)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListBadgeCriteria :many
SELECT bc.id, bc.badge_id, bc.metric, bc.threshold, bc.time_window,
       b.name AS badge_name, b.description AS badge_description, b.icon AS badge_icon
FROM badge_criteria bc
JOIN badges b ON b.id = bc.badge_id
ORDER BY bc.badge_id ASC;

-- name: UpsertBadgeProgress :one
INSERT INTO badge_progress (user_id, badge_id, metric, current_count, last_updated)
VALUES ($1, $2, $3, 1, NOW())
ON CONFLICT (user_id, badge_id, metric)
DO UPDATE SET current_count = badge_progress.current_count + 1, last_updated = NOW()
RETURNING *;

-- name: GetBadgeProgressForUser :many
SELECT bp.badge_id, bp.metric, bp.current_count, bp.last_updated
FROM badge_progress bp
WHERE bp.user_id = $1
ORDER BY bp.badge_id ASC;

-- name: CheckUserHasBadge :one
SELECT COUNT(*) FROM user_badges WHERE user_id = $1 AND badge_id = $2;

-- name: AwardBadge :exec
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES ($1, $2, NOW())
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- name: GetBadgesWithProgress :many
SELECT b.id, b.name, b.description, b.icon,
       COALESCE(bc.metric, '') AS metric,
       COALESCE(bc.threshold, 0) AS threshold,
       COALESCE(bp.current_count, 0) AS current_count,
       CASE WHEN ub.badge_id IS NOT NULL THEN TRUE ELSE FALSE END AS earned,
       ub.earned_at
FROM badges b
LEFT JOIN badge_criteria bc ON bc.badge_id = b.id
LEFT JOIN badge_progress bp ON bp.badge_id = b.id AND bp.user_id = $1 AND bp.metric = bc.metric
LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1
ORDER BY b.id ASC;

