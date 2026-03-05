DROP TABLE IF EXISTS badge_progress;
DROP TABLE IF EXISTS badge_criteria;
ALTER TABLE user_badges DROP COLUMN IF EXISTS earned_at;
