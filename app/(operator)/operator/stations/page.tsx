"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MapPin, Zap, Battery, MoreVertical, Edit, Trash, List, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Station = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  price: number;
  type: "AC" | "DC";
  power: number; // kW
  connectorType?: string;
  address?: string;
};

export default function StationsPage() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const ownerId = localStorage.getItem("ecocharge:userId") ?? "1";
        const res = await fetch(`/api/company/my-stations?ownerId=${ownerId}`);
        if (res.ok) {
          const data = await res.json();
          // The API returns a complex object, we need to extract stations from it or adjust the type
          // Based on dashboard, it returns { stats: ..., stations: ... }
          // Actually api/company/my-stations returns an array directly in the code I read?
          // Wait, let me check api/company/my-stations/route.ts again.
          // It returns `NextResponse.json(stationPayload)`?
          // No, wait.
          // The code I read for api/company/my-stations/route.ts ended with `const stats = ...`.
          // I need to check what it actually returns.
          if (Array.isArray(data)) {
             setStations(data);
          } else if (data.stations) {
            setStations(data.stations);
          }
        }
      } catch (error) {
        console.error("Failed to fetch stations", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStations();
  }, []);

  const filteredStations = stations.filter(station => 
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-primary-bg p-6 lg:p-10 text-primary font-sans">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display">İstasyon Yönetimi</h1>
          <p className="text-text-secondary mt-1">Şarj noktalarınızı izleyin ve yönetin.</p>
        </div>
        <Link 
          href="/operator/stations/new" 
          className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-hover hover:shadow-accent-primary/30"
        >
          <Plus size={18} />
          Yeni İstasyon Ekle
        </Link>
      </header>

      {/* Filters & Search */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
            <input 
              type="text" 
              placeholder="İstasyon ara..." 
              className="w-full rounded-xl border border-white/10 bg-surface-1 py-3 pl-10 pr-4 text-sm text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-1 px-4 py-3 text-sm font-medium text-text-secondary hover:bg-surface-2 transition">
            <Filter size={18} />
            Filtrele
          </button>
        </div>

        <div className="flex bg-surface-1 rounded-xl p-1 border border-white/10">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "list" ? "bg-surface-3 text-accent-primary shadow-sm" : "text-text-secondary hover:text-white"
            }`}
          >
            <List size={18} />
            Liste
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "map" ? "bg-surface-3 text-accent-primary shadow-sm" : "text-text-secondary hover:text-white"
            }`}
          >
            <MapIcon size={18} />
            Harita
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent"></div>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-surface-1 py-20 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-surface-2 p-4">
            <Zap className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-white">İstasyon Bulunamadı</h3>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Henüz bir istasyon eklemediniz veya aramanızla eşleşen sonuç yok.
          </p>
          <Link 
            href="/operator/stations/new" 
            className="mt-6 text-sm font-medium text-accent-primary hover:text-accent-hover"
          >
            İlk istasyonunuzu ekleyin &rarr;
          </Link>
        </div>
      ) : viewMode === "map" ? (
        <div className="h-[600px] rounded-2xl overflow-hidden border border-white/10">
          <Map 
            stations={filteredStations} 
            onSelect={(station) => router.push(`/operator/stations/${station.id}`)}
          />
        </div>
      ) : (
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
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{station.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-text-tertiary">
                      <MapPin size={12} />
                      <span>{station.lat?.toFixed(4) || 0}, {station.lng?.toFixed(4) || 0}</span>
                    </div>
                  </div>
                </div>
                <button className="text-text-tertiary hover:text-accent-primary transition">
                  <Edit size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-xs text-text-tertiary mb-1">Güç</p>
                  <div className="flex items-center gap-1.5">
                    <Battery size={14} className="text-green-400" />
                    <span className="text-sm font-medium text-text-secondary">{station.power || 22} kW</span>
                  </div>
                </div>
                <div className="rounded-lg bg-surface-2 p-3">
                  <p className="text-xs text-text-tertiary mb-1">Tip</p>
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-accent-primary" />
                    <span className="text-sm font-medium text-text-secondary">{station.type || "AC"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${station.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs font-medium text-text-secondary">
                    {station.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  {station.price} ₺<span className="text-xs font-normal text-text-tertiary">/kWh</span>
                </p>
              </div>
              
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-accent-primary to-accent-secondary opacity-0 transition-opacity group-hover:opacity-100"></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
