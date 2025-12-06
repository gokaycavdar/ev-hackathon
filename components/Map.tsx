"use client";

import { useEffect, Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

let iconPatched = false;
function patchLeafletIcons() {
  if (iconPatched) return;
  iconPatched = true;

  const icon = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
  delete icon._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

export type StationMarker = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  price: number;
  ownerName?: string | null;
  mockLoad?: number;
  mockStatus?: string;
};

type MapProps = {
  stations: StationMarker[];
  onSelect: (station: StationMarker) => void;
  initialCenter?: LatLngExpression;
  zoom?: number;
};

export default function Map({ stations, onSelect, initialCenter, zoom = 12 }: MapProps) {
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const center: LatLngExpression = initialCenter ?? [38.614, 27.405];

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-800">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stations.map((station) => {
          const status = station.mockStatus || "GREEN";
          const load = station.mockLoad || 0;
          
          let colorClass = "bg-green-500";
          let shadowClass = "shadow-green-500/50";
          
          if (status === "YELLOW") {
            colorClass = "bg-yellow-500";
            shadowClass = "shadow-yellow-500/50";
          } else if (status === "RED") {
            colorClass = "bg-red-500";
            shadowClass = "shadow-red-500/50";
          }

          const isHighDensity = status === "RED";
          // Soft radial glow for density
          const glowColor = status === "RED" ? "rgba(239, 68, 68, 0.4)" : status === "YELLOW" ? "rgba(234, 179, 8, 0.4)" : "rgba(34, 197, 94, 0.4)";
          
          const customIcon = L.divIcon({
            className: "custom-station-icon bg-transparent border-none",
            html: `
              <div class="relative flex items-center justify-center w-16 h-16 -ml-4 -mt-4">
                <div class="absolute inset-0 rounded-full blur-md" style="background: ${glowColor}; transform: scale(1.5);"></div>
                ${isHighDensity ? `<div class="absolute inset-0 rounded-full ${colorClass} animate-ping opacity-20"></div>` : ""}
                <div class="relative w-8 h-8 rounded-full border-2 border-white ${colorClass} ${shadowClass} shadow-lg flex items-center justify-center z-10">
                   <span class="text-[10px] font-bold text-white">${load}%</span>
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          return (
            <Fragment key={station.id}>
              <Marker 
                position={[station.lat, station.lng] as LatLngExpression}
                icon={customIcon}
                eventHandlers={{ click: () => onSelect(station) }}
              >
                <Popup>
                  <div className="space-y-1 text-center text-slate-900 min-w-[150px]">
                    <p className="text-sm font-semibold">{station.name}</p>
                    <p className="text-xs text-slate-600">{station.ownerName ?? "EcoCharge Partner"}</p>
                    <p className="text-xs font-medium">{station.price.toFixed(2)} ₺/kWh</p>
                    <div className="mt-1 flex justify-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                        status === "RED" ? "bg-red-500" : 
                        status === "YELLOW" ? "bg-yellow-500" : 
                        "bg-green-500"
                      }`}>
                        %{load} Yoğunluk
                      </span>
                    </div>
                    <button
                      className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 transition"
                      onClick={() => onSelect(station)}
                      type="button"
                    >
                      Slotları Gör
                    </button>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}