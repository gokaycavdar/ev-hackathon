"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, Calendar, MapPin, ArrowRight, Sparkles, Clock, BatteryCharging, Coins, ExternalLink } from "lucide-react";

type GlobalRecommendation = {
  id: number;
  stationId: number;
  stationName: string;
  slot: string;
  reason: string;
  coins: number;
  distance: string;
  density: number;
  speed: string; // "AC" | "DC"
  type: "SPEED" | "PRICE" | "ECO";
};

export default function GlobalAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<GlobalRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initUser = async () => {
      const storedId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
      if (storedId) setUserId(Number.parseInt(storedId, 10));
      
      try {
        const res = await fetch("/api/demo-user");
        if (res.ok) {
          const user = await res.json();
          setUserId(user.id);
        }
      } catch (e) {
        console.error("Failed to sync demo user", e);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setSuccessMsg(null);
      
      // Fetch real stations to generate recommendations
      fetch("/api/stations")
        .then((res) => res.json())
        .then((stations: any[]) => {
          // Shuffle and pick 3 random stations for demo purposes
          // In a real AI app, this would be a complex algorithm
          const shuffled = stations.sort(() => 0.5 - Math.random()).slice(0, 3);
          
          const newRecs: GlobalRecommendation[] = shuffled.map((station, index) => {
            const types: ("ECO" | "SPEED" | "PRICE")[] = ["ECO", "SPEED", "PRICE"];
            const type = types[index % 3];
            
            let reason = "";
            let density = station.mockLoad || 50;

            if (type === "ECO") {
              reason = "Bölgedeki en düşük yoğunluk";
              // Force low density for ECO recommendation to ensure consistency
              if (density > 40) density = Math.floor(Math.random() * 25) + 10;
            }
            else if (type === "SPEED") {
              reason = "Yüksek hızlı şarj müsait";
            }
            else {
              reason = "Akşam saatleri için en uygun fiyat";
            }

            return {
              id: index + 1,
              stationId: station.id,
              stationName: station.name,
              slot: `${14 + index}:00 - ${16 + index}:00`,
              reason,
              coins: 30 + (index * 10),
              distance: `${(1.2 + index * 1.5).toFixed(1)} km`,
              density: density,
              speed: index % 2 === 0 ? "AC" : "DC",
              type
            };
          });
          
          setRecommendations(newRecs);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch stations", err);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleInspect = (rec: GlobalRecommendation) => {
    setIsOpen(false);
    router.push(`/driver?stationId=${rec.stationId}`);
  };

  const handleBook = async (rec: GlobalRecommendation) => {
    // Fallback to demo user ID if not set (for hackathon robustness)
    const activeUserId = userId || 20; 
    
    setBookingId(rec.id);
    
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          stationId: rec.stationId,
          date: new Date().toISOString(),
          hour: rec.slot.split(" - ")[0],
          isGreen: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Rezervasyon Başarılı! Randevularım sayfasından takip edebilirsin.");
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg(null);
          setBookingId(null);
        }, 2500);
      } else {
        alert("Rezervasyon başarısız: " + data.error);
        setBookingId(null);
      }
    } catch (error) {
      console.error("Booking failed", error);
      alert("Bir hata oluştu.");
      setBookingId(null);
    }
  };

  return (
    <>
      {/* Floating Button - Positioned next to Chatbot (bottom-6 right-24 approx) */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-110 hover:shadow-purple-600/50 active:scale-95"
        title="AI Global Öneriler"
      >
        <Zap className="h-7 w-7 fill-white" />
      </button>

      {/* Centered Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl ring-1 ring-white/10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-8 py-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">AI Global Öneriler</h2>
                  <p className="text-sm text-slate-400">Sistem genelindeki en iyi fırsatlar senin için seçildi.</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              {successMsg ? (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
                  <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-400 ring-1 ring-green-500/40 shadow-lg shadow-green-500/20">
                    <Sparkles className="h-12 w-12" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">Harika!</h3>
                  <p className="text-lg text-slate-300 mb-8 max-w-md">{successMsg}</p>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl bg-white px-10 py-4 font-bold text-black hover:bg-slate-200 transition active:scale-95"
                  >
                    Tamam
                  </button>
                </div>
              ) : isLoading ? (
                <div className="flex h-64 items-center justify-center text-slate-500">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                    <p>Fırsatlar taranıyor...</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {recommendations.map((rec) => (
                    <div 
                      key={rec.id} 
                      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-purple-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-purple-900/20"
                    >
                      {/* Background Gradient */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 transition group-hover:opacity-100" />
                      
                      <div className="relative z-10">
                        {/* Badges */}
                        <div className="mb-4 flex flex-wrap gap-2">
                          {rec.type === "ECO" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-bold text-green-400 border border-green-500/20">
                              <Sparkles className="h-3 w-3" /> Eco Fırsat
                            </span>
                          )}
                          {rec.type === "SPEED" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
                              <Zap className="h-3 w-3" /> Hızlı Şarj
                            </span>
                          )}
                          {rec.type === "PRICE" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400 border border-yellow-500/20">
                              <Coins className="h-3 w-3" /> Uygun Fiyat
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${
                            rec.density < 30 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            rec.density < 70 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            %{rec.density} Yoğunluk
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{rec.stationName}</h3>
                        <p className="text-sm text-slate-400 mb-4">{rec.reason}</p>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-sm text-slate-300">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                              <Clock className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{rec.slot}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-300">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span>{rec.distance}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-300">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                              <BatteryCharging className="h-4 w-4" />
                            </div>
                            <span>{rec.speed} Şarj</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto relative z-10">
                        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-900/50 px-4 py-3 border border-slate-700/50">
                          <span className="text-xs font-medium text-slate-400">Kazanç</span>
                          <span className="font-bold text-yellow-400">+{rec.coins} Coin</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleInspect(rec)}
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-white transition hover:bg-slate-600 active:scale-95"
                            title="Haritada Gör"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleBook(rec)}
                            disabled={bookingId !== null}
                            className={`group/btn flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition active:scale-95 ${
                              bookingId === rec.id 
                                ? "bg-slate-700 text-slate-400 cursor-wait" 
                                : "bg-white text-black hover:bg-slate-200"
                            }`}
                          >
                            {bookingId === rec.id ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                İşleniyor...
                              </>
                            ) : (
                              <>
                                Rezerve Et
                                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}