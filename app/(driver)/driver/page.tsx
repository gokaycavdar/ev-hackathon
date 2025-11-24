"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { BatteryCharging, Leaf, Loader2, Zap, X, PartyPopper, Megaphone } from "lucide-react";
import type { StationMarker } from "@/components/Map";

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

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
    if (id) setUserId(Number.parseInt(id, 10));
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
      const response = await fetch(`/api/stations/${station.id}`);
      if (!response.ok) throw new Error("Slot bilgisi alınamadı");
      const data = (await response.json()) as StationMarker & { slots: Slot[] };
      setSlots(data.slots);
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
          message: "Rezervasyon tamamlandı!",
          detail: `+${slot.coins} Coin kazandın — ${slot.isGreen ? "Eco Slot" : "Standart Slot"}.`,
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-500 bg-slate-700 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-600 bg-slate-700/80 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-400">Smart Slot Finder</p>
                <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
                  <Zap className="h-5 w-5 text-yellow-400" /> {modalTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-200">
                  Yoğunluğu düşük saatleri seçerek daha fazla coin kazan.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-500 p-2 text-slate-200 transition hover:border-slate-400 hover:text-white"
                onClick={() => setSelectedStation(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
              <div className="flex-1 max-h-[60vh] overflow-y-auto px-6 py-6">
                {isLoadingSlots ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-300">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p>Slotlar yükleniyor...</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {slots.map((slot) => {
                      const style = slot.isGreen
                        ? "border-green-400/80 bg-gradient-to-br from-green-500/15 to-emerald-600/10 hover:from-green-500/25 hover:to-emerald-600/20 focus-visible:outline-green-400"
                        : "border-slate-500/80 bg-slate-600/60 hover:border-slate-400 focus-visible:outline-slate-400";
                      return (
                        <button
                          key={slot.hour}
                          className={`group relative flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-0 ${style}`}
                          disabled={isBooking}
                          onClick={() => handleBooking(slot)}
                          type="button"
                        >
                          {slot.isGreen ? (
                            <span className="absolute -top-3 right-4 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black shadow-md">
                              Eco
                            </span>
                          ) : null}

                          {slot.campaignApplied ? (
                            <span className="absolute -top-3 left-4 rounded-full bg-purple-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md z-10">
                              {slot.campaignApplied.discount}
                            </span>
                          ) : null}

                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-100 font-mono">{slot.label}</div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-200">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  slot.isGreen ? "bg-green-400 shadow-[0_0_0_3px_rgba(74,222,128,.35)]" : "bg-slate-400"
                                }`}
                              />
                              %{slot.load}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-200">
                            <span className="font-medium text-slate-100">{slot.price.toFixed(2)} ₺</span>
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                slot.isGreen ? "text-yellow-300" : "text-slate-200"
                              }`}
                            >
                              <BatteryCharging className="h-3 w-3" /> +{slot.coins}
                            </span>
                          </div>

                          {slot.campaignApplied ? (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-purple-400">
                              <Megaphone className="h-3 w-3" /> {slot.campaignApplied.title}
                            </p>
                          ) : slot.isGreen ? (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-green-400">
                              <Leaf className="h-3 w-3" /> Düşük yük – ekstra ödül
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-200">Standart tarife</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {recommendation && (
                <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-600 bg-slate-700/50 p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold">
                    <Zap className="h-4 w-4" />
                    Akıllı Öneri
                  </div>
                  <p className="text-xs text-slate-200">
                    Seçtiğin istasyon şu an yoğun. Yakınlarda daha sakin bir alternatif var:
                  </p>
                  
                  <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4 transition hover:bg-green-500/20 cursor-pointer"
                       onClick={() => handleStationSelect(recommendation)}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-green-300 text-sm">{recommendation.name}</h3>
                      <span className="bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                        %{recommendation.mockLoad}
                      </span>
                    </div>
                    <div className="text-xs text-slate-200 mb-3">
                      Daha düşük yoğunluk ve bekleme süresi.
                    </div>
                    <button className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition">
                      Bu İstasyona Git
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-600 bg-slate-700/60 px-6 py-4 text-xs text-slate-200">
              <span>Yeşil slotlar %20 indirim ve ekstra coin kazandırır.</span>
              <span>Yüksek yük uyarısı kırmızı çerçeve ile gösterilir.</span>
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