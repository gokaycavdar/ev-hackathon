-- Phase 6: Charging Simulation / State Machine
-- Adds lifecycle timestamps for reservation state transitions:
--   PENDING -> CONFIRMED -> CHARGING -> COMPLETED
--   PENDING -> CANCELLED
--   CONFIRMED -> CANCELLED
--   CHARGING -> FAILED

ALTER TABLE reservations ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN started_at   TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN completed_at TIMESTAMPTZ;
