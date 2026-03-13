-- Station Reviews: allows drivers to rate and review stations after completing a reservation.

CREATE TABLE station_reviews (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id),
    station_id      INT NOT NULL REFERENCES stations(id),
    reservation_id  INT NOT NULL REFERENCES reservations(id),
    rating          INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- One review per reservation
    UNIQUE(reservation_id)
);

CREATE INDEX idx_station_reviews_station ON station_reviews(station_id, created_at DESC);
CREATE INDEX idx_station_reviews_user ON station_reviews(user_id);
