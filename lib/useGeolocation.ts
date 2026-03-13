"use client";

import { useState, useEffect } from "react";

export type GeolocationState = {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
};

// Default center: station cluster center (Manisa/Izmir area)
export const DEFAULT_CENTER = { lat: 38.614, lng: 27.405 };

/**
 * Hook that requests browser geolocation permission and tracks the user's position.
 * Falls back to DEFAULT_CENTER if permission is denied or unavailable.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fallback runs once on mount, no cascade risk
      setState({
        lat: DEFAULT_CENTER.lat,
        lng: DEFAULT_CENTER.lng,
        error: "Geolocation not supported",
        loading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({
          lat: DEFAULT_CENTER.lat,
          lng: DEFAULT_CENTER.lng,
          error: err.message,
          loading: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 min cache
      }
    );
  }, []);

  return state;
}
