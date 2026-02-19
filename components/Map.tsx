"use client";

import { useEffect, Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Zap, MapPin } from "lucide-react";

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
  onMapClick?: () => void;
  initialCenter?: LatLngExpression;
  zoom?: number;
};

function MapEvents({ onMapClick }: { onMapClick?: () => void }) {
  useMapEvents({
    click: () => {
      onMapClick?.();
    },
  });
  return null;
}

export default function Map({ stations, onSelect, onMapClick, initialCenter, zoom = 12 }: MapProps) {
  useEffect(() => {
    patchLeafletIcons();
  }, []);

  const center: LatLngExpression = initialCenter ?? [38.614, 27.405];

  return (
    <div className="h-full w-full overflow-hidden border border-white/10 bg-surface-1">
      <style jsx global>{`
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #1e293b; /* Slate 800 / surface-1 */
          color: #f8fafc; /* Slate 50 / text-primary */
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
        }
        .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: #94a3b8;
          font-size: 18px;
          padding: 8px;
          width: 32px;
          height: 32px;
        }
        .leaflet-container a.leaflet-popup-close-button:hover {
          color: #f8fafc;
        }
      `}</style>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <MapEvents onMapClick={onMapClick} />
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
          // Softer radial glow for density
          const glowColor = status === "RED" ? "rgba(239, 68, 68, 0.25)" : status === "YELLOW" ? "rgba(234, 179, 8, 0.25)" : "rgba(34, 197, 94, 0.25)";
          
          const customIcon = L.divIcon({
            className: "custom-station-icon bg-transparent border-none",
            html: `
              <div class="relative flex items-center justify-center w-24 h-24 -ml-8 -mt-8">
                <div class="absolute inset-0 rounded-full blur-xl transition-all duration-1000" style="background: ${glowColor}; transform: scale(1.2);"></div>
                ${isHighDensity ? `<div class="absolute inset-0 rounded-full ${colorClass} animate-ping opacity-10 duration-[3000ms]"></div>` : ""}
                <div class="relative w-9 h-9 rounded-full border-2 border-white ${colorClass} ${shadowClass} shadow-xl flex items-center justify-center z-10 transition-transform hover:scale-110">
                   <span class="text-[10px] font-bold text-white drop-shadow-md">${load}%</span>
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
                // We remove the click handler here because the Popup handles the click
                // eventHandlers={{ click: () => onSelect(station) }}
              >
                <Popup className="custom-popup" minWidth={280} maxWidth={320}>
                  <div className="p-1">
                    {/* Header */}
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm ${
                        status === "RED" ? "border-red-500/20 bg-red-500/10 text-red-400" :
                        status === "YELLOW" ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-400" :
                        "border-green-500/20 bg-green-500/10 text-green-400"
                      }`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">{station.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            status === "RED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            status === "YELLOW" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            "bg-green-500/10 text-green-400 border-green-500/20"
                          }`}>
                            {status === "RED" ? "Yüksek" : status === "YELLOW" ? "Orta" : "Düşük"} Yoğunluk
                          </span>
                          <span className="text-xs text-slate-400">%{load} Dolu</span>
                        </div>
                      </div>
                    </div>

                    {/* Station Info */}
                    <div className="mb-3">
                      <div className="rounded-lg bg-slate-700/50 p-2 text-center border border-white/5 inline-block">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Fiyat</div>
                        <div className="font-bold text-slate-200 text-xs">{station.price} ₺/kWh</div>
                      </div>
                    </div>

                    {/* Action */}
                    <button 
                      onClick={() => onSelect(station)}
                      className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      Saatleri Gör & Rezerve Et
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