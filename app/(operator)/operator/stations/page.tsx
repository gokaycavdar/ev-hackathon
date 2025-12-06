"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, MapPin, Zap, Battery, MoreVertical, Edit, Trash, List, Map as MapIcon } from "lucide-react";
import Map from "@/components/Map";

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
    <div className="min-h-screen bg-slate-900 p-6 lg:p-10 text-white font-sans">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">İstasyon Yönetimi</h1>
          <p className="text-slate-400 mt-1">Şarj noktalarınızı izleyin ve yönetin.</p>
        </div>
        <Link 
          href="/operator/stations/new" 
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 hover:shadow-purple-500/40"
        >
          <Plus size={18} />
          Yeni İstasyon Ekle
        </Link>
      </header>

      {/* Filters & Search */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="İstasyon ara..." 
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700">
            <Filter size={18} />
            Filtrele
          </button>
        </div>

        <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "list" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <List size={18} />
            Liste
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              viewMode === "map" ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-white"
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
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-700 bg-slate-800/50 py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-700 p-4">
            <Zap className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">İstasyon Bulunamadı</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Henüz bir istasyon eklemediniz veya aramanızla eşleşen sonuç yok.
          </p>
          <Link 
            href="/operator/stations/new" 
            className="mt-6 text-sm font-medium text-purple-400 hover:text-purple-300"
          >
            İlk istasyonunuzu ekleyin &rarr;
          </Link>
        </div>
      ) : viewMode === "map" ? (
        <div className="h-[600px] rounded-2xl overflow-hidden border border-slate-700">
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
              className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-5 transition hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{station.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={12} />
                      <span>{station.lat?.toFixed(4) || 0}, {station.lng?.toFixed(4) || 0}</span>
                    </div>
                  </div>
                </div>
                <button className="text-slate-400 hover:text-white">
                  <Edit size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-500 mb-1">Güç</p>
                  <div className="flex items-center gap-1.5">
                    <Battery size={14} className="text-green-400" />
                    <span className="text-sm font-medium text-slate-200">{station.power || 22} kW</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-500 mb-1">Tip</p>
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-slate-200">{station.type || "AC"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${station.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-xs font-medium text-slate-300">
                    {station.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                <p className="text-sm font-bold text-white">
                  {station.price} ₺<span className="text-xs font-normal text-slate-500">/kWh</span>
                </p>
              </div>
              
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
