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
    <div className="h-full w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-800">
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
                        status === "RED" ? "border-red-100 bg-red-50 text-red-500" :
                        status === "YELLOW" ? "border-yellow-100 bg-yellow-50 text-yellow-500" :
                        "border-green-100 bg-green-50 text-green-500"
                      }`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{station.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            status === "RED" ? "bg-red-50 text-red-600 border-red-100" :
                            status === "YELLOW" ? "bg-yellow-50 text-yellow-600 border-yellow-100" :
                            "bg-green-50 text-green-600 border-green-100"
                          }`}>
                            {status === "RED" ? "Yüksek" : status === "YELLOW" ? "Orta" : "Düşük"} Yoğunluk
                          </span>
                          <span className="text-xs text-slate-500">%{load} Dolu</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini Grid */}
                    <div className="mb-3 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2 text-center border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Güç</div>
                        <div className="font-bold text-slate-700 text-xs">{station.id % 2 === 0 ? "120 kW" : "180 kW"}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 text-center border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Mesafe</div>
                        <div className="font-bold text-slate-700 text-xs">{(1.2 + (station.id % 5) * 0.4).toFixed(1)} km</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 text-center border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Fiyat</div>
                        <div className="font-bold text-slate-700 text-xs">{station.price} ₺</div>
                      </div>
                    </div>

                    {/* Action */}
                    <button 
                      onClick={() => onSelect(station)}
                      className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/10 flex items-center justify-center gap-2"
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