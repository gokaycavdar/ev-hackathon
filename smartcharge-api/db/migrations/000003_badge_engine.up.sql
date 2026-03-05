-- Badge earning criteria (data-driven rules)
CREATE TABLE IF NOT EXISTS badge_criteria (
    id         SERIAL PRIMARY KEY,
    badge_id   INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    metric     VARCHAR(50) NOT NULL,
    threshold  INT NOT NULL,
    time_window VARCHAR(20) NOT NULL DEFAULT 'all_time',
    UNIQUE (badge_id, metric)
);

-- User progress toward badges
CREATE TABLE IF NOT EXISTS badge_progress (
    user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id      INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    metric        VARCHAR(50) NOT NULL,
    current_count INT NOT NULL DEFAULT 0,
    last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id, metric)
);

-- Add earned_at to existing user_badges
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ DEFAULT NOW();

-- Seed criteria for 5 existing badges (uses subquery to find IDs by name, not hardcoded)
INSERT INTO badge_criteria (badge_id, metric, threshold, time_window)
SELECT b.id, v.metric, v.threshold, v.time_window
FROM (VALUES
    ('Gece Kuşu',            'night_charges',     5, 'all_time'),
    ('Eco Şampiyonu',        'green_charges',    10, 'all_time'),
    ('Hafta Sonu Savaşçısı', 'weekend_charges',   5, 'all_time'),
    ('Erken Kalkan',         'morning_charges',   5, 'all_time'),
    ('Uzun Yolcu',           'intercity_charges', 3, 'all_time')
) AS v(name, metric, threshold, time_window)
JOIN badges b ON b.name = v.name
ON CONFLICT (badge_id, metric) DO NOTHING;
