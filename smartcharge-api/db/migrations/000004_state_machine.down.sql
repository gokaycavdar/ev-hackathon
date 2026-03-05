ALTER TABLE reservations DROP COLUMN IF EXISTS confirmed_at;
ALTER TABLE reservations DROP COLUMN IF EXISTS started_at;
ALTER TABLE reservations DROP COLUMN IF EXISTS completed_at;
