"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BatteryCharging, Calendar, Clock, Leaf, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Reservation = {
  id: number;
  date: string;
  hour: string;
  isGreen: boolean;
  earnedCoins: number;
  status: string;
  station: {
    id: number;
    name: string;
    price: number;
  };
};

type UserPayload = {
  reservations: Reservation[];
};

export default function AppointmentsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChargingId, setActiveChargingId] = useState<number | null>(null);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
    if (!userId) {
      setError("Önce giriş yapmalısınız.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadReservations = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Randevular alınamadı");
        const data = (await response.json()) as UserPayload;
        setReservations(data.reservations);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Appointments fetch failed", err);
        setError("Randevular yüklenemedi.");
      } finally {
        setIsLoading(false);
      }
    };

    loadReservations();
    return () => controller.abort();
  }, []);

  const handleStartCharging = (id: number) => {
    setActiveChargingId(id);
  };

  return (
    <main className="min-h-screen bg-slate-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-blue-900/20" />
      
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Randevularım</h1>
            <p className="text-sm text-slate-200 mt-1">Yaklaşan şarj istasyonu rezervasyonların.</p>
          </div>
          <Link
            href="/driver"
            className="p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 transition text-slate-200 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
            {error}
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700 mb-4">
              <Calendar className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-200">Henüz randevun yok</h3>
            <p className="text-slate-300 text-sm mt-2 max-w-xs mx-auto">
              Haritadan uygun bir istasyon seçip rezervasyon oluşturabilirsin.
            </p>
            <Link 
              href="/driver" 
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition"
            >
              Haritaya Git
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((res) => (
              <Card key={res.id} className="p-5 border-slate-600 bg-slate-700/60 hover:border-slate-500 transition group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${res.isGreen ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{res.station.name}</h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(res.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {res.hour}
                        </span>
                      </div>
                      {res.isGreen && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-medium text-green-300">
                          <Leaf className="h-3 w-3" />
                          Eco Slot (+{res.earnedCoins} Coin)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleStartCharging(res.id)}
                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-medium transition border border-slate-500 hover:border-blue-500/50"
                  >
                    Şarjı Başlat
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Charging Simulation Modal */}
      {activeChargingId && (
        <ChargingSimulation 
          reservation={reservations.find(r => r.id === activeChargingId)!} 
          onClose={() => setActiveChargingId(null)} 
        />
      )}
    </main>
  );
}

function ChargingSimulation({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ energy: 0, coins: 0, co2: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 0.5; // Simulate charging speed
      });
      
      setStats(prev => ({
        energy: prev.energy + 0.1,
        coins: prev.coins + (reservation.isGreen ? 0.5 : 0.1),
        co2: prev.co2 + 0.05
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [reservation.isGreen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="p-6 text-center relative z-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Şarj Ediliyor...</h2>
            <p className="text-sm text-slate-400 mt-1">{reservation.station.name}</p>
          </div>

          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
            {/* Circular Progress */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke={reservation.isGreen ? "#4ade80" : "#3b82f6"} 
                strokeWidth="8" 
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * progress) / 100}
                strokeLinecap="round"
                className="transition-all duration-100 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{Math.floor(progress)}%</span>
              <span className="text-xs text-slate-400 uppercase tracking-wider mt-1">Batarya</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Enerji</div>
              <div className="text-lg font-semibold text-blue-300">{stats.energy.toFixed(1)} <span className="text-xs">kWh</span></div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Kazanılan</div>
              <div className="text-lg font-semibold text-yellow-300">+{Math.floor(stats.coins)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">CO₂ Tasarruf</div>
              <div className="text-lg font-semibold text-green-300">{stats.co2.toFixed(2)} <span className="text-xs">kg</span></div>
            </div>
          </div>

          {progress >= 100 ? (
            <button 
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition shadow-lg shadow-green-900/20"
            >
              Tamamla
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Simülasyonu Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
