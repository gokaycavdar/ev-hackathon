"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(async () => (await import("react-leaflet")).MapContainer, {
  ssr: false,
});
const TileLayer = dynamic(async () => (await import("react-leaflet")).TileLayer, { ssr: false });
const Marker = dynamic(async () => (await import("react-leaflet")).Marker, { ssr: false });
const Popup = dynamic(async () => (await import("react-leaflet")).Popup, { ssr: false });
const Circle = dynamic(async () => (await import("react-leaflet")).Circle, { ssr: false });

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
          const statusColor = 
            station.mockStatus === "RED" ? "#ef4444" : 
            station.mockStatus === "YELLOW" ? "#eab308" : 
            "#22c55e"; // Green

          return (
            <div key={station.id}>
              <Circle
                center={[station.lat, station.lng]}
                pathOptions={{ 
                  fillColor: statusColor, 
                  color: statusColor, 
                  fillOpacity: 0.6, 
                  weight: 0 
                }}
                radius={500}
              />
              <Marker position={[station.lat, station.lng] as LatLngExpression}
                eventHandlers={{ click: () => onSelect(station) }}
              >
                <Popup>
                  <div className="space-y-1 text-center text-slate-900">
                    <p className="text-sm font-semibold">{station.name}</p>
                    <p className="text-xs text-slate-600">{station.ownerName ?? "EcoCharge Partner"}</p>
                    <p className="text-xs font-medium">{station.price.toFixed(2)} ₺/kWh</p>
                    <div className="mt-1 flex justify-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                        station.mockStatus === "RED" ? "bg-red-500" : 
                        station.mockStatus === "YELLOW" ? "bg-yellow-500" : 
                        "bg-green-500"
                      }`}>
                        %{station.mockLoad} Yoğunluk
                      </span>
                    </div>
                    <button
                      className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                      onClick={() => onSelect(station)}
                      type="button"
                    >
                      Slotları Gör
                    </button>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}