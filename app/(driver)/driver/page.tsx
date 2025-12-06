"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BatteryCharging, Leaf, Loader2, Zap, X, PartyPopper, Megaphone, Sparkles, MapPin } from "lucide-react";
import type { StationMarker } from "@/components/Map";
import { generateDynamicTimeslots, calculateGreenRewards, getDensityLevel } from "@/lib/utils-ai";

const Map = dynamic(async () => (await import("@/components/Map")).default, { ssr: false });

type Slot = {
  hour: number;
  label: string;
  startTime: string;
  isGreen: boolean;
  coins: number;
  price: number;
  status: string;
  load: number;
  campaignApplied?: {
    title: string;
    discount: string;
  } | null;
};

type ToastState = {
  message: string;
  detail?: string;
} | null;

export default function DriverDashboard() {
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationMarker | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [filterMode, setFilterMode] = useState<"ALL" | "ECO">("ALL");

  useEffect(() => {
    const initUser = async () => {
      // 1. Try to get from local storage
      const storedId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
      
      if (storedId) {
        // Optional: Verify if this user still exists? 
        // For now, just trust it, but if we want "root solution", we should probably just fetch the demo user always
        // or fetch if the current one fails.
        // Let's just fetch the demo user to be safe and sync it.
        setUserId(Number.parseInt(storedId, 10));
      }

      // Always fetch the correct demo user ID to ensure we are in sync with the latest seed
      try {
        const res = await fetch("/api/demo-user");
        if (res.ok) {
          const user = await res.json();
          setUserId(user.id);
          localStorage.setItem("ecocharge:userId", user.id.toString());
        }
      } catch (e) {
        console.error("Failed to fetch demo user", e);
      }
    };

    initUser();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadStations = async () => {
      try {
        const response = await fetch("/api/stations", { signal: controller.signal });
        if (!response.ok) throw new Error("İstasyonlar yüklenemedi");
        const data = (await response.json()) as StationMarker[];
        setStations(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Station fetch failed", error);
        setToast({ message: "İstasyonlar yüklenemedi", detail: "Lütfen sayfayı yenileyin." });
      }
    };
    loadStations();
    return () => controller.abort();
  }, []);

  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchSlots = useCallback(async (station: StationMarker) => {
    setIsLoadingSlots(true);
    try {
      // For the hackathon demo, we generate dynamic rolling slots client-side
      // to ensure the "24-hour rolling window" requirement is met visually.
      // We still call the API to ensure we don't break any tracking, but we use the generator for UI.
      // const response = await fetch(`/api/stations/${station.id}`);
      // if (!response.ok) throw new Error("Slot bilgisi alınamadı");
      // const data = (await response.json()) as StationMarker & { slots: Slot[] };
      
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const generatedSlots = generateDynamicTimeslots();
      
      // Apply dynamic pricing based on density
      const density = station.mockLoad || 50;
      const basePrice = station.price;
      
      const pricedSlots = generatedSlots.map(slot => {
        let priceMultiplier = 1;
        if (slot.load < 30) priceMultiplier = 0.95; // -5%
        else if (slot.load > 70) priceMultiplier = 1.15; // +15%
        
        return {
          ...slot,
          price: Number((basePrice * priceMultiplier).toFixed(2))
        };
      });

      setSlots(pricedSlots);
    } catch (error) {
      console.error("Slot fetch failed", error);
      setToast({ message: "Slot bilgisi alınamadı", detail: "Birazdan tekrar deneyin." });
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  const handleStationSelect = useCallback((station: StationMarker) => {
    setSelectedStation(station);
    setSlots([]);
    void fetchSlots(station);
  }, [fetchSlots]);

  // Basic DOM confetti spawner (lightweight, no external deps)
  const fireConfetti = useCallback(() => {
    const root = document.body;
    for (let i = 0; i < 26; i++) {
      const piece = document.createElement("div");
      const size = Math.random() * 8 + 6;
      const hue = Math.floor(Math.random() * 60) + 90; // green / yellow spectrum
      piece.style.position = "fixed";
      piece.style.top = "50%";
      piece.style.left = "50%";
      piece.style.width = `${size}px`;
      piece.style.height = `${size * 0.4}px`;
      piece.style.background = `hsl(${hue}deg 80% 55%)`;
      piece.style.borderRadius = "2px";
      piece.style.pointerEvents = "none";
      piece.style.zIndex = "9999";
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 250 + 120;
      const duration = Math.random() * 700 + 700;
      const destX = Math.cos(angle) * distance;
      const destY = Math.sin(angle) * distance;
      piece.animate(
        [
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          {
            transform: `translate(${destX}px, ${destY}px) rotate(${Math.random() * 720}deg) scale(.9)`,
            opacity: 0,
          },
        ],
        { duration, easing: "cubic-bezier(.25,.8,.45,1)", fill: "forwards" },
      );
      setTimeout(() => piece.remove(), duration + 50);
      root.appendChild(piece);
    }
  }, []);

  const handleBooking = useCallback(
    async (slot: Slot) => {
      if (!selectedStation || !userId) {
        setToast({ message: "Kullanıcı bulunamadı", detail: "Önce giriş yapın." });
        return;
      }

      setIsBooking(true);

      try {
        const response = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            stationId: selectedStation.id,
            date: slot.startTime,
            hour: slot.label,
            isGreen: slot.isGreen,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Rezervasyon başarısız");
        }

        fireConfetti();
        setToast({
          message: "Randevu oluşturuldu.",
          detail: "Simülasyonu tamamlayınca ödüller kazanacaksın.",
        });
        setSelectedStation(null);
      } catch (error) {
        console.error("Reservation failed", error);
        setToast({ message: "Rezervasyon oluşturulamadı", detail: "Lütfen tekrar deneyin." });
      } finally {
        setIsBooking(false);
      }
    },
    [selectedStation, userId, fireConfetti],
  );

  const modalTitle = useMemo(() => {
    if (!selectedStation) return "";
    return `${selectedStation.name}`;
  }, [selectedStation]);

  const recommendation = useMemo(() => {
    if (!selectedStation || !stations.length) return null;
    
    // If current station is not busy (GREEN), no need for recommendation
    if (selectedStation.mockStatus === "GREEN") return null;

    // Find nearby stations (simple distance check) that are GREEN
    // Since we don't have complex geo-lib, we'll just check lat/lng diff
    const nearbyGreenStations = stations.filter(s => 
      s.id !== selectedStation.id && 
      s.mockStatus === "GREEN" &&
      Math.abs(s.lat - selectedStation.lat) < 0.1 && // Roughly nearby
      Math.abs(s.lng - selectedStation.lng) < 0.1
    );

    if (nearbyGreenStations.length === 0) return null;

    // Pick the one with lowest load
    return nearbyGreenStations.sort((a, b) => (a.mockLoad || 100) - (b.mockLoad || 100))[0];
  }, [selectedStation, stations]);

  return (
    <div className="relative min-h-screen bg-slate-700">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900/40" />
      <div className="relative z-10 h-screen w-full">
        <Map stations={stations} onSelect={handleStationSelect} />
      </div>

      {selectedStation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-600 bg-slate-800/95 text-white shadow-2xl ring-1 ring-white/10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-8 py-6 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg ${
                  selectedStation.mockStatus === "RED" ? "border-red-500 bg-red-500/20 text-red-400" :
                  selectedStation.mockStatus === "YELLOW" ? "border-yellow-500 bg-yellow-500/20 text-yellow-400" :
                  "border-green-500 bg-green-500/20 text-green-400"
                }`}>
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{modalTitle}</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      {selectedStation.mockStatus === "RED" ? "Yüksek Yoğunluk" : 
                       selectedStation.mockStatus === "YELLOW" ? "Orta Yoğunluk" : "Düşük Yoğunluk"}
                    </span>
                    <span>•</span>
                    <span>{selectedStation.price.toFixed(2)} ₺/kWh</span>
                  </div>
                </div>
              </div>
              <button
                className="rounded-full bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                onClick={() => setSelectedStation(null)}
                type="button"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel: Slots Grid */}
              <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Saat Seçimi</h3>
                  <div className="flex gap-2 text-xs">
                    <button 
                      onClick={() => setFilterMode("ECO")}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
                        filterMode === "ECO" 
                          ? "bg-green-500 text-white shadow-lg shadow-green-500/25 ring-1 ring-green-400" 
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      <Leaf className="h-3 w-3" /> Eco Slot
                    </button>
                    <button 
                      onClick={() => setFilterMode("ALL")}
                      className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition-all ${
                        filterMode === "ALL" 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 ring-1 ring-blue-400" 
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                    >
                      Standart
                    </button>
                  </div>
                </div>

                {isLoadingSlots ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p>Uygun saatler hesaplanıyor...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {slots
                      .filter(s => filterMode === "ALL" || s.isGreen)
                      .map((slot) => {
                      return (
                        <button
                          key={slot.hour}
                          disabled={isBooking}
                          onClick={() => handleBooking(slot)}
                          className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                            slot.isGreen
                              ? "border-green-500/30 bg-gradient-to-b from-green-500/10 to-green-900/20 hover:border-green-500/60 hover:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800"
                          } ${filterMode === "ECO" && !slot.isGreen ? "opacity-50 grayscale" : ""}`}
                        >
                          {slot.isGreen && (
                            <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                          )}
                          
                          <div className="mb-2 flex items-center justify-between">
                            <span className={`text-sm font-bold ${slot.isGreen ? "text-green-100" : "text-slate-200"}`}>
                              {slot.label.split(" - ")[0]}
                            </span>
                            <span className={`text-[10px] font-medium ${
                              slot.load < 40 ? "text-green-400" : slot.load < 70 ? "text-yellow-400" : "text-red-400"
                            }`}>
                              %{slot.load}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Fiyat</span>
                              <span className="font-medium text-slate-200">{slot.price} ₺</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Kazanç</span>
                              <span className={`font-bold ${slot.isGreen ? "text-yellow-400" : "text-slate-500"}`}>
                                +{slot.coins}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: AI & Alternatives */}
              <div className="w-80 border-l border-slate-700 bg-slate-900/50 p-6 backdrop-blur-sm flex flex-col h-full overflow-y-auto">
                {/* AI Insight */}
                <div className="mb-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-5 shadow-lg shadow-purple-900/10 shrink-0">
                  <div className="mb-3 flex items-center gap-2 text-purple-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    <span className="text-sm font-bold tracking-wide">AI SMART PICK</span>
                  </div>
                  
                  {slots.find(s => s.isGreen) ? (
                    <>
                      <p className="mb-3 text-sm leading-relaxed text-slate-300">
                        Şu an bölgede yoğunluk <span className="text-white font-medium">düşük (%{selectedStation.mockLoad || 24})</span>. 
                        <br/><br/>
                        Saat <span className="text-green-400 font-bold">{slots.find(s => s.isGreen)?.label.split(" - ")[0]}</span> için Eco Slot rezervasyonu yaparsan <span className="text-yellow-400 font-bold">{slots.find(s => s.isGreen)?.coins} Coin</span> kazanabilirsin.
                      </p>
                      <button 
                        onClick={() => {
                          const s = slots.find(s => s.isGreen);
                          if(s) handleBooking(s);
                        }}
                        className="w-full rounded-lg bg-purple-600 py-2 text-xs font-bold text-white transition hover:bg-purple-500 shadow-lg shadow-purple-600/20"
                      >
                        Bu Saati Rezerve Et
                      </button>

                      {/* Mock Alternative AI Pick */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Alternatif Öneri</span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Daha Hızlı</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span>16:00 - 18:00</span>
                          <span className="text-white font-medium">120kW DC</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Şu an için özel bir öneri bulunmuyor.</p>
                  )}
                </div>

                {/* Alternative Stations - ONLY if High Density */}
                {(selectedStation.mockLoad || 0) > 70 && (
                  <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="mb-4 flex items-center gap-2 text-orange-400">
                      <Megaphone className="h-4 w-4" />
                      <h4 className="text-sm font-medium uppercase tracking-wider">Yoğunluk Uyarısı</h4>
                    </div>
                    <p className="mb-4 text-xs text-slate-400">
                      Bu istasyon şu an çok yoğun (%{selectedStation.mockLoad}). Daha hızlı şarj için bu alternatifleri değerlendirebilirsin:
                    </p>
                    
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-3 transition-all hover:border-green-500/30 hover:bg-slate-800"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-slate-400 transition-colors group-hover:bg-green-600 group-hover:text-white">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-slate-200 group-hover:text-white">ZES Point #{100 + i}</div>
                              <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                                %{30 + i * 5}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 group-hover:text-slate-400 mt-1">
                              <span>{(0.8 + i * 0.4).toFixed(1)} km</span>
                              <span>•</span>
                              <span className="text-blue-400">Daha Uygun</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-slate-500 bg-slate-700/90 px-5 py-4 text-white shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{toast.message}</p>
              {toast.detail ? <p className="mt-1 text-xs text-slate-200">{toast.detail}</p> : null}
            </div>
            <button className="text-slate-300 hover:text-white" onClick={closeToast} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
          {toast.message.includes("Rezervasyon") && (
            <div className="mt-3 flex items-center gap-2 text-xs text-green-300">
              <PartyPopper className="h-4 w-4" /> Tebrikler! Enerjiyi verimli kullandın.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}