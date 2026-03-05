-- 000002_reservation_fixes.down.sql
-- Rollback: reservation system fixes

ALTER TABLE reservations DROP COLUMN IF EXISTS updated_at;
ALTER TABLE reservations DROP COLUMN IF EXISTS created_at;
ALTER TABLE stations DROP COLUMN IF EXISTS capacity;
