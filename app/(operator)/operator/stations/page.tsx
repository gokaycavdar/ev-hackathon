"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, MapPin, BatteryCharging, LayoutList, Map as MapIcon, Plus, LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { authFetch, unwrapResponse } from "@/lib/auth";

const Map = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => <div className="h-[600px] w-full animate-pulse bg-surface-2 rounded-3xl" />
});

type StationSummary = {
  id: number;
  name: string;
  price: number;
  load: number;
  status: "GREEN" | "YELLOW" | "RED";
  reservationCount: number;
  greenReservationCount: number;
  lat?: number;
  lng?: number;
  revenue?: number;
};

type OperatorResponse = {
  stats: {
    totalRevenue: number;
    totalReservations: number;
    greenShare: number;
    avgLoad: number;
  };
  stations: StationSummary[];
};

export default function StationsPage() {
  const [data, setData] = useState<OperatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");

  useEffect(() => {
    const loadStations = async () => {
      try {
        const response = await authFetch("/api/company/my-stations");
        if (!response.ok) throw new Error("İstasyon verisi alınamadı");
        const payload = await unwrapResponse<OperatorResponse>(response);
        setData(payload);
      } catch (err) {
        console.error("Stations load failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStations();
  }, []);

  const filteredStations = data?.stations.filter(station => 
    station.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 lg:p-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white font-display">İstasyon Yönetimi</h1>
            <p className="mt-2 text-text-secondary">
              Tüm şarj istasyonlarınızın durumunu ve performansını yönetin.
            </p>
          </div>
          <Link 
            href="/operator/stations/new" 
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-hover hover:shadow-accent-primary/30"
          >
            <Plus size={18} />
            Yeni İstasyon Ekle
          </Link>
        </header>

        <div className="flex flex-col gap-4 sm:flex-row justify-between">
          <div className="flex bg-surface-1 p-1 rounded-xl border border-white/10 self-start">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-surface-2 text-white shadow-sm" : "text-text-secondary hover:text-white"}`}
              title="Liste Görünümü"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-surface-2 text-white shadow-sm" : "text-text-secondary hover:text-white"}`}
              title="Kart Görünümü"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-2 rounded-lg transition ${viewMode === "map" ? "bg-surface-2 text-white shadow-sm" : "text-text-secondary hover:text-white"}`}
              title="Harita Görünümü"
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input 
              type="text" 
              placeholder="İstasyon ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/10 bg-surface-1 pl-9 pr-4 text-sm text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
        </div>

        {viewMode === "list" && (
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-text-secondary">
                <thead className="bg-surface-2/50 text-xs uppercase tracking-widest text-text-tertiary font-semibold">
                  <tr>
                    <th className="px-6 py-4">İstasyon</th>
                    <th className="px-6 py-4">Yük Durumu</th>
                    <th className="px-6 py-4">Fiyatlandırma</th>
                    <th className="px-6 py-4">Performans</th>
                    <th className="px-6 py-4">Durum</th>
                    <th className="px-6 py-4">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStations.map((station) => {
                    const statusColor =
                      station.status === "GREEN"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : station.status === "YELLOW"
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20";
                    
                    const statusText = 
                      station.status === "GREEN" ? "Düşük Yoğunluk" :
                      station.status === "YELLOW" ? "Orta Yoğunluk" : "Yüksek Yoğunluk";

                    return (
                      <tr key={station.id} className="hover:bg-surface-2/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-accent-primary">
                              <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{station.name}</div>
                              <div className="text-xs text-text-tertiary">ID: #{station.id.toString().padStart(3, "0")}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-white">%{station.load}</span>
                              <span className="text-text-tertiary">Kapasite</span>
                            </div>
                            <div className="h-1.5 w-28 rounded-full bg-surface-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  station.status === "RED"
                                    ? "bg-red-500"
                                    : station.status === "YELLOW"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${station.load}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-medium text-white">{station.price.toFixed(2)} ₺ <span className="text-xs text-text-tertiary font-sans">/ kWh</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">{station.greenReservationCount} Yeşil</span>
                            <span className="text-text-tertiary">/ {station.reservationCount} Toplam</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusColor}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/operator/stations/${station.id}`} className="text-xs font-bold text-accent-primary hover:text-white transition">
                            Detaylar
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === "grid" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStations.map((station) => (
              <Link 
                href={`/operator/stations/${station.id}`}
                key={station.id} 
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-surface-1 p-5 transition hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10 block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary group-hover:bg-accent-primary/20 transition">
                      <BatteryCharging size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{station.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-text-tertiary">
                        <MapPin size={12} />
                        <span>{station.lat?.toFixed(4) || 0}, {station.lng?.toFixed(4) || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-xs text-text-tertiary mb-1">Yük</p>
                    <div className="flex items-center gap-1.5">
                      <BatteryCharging size={14} className={station.status === 'RED' ? 'text-red-400' : 'text-green-400'} />
                      <span className="text-sm font-medium text-text-secondary">%{station.load}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <p className="text-xs text-text-tertiary mb-1">Fiyat</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-text-secondary">{station.price} ₺</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${station.status === 'RED' ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    <span className="text-xs font-medium text-text-secondary">
                      {station.status === 'RED' ? 'Yoğun' : 'Müsait'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-green-400">{station.greenReservationCount} Yeşil Şarj</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {viewMode === "map" && (
          <div className="h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
             <Map stations={filteredStations.map(s => ({
               id: s.id,
               name: s.name,
               lat: s.lat || 38.4192,
               lng: s.lng || 27.1287,
               price: s.price,
               mockLoad: s.load,
               mockStatus: s.status,
             }))} onSelect={() => {}} />
          </div>
        )}
      </div>
    </div>
  );
}
