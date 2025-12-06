"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, BatteryCharging, Calendar, Clock, Leaf, Loader2, Zap, CheckCircle2, X } from "lucide-react";
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

  const pendingReservations = reservations.filter(r => r.status === "PENDING");
  const completedReservations = reservations.filter(r => r.status === "COMPLETED");

  const loadReservations = useCallback(async () => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
    if (!userId) return;

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Randevular alınamadı");
      const data = (await response.json()) as UserPayload;
      setReservations(data.reservations);
    } catch (err) {
      console.error("Appointments fetch failed", err);
      setError("Randevular yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
    if (!userId) {
      setError("Önce giriş yapmalısınız.");
      setIsLoading(false);
      return;
    }
    loadReservations();
  }, [loadReservations]);

  const handleStartCharging = (id: number) => {
    setActiveChargingId(id);
  };

  const handleSimulationComplete = () => {
    loadReservations();
    setActiveChargingId(null);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900" />
      
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Randevularım</h1>
            <p className="text-sm text-slate-400 mt-2">Yaklaşan şarj istasyonu rezervasyonların ve geçmişin.</p>
          </div>
          <Link
            href="/driver"
            className="group flex items-center gap-2 px-4 py-2 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Geri Dön</span>
          </Link>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
            <p>Randevular yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-center">
            {error}
          </div>
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border border-slate-700 mb-6 shadow-xl">
              <Calendar className="h-10 w-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Henüz randevun yok</h3>
            <p className="text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
              Haritadan uygun bir istasyon seçip rezervasyon oluşturabilirsin.
            </p>
            <Link 
              href="/driver" 
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
            >
              Haritaya Git
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* PENDING RESERVATIONS */}
            {pendingReservations.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  Bekleyen Randevular
                </h2>
                <div className="grid gap-4">
                  {pendingReservations.map((res) => (
                    <div 
                      key={res.id} 
                      className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg shadow-blue-900/20 ring-1 ring-blue-500/20 transition-all hover:shadow-blue-600/20"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 transition group-hover:opacity-100" />
                      
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg ${
                            res.isGreen 
                              ? 'border-green-500/20 bg-green-500/10 text-green-400 shadow-green-900/20' 
                              : 'border-blue-500/20 bg-blue-500/10 text-blue-400 shadow-blue-900/20'
                          }`}>
                            <Zap className="h-7 w-7" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-white">{res.station.name}</h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400 border border-yellow-500/20 animate-pulse">
                                <Clock className="h-3 w-3" /> Bekliyor
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                {new Date(res.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-slate-500" />
                                {res.hour}
                              </span>
                            </div>

                            {res.isGreen && (
                              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold border bg-green-500/10 text-green-400 border-green-500/20">
                                <Leaf className="h-3.5 w-3.5" />
                                Eco Slot
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 sm:self-center">
                          <button
                            onClick={() => handleStartCharging(res.id)}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold transition shadow-lg shadow-blue-600/25 active:scale-95 ring-1 ring-blue-400/20"
                          >
                            Simülasyonu Başlat
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* COMPLETED RESERVATIONS */}
            {completedReservations.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-slate-400 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Tamamlananlar
                </h2>
                <div className="grid gap-4 opacity-75 hover:opacity-100 transition-opacity">
                  {completedReservations.map((res) => (
                    <div 
                      key={res.id} 
                      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 grayscale hover:grayscale-0 transition-all"
                    >
                      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-500 shadow-lg">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{res.station.name}</h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                                Tamamlandı
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {new Date(res.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                {res.hour}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 sm:self-center">
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Kazanılan</p>
                            <p className="font-bold text-yellow-500/80 group-hover:text-yellow-400 transition-colors">+{res.earnedCoins} Coin</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Charging Simulation Modal */}
      {activeChargingId && (
        <ChargingSimulation 
          reservation={reservations.find(r => r.id === activeChargingId)!} 
          onClose={() => setActiveChargingId(null)} 
          onComplete={handleSimulationComplete}
        />
      )}
    </main>
  );
}

function ChargingSimulation({ reservation, onClose, onComplete }: { reservation: Reservation; onClose: () => void; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ energy: 0, coins: 0, co2: 0 });
  const [completed, setCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setCompleted(true);
          return 100;
        }
        return prev + 1; // Faster simulation
      });
      
      setStats(prev => ({
        energy: prev.energy + 0.15,
        coins: 50, // Fixed reward
        co2: prev.co2 + 0.08
      }));
    }, 50);
    
    return () => clearInterval(interval);
  }, [reservation.isGreen]);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "COMPLETED",
          earnedCoins: 50,
          earnedXp: 50
        })
      });
      
      if (res.ok) {
        onComplete();
      } else {
        console.error("Failed to complete reservation");
        onClose();
      }
    } catch (error) {
      console.error("Error completing reservation", error);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-[2rem] overflow-hidden shadow-2xl relative ring-1 ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
        
        {/* Close Button */}
        {!completed && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white z-20">
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="p-8 text-center relative z-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {completed ? "Şarj Tamamlandı!" : "Şarj Ediliyor..."}
            </h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">{reservation.station.name}</p>
          </div>

          <div className="relative w-56 h-56 mx-auto mb-10 flex items-center justify-center">
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${completed ? "bg-green-500/20" : "bg-blue-500/20"}`} />
            
            {/* Circular Progress */}
            <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle 
                cx="50" cy="50" r="45" 
                fill="none" 
                stroke={completed ? "#4ade80" : reservation.isGreen ? "#4ade80" : "#3b82f6"} 
                strokeWidth="6" 
                strokeDasharray="283" 
                strokeDashoffset={283 - (283 * progress) / 100} 
                strokeLinecap="round"
                className="transition-all duration-100 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {completed ? (
                <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
              ) : (
                <>
                  <span className="text-5xl font-bold text-white tracking-tighter">{Math.round(progress)}%</span>
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-2">Batarya</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Enerji</div>
              <div className="font-bold text-white text-lg">{stats.energy.toFixed(1)} <span className="text-xs text-slate-500">kWh</span></div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Kazanılan</div>
              <div className="font-bold text-yellow-400 text-lg">+{completed ? 50 : "..."}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700/50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">CO₂</div>
              <div className="font-bold text-green-400 text-lg">-{stats.co2.toFixed(2)} <span className="text-xs text-slate-500">kg</span></div>
            </div>
          </div>

          {completed ? (
            <button 
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold text-lg transition shadow-lg shadow-green-500/25 animate-in slide-in-from-bottom-4 disabled:opacity-50"
            >
              {isSubmitting ? "İşleniyor..." : "Ödülleri Topla"}
            </button>
          ) : (
            <p className="text-xs text-slate-500 animate-pulse">
              Optimum şarj hızı ayarlanıyor...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
