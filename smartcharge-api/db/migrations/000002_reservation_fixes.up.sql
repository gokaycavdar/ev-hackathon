-- 000002_reservation_fixes.up.sql
-- Phase 1: Reservation system fixes
-- Adds capacity column to stations and timestamps to reservations

-- Add capacity column to stations (max concurrent reservations per hour)
ALTER TABLE stations ADD COLUMN capacity INT NOT NULL DEFAULT 3;

-- Add timestamps to reservations for better tracking
ALTER TABLE reservations ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE reservations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
