"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Leaf, Loader2, Zap, X, PartyPopper, Megaphone, Sparkles, MapPin, ArrowRight, Star, MessageSquare } from "lucide-react";
import type { StationMarker } from "@/components/Map";
import { authFetch, unwrapResponse, getStoredUserId, getToken, setStoredUserId } from "@/lib/auth";
import { useGeolocation } from "@/lib/useGeolocation";

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

type ScoredStation = {
  stationId: number;
  score: number;
  components: Record<string, number>;
  explanation: string;
};

type StationReview = {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ReviewSummary = {
  averageRating: number;
  reviewCount: number;
};

export default function DriverDashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-700 text-white">Yükleniyor...</div>}>
      <DriverDashboard />
    </Suspense>
  );
}

function DriverDashboard() {
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationMarker | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [filterMode, setFilterMode] = useState<"ALL" | "ECO">("ALL");
  const [aiRecs, setAiRecs] = useState<ScoredStation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [stationReviews, setStationReviews] = useState<StationReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const geo = useGeolocation();

  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId");

  useEffect(() => {
    const initUser = async () => {
      // If we have a JWT token, use the stored userId
      const token = getToken();
      const storedId = getStoredUserId();

      if (token && storedId) {
        setUserId(Number.parseInt(storedId, 10));
        return;
      }

      // No token — fallback to demo-user endpoint for dev
      try {
        const res = await fetch("/api/demo-user");
        if (res.ok) {
          const user = await unwrapResponse<{ id: number; name: string; email: string; role: string }>(res);
          setUserId(user.id);
          setStoredUserId(user.id.toString());
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
        const response = await authFetch("/api/stations", { signal: controller.signal });
        const data = await unwrapResponse<StationMarker[]>(response);
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
      const response = await authFetch(`/api/stations/${station.id}`);
      const stationData = await unwrapResponse<{ slots: Slot[]; averageRating?: number; reviewCount?: number }>(response);
      const fetchedSlots: Slot[] = (stationData.slots ?? []).map((s: Slot) => ({
        ...s,
        campaignApplied: s.campaignApplied ?? null,
      }));
      setSlots(fetchedSlots);
      // Update review summary from station detail response
      if (stationData.averageRating !== undefined && stationData.reviewCount !== undefined) {
        setReviewSummary({
          averageRating: stationData.averageRating,
          reviewCount: stationData.reviewCount,
        });
      }
    } catch (error) {
      console.error("Slot fetch failed", error);
      setToast({ message: "Slot bilgisi alınamadı", detail: "Birazdan tekrar deneyin." });
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setIsLoadingRecs(true);
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (geo.lat != null && geo.lng != null) {
        params.set("lat", String(geo.lat));
        params.set("lng", String(geo.lng));
      }
      const response = await authFetch(`/api/stations/recommend?${params.toString()}`);
      const data = await response.json();
      if (data.success && data.data?.results) {
        setAiRecs(data.data.results);
      }
    } catch (error) {
      console.error("Recommendation fetch failed", error);
    } finally {
      setIsLoadingRecs(false);
    }
  }, [geo.lat, geo.lng]);

  const fetchReviews = useCallback(async (stationId: number) => {
    setIsLoadingReviews(true);
    try {
      const response = await authFetch(`/api/stations/${stationId}/reviews?limit=5`);
      const data = await response.json();
      if (data.success && data.data) {
        setStationReviews(data.data.reviews || []);
        setReviewSummary(data.data.summary || null);
      }
    } catch (error) {
      console.error("Reviews fetch failed", error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  const handleStationSelect = useCallback((station: StationMarker) => {
    setSelectedStation(station);
    // Automatically open details when selected from map popup or sidebar
    setIsDetailsOpen(true);
    setSlots([]);
    setAiRecs([]);
    setStationReviews([]);
    setReviewSummary(null);
    void fetchSlots(station);
    void fetchRecommendations();
    void fetchReviews(station.id);
  }, [fetchSlots, fetchRecommendations, fetchReviews]);

  useEffect(() => {
    if (stationIdParam && stations.length > 0) {
      const sId = parseInt(stationIdParam, 10);
      const station = stations.find((s) => s.id === sId);
      if (station) {
        handleStationSelect(station);
      }
    }
  }, [stationIdParam, stations, handleStationSelect]);

  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setIsDetailsOpen(false);
  }, []);

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
      if (!selectedStation) {
        setToast({ message: "İstasyon seçilmedi", detail: "Lütfen bir istasyon seçin." });
        return;
      }

      setIsBooking(true);

      try {
        const response = await authFetch("/api/reservations", {
          method: "POST",
          body: JSON.stringify({
            stationId: selectedStation.id,
            date: slot.startTime,
            hour: slot.label,
            isGreen: slot.isGreen,
          }),
        });

        await unwrapResponse(response);

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
    [selectedStation, fireConfetti],
  );

  const modalTitle = useMemo(() => {
    if (!selectedStation) return "";
    return `${selectedStation.name}`;
  }, [selectedStation]);

  // Calculate a quick "Best Slot" from real slot data
  const bestSlotPreview = useMemo(() => {
    if (!selectedStation || slots.length === 0) return null;
    // Pick the best green slot (lowest load), or best non-green if no green slots
    const greenSlots = slots.filter(s => s.isGreen);
    const best = greenSlots.length > 0
      ? greenSlots.sort((a, b) => a.load - b.load)[0]
      : [...slots].sort((a, b) => a.load - b.load)[0];
    return {
      time: best.label,
      xp: best.coins,
    };
  }, [selectedStation, slots]);

  // Get the best AI-recommended alternative station (excluding the currently selected one)
  const aiRecommendation = useMemo(() => {
    if (!selectedStation || aiRecs.length === 0 || stations.length === 0) return null;

    // Find the top-scored station that isn't the currently selected one
    for (const rec of aiRecs) {
      if (rec.stationId !== selectedStation.id) {
        const station = stations.find(s => s.id === rec.stationId);
        if (station) {
          return { station, scored: rec };
        }
      }
    }
    return null;
  }, [selectedStation, aiRecs, stations]);

  // Check if the current selected station ranks well in AI recommendations
  const currentStationScore = useMemo(() => {
    if (!selectedStation || aiRecs.length === 0) return null;
    return aiRecs.find(r => r.stationId === selectedStation.id) || null;
  }, [selectedStation, aiRecs]);

  return (
    <div className="relative min-h-screen bg-slate-700">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900/40" />
      <div className="relative z-10 h-screen w-full">
        <Map stations={stations} onSelect={handleStationSelect} onMapClick={handleMapClick} userLocation={geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : null} />
      </div>

      {/* Small Station Preview Card - REMOVED (Moved to Map Popup) */}

      {selectedStation && isDetailsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-slate-600 bg-slate-800/95 text-white shadow-2xl ring-1 ring-white/10">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-8 py-6 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg ${
                  selectedStation.status === "RED" ? "border-red-500 bg-red-500/20 text-red-400" :
                  selectedStation.status === "YELLOW" ? "border-yellow-500 bg-yellow-500/20 text-yellow-400" :
                  "border-green-500 bg-green-500/20 text-green-400"
                }`}>
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{modalTitle}</h2>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      {selectedStation.status === "RED" ? "Yüksek Yoğunluk" : 
                       selectedStation.status === "YELLOW" ? "Orta Yoğunluk" : "Düşük Yoğunluk"}
                    </span>
                    <span>&#183;</span>
                    <span>{selectedStation.price.toFixed(2)} TL/kWh</span>
                    {reviewSummary && reviewSummary.reviewCount > 0 && (
                      <>
                        <span>&#183;</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          {reviewSummary.averageRating.toFixed(1)} ({reviewSummary.reviewCount})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                className="rounded-full bg-slate-800 p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                onClick={() => setIsDetailsOpen(false)}
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
                  <div className="space-y-6">
                    {[
                      { label: "Gece", range: "00:00 – 05:00", hours: [0,1,2,3,4,5], icon: "🌙", desc: "Yeşil enerji saatleri" },
                      { label: "Sabah", range: "06:00 – 11:00", hours: [6,7,8,9,10,11], icon: "🌅", desc: "Erken saatler" },
                      { label: "Öğlen", range: "12:00 – 17:00", hours: [12,13,14,15,16,17], icon: "☀️", desc: "Yoğun saatler" },
                      { label: "Akşam", range: "18:00 – 22:00", hours: [18,19,20,21,22], icon: "🌆", desc: "Akşam saatleri" },
                      { label: "Gece Geç", range: "23:00", hours: [23], icon: "🌙", desc: "Yeşil enerji başlangıcı" },
                    ].map((group) => {
                      const groupSlots = slots
                        .filter(s => group.hours.includes(s.hour))
                        .filter(s => filterMode === "ALL" || s.isGreen);
                      if (groupSlots.length === 0) return null;
                      const avgLoad = Math.round(groupSlots.reduce((sum, s) => sum + s.load, 0) / groupSlots.length);
                      const hasGreen = groupSlots.some(s => s.isGreen);
                      return (
                        <div key={group.label}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{group.icon}</span>
                              <div>
                                <h4 className="text-sm font-bold text-white">{group.label} <span className="text-text-tertiary font-normal">({group.range})</span></h4>
                                <p className="text-[10px] text-text-tertiary">{group.desc}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasGreen && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400 border border-green-500/20">
                                  <Leaf className="h-2.5 w-2.5" /> Eco
                                </span>
                              )}
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                avgLoad < 40 ? "bg-green-500/10 text-green-400" : avgLoad < 70 ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"
                              }`}>
                                ort. %{avgLoad}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {groupSlots.map((slot) => (
                              <button
                                key={slot.hour}
                                disabled={isBooking}
                                onClick={() => handleBooking(slot)}
                                className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                                  slot.isGreen
                                    ? "border-green-500/40 bg-gradient-to-b from-green-500/20 to-green-900/30 hover:border-green-400 hover:shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)]"
                                    : "border-white/5 bg-surface-1/50 hover:border-white/20 hover:bg-surface-2"
                                } ${filterMode === "ECO" && !slot.isGreen ? "opacity-50 grayscale" : ""}`}
                              >
                                {slot.isGreen && (
                                  <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                )}
                                
                                <div className="mb-2 flex items-center justify-between">
                                  <span className={`text-sm font-bold ${slot.isGreen ? "text-green-100" : "text-white"}`}>
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
                                    <span className="text-text-tertiary">Fiyat</span>
                                    <span className="font-medium text-text-secondary">{slot.price} ₺</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-text-tertiary">Kazanç</span>
                                    <span className={`font-bold ${slot.isGreen ? "text-yellow-400" : "text-text-tertiary"}`}>
                                      +{slot.coins}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: AI & Alternatives */}
              <div className="w-80 border-l border-slate-700 bg-slate-900/50 p-6 backdrop-blur-sm flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
                {/* AI Insight */}
                <div className="mb-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20 p-6 shadow-lg shadow-purple-900/10 shrink-0">
                  <div className="mb-4 flex items-center gap-2 text-purple-400">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                    <span className="text-sm font-bold tracking-wide uppercase">AI Smart Pick</span>
                  </div>
                  
                  {isLoadingRecs ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                      <p className="text-xs">AI analiz yapılıyor...</p>
                    </div>
                  ) : (selectedStation.load || 0) >= 70 ? (
                    // High Density Warning + AI Alternative
                    <div className="animate-in fade-in duration-300">
                      <div className="mb-4 flex items-start gap-3 text-orange-200 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                        <Megaphone className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                         <p className="text-sm font-bold text-orange-400">Bu istasyon şu an çok yoğun.</p>
                         <p className="text-xs mt-1 opacity-80">Bekleme süresi normalden uzun olabilir.</p>
                        </div>
                      </div>
                      
                      {aiRecommendation ? (
                        <>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">
                            AI skoruna göre size daha uygun olan istasyon:
                          </p>
                          <div
                            onClick={() => {
                              handleStationSelect(aiRecommendation.station);
                              setTimeout(() => setIsDetailsOpen(true), 50);
                            }}
                            className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-600 bg-slate-800/80 p-3 transition-all hover:border-green-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-green-900/20"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                            
                            <div className="relative flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-green-400 ring-1 ring-white/10 transition-colors group-hover:bg-green-500 group-hover:text-white">
                                <MapPin className="h-5 w-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-bold text-slate-200 group-hover:text-white text-sm leading-tight line-clamp-2">
                                    {aiRecommendation.station.name}
                                  </h4>
                                  <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-purple-500/20 px-2 py-1 text-[10px] font-bold text-purple-300 ring-1 ring-purple-500/40">
                                    {Math.round(aiRecommendation.scored.score)}
                                  </span>
                                </div>
                                
                                <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">
                                  {aiRecommendation.scored.explanation}
                                </p>
                              </div>
                              
                              <div className="self-center text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-green-400">
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          {/* Score breakdown for recommended station */}
                          {aiRecommendation.scored.components && (
                            <div className="mt-3 space-y-1.5">
                              {(() => {
                                const c = aiRecommendation.scored.components;
                                const items = [
                                  { key: "load", label: "Yoğunluk", value: c.load ?? c.Load ?? 0, icon: "🏭", goodHigh: true },
                                  { key: "green", label: "Yeşil Enerji", value: c.green ?? c.Green ?? 0, icon: "🌿", goodHigh: true },
                                  { key: "distance", label: "Yakınlık", value: c.distance ?? c.Distance ?? 0, icon: "📍", goodHigh: true },
                                  { key: "price", label: "Uygun Fiyat", value: c.price ?? c.Price ?? 0, icon: "💰", goodHigh: true },
                                ];
                                return items.map(({ key, label, value, icon }) => {
                                  const v = Math.round(value);
                                  const barColor = v >= 60 ? "bg-green-500/70" : v >= 30 ? "bg-yellow-500/70" : "bg-red-500/50";
                                  return (
                                    <div key={key} className="flex items-center gap-2">
                                      <span className="text-[10px] w-3">{icon}</span>
                                      <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">Şu an için daha iyi bir alternatif bulunamadı.</p>
                      )}
                    </div>
                  ) : currentStationScore ? (
                    // Station is in AI recommendations -- show its score + best green slot
                    <div className="animate-in fade-in duration-300">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400">AI Skoru</span>
                        <span className="text-lg font-bold text-purple-300">{Math.round(currentStationScore.score)}<span className="text-xs text-slate-500">/100</span></span>
                      </div>

                      <p className="mb-3 text-xs text-slate-400 leading-relaxed">
                        {currentStationScore.explanation}
                      </p>

                      {/* Score component breakdown */}
                      {currentStationScore.components && (
                        <div className="mb-4 space-y-1.5">
                          {(() => {
                            const c = currentStationScore.components;
                            const items = [
                              { key: "load", label: "Yoğunluk", value: c.load ?? c.Load ?? 0, icon: "🏭" },
                              { key: "green", label: "Yeşil Enerji", value: c.green ?? c.Green ?? 0, icon: "🌿" },
                              { key: "distance", label: "Yakınlık", value: c.distance ?? c.Distance ?? 0, icon: "📍" },
                              { key: "price", label: "Uygun Fiyat", value: c.price ?? c.Price ?? 0, icon: "💰" },
                            ];
                            return items.map(({ key, label, value, icon }) => {
                              const v = Math.round(value);
                              const barColor = v >= 60 ? "bg-green-500/70" : v >= 30 ? "bg-yellow-500/70" : "bg-red-500/50";
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-[10px] w-3">{icon}</span>
                                  <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {slots.find(s => s.isGreen) ? (
                        <>
                       <p className="mb-3 text-xs text-slate-300 leading-relaxed">
                            Saat <span className="text-green-400 font-bold">{slots.find(s => s.isGreen)?.label.split(" - ")[0]}</span> için Eco Slot rezervasyonu yaparsan <span className="text-yellow-400 font-bold">{slots.find(s => s.isGreen)?.coins} Coin</span> kazanabilirsin.
                          </p>
                          <button 
                            onClick={() => {
                              const s = slots.find(s => s.isGreen);
                              if(s) handleBooking(s);
                            }}
                            className="w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white transition hover:bg-purple-500 shadow-lg shadow-purple-600/20 active:scale-95"
                          >
                            Bu Saati Rezerve Et
                          </button>
                        </>
                      ) : null}

                      {/* Better alternative suggestion */}
                      {aiRecommendation && aiRecommendation.scored.score > currentStationScore.score + 5 && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide">Daha iyi alternatif</p>
                          <div
                            onClick={() => {
                              handleStationSelect(aiRecommendation.station);
                              setTimeout(() => setIsDetailsOpen(true), 50);
                            }}
                            className="group flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/60 p-2.5 transition-all hover:border-purple-500/40 hover:bg-slate-800"
                          >
                            <MapPin className="h-4 w-4 text-purple-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-200 truncate">{aiRecommendation.station.name}</p>
                              <p className="text-[10px] text-slate-500">Skor: {Math.round(aiRecommendation.scored.score)}</p>
                            </div>
                            <ArrowRight className="h-3 w-3 text-slate-600 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : aiRecommendation ? (
                    // Selected station not in top results -- suggest the best one
                    <div className="animate-in fade-in duration-300">
                      <p className="mb-3 text-xs text-slate-400 leading-relaxed">
                        AI analizine göre şu an en uygun istasyon:
                      </p>
                      <div
                        onClick={() => {
                          handleStationSelect(aiRecommendation.station);
                          setTimeout(() => setIsDetailsOpen(true), 50);
                        }}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-600 bg-slate-800/80 p-3 transition-all hover:border-purple-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-purple-900/20"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        
                        <div className="relative flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-purple-400 ring-1 ring-white/10 transition-colors group-hover:bg-purple-500 group-hover:text-white">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-200 group-hover:text-white text-sm truncate">{aiRecommendation.station.name}</h4>
                            <p className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">{aiRecommendation.scored.explanation}</p>
                          </div>
                          <div className="self-center text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-purple-400">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {aiRecommendation.scored.components && (
                        <div className="mt-3 space-y-1.5">
                          {(() => {
                            const c = aiRecommendation.scored.components;
                            const items = [
                              { key: "load", label: "Yoğunluk", value: c.load ?? c.Load ?? 0, icon: "🏭" },
                              { key: "green", label: "Yeşil Enerji", value: c.green ?? c.Green ?? 0, icon: "🌿" },
                              { key: "distance", label: "Yakınlık", value: c.distance ?? c.Distance ?? 0, icon: "📍" },
                              { key: "price", label: "Uygun Fiyat", value: c.price ?? c.Price ?? 0, icon: "💰" },
                            ];
                            return items.map(({ key, label, value, icon }) => {
                              const v = Math.round(value);
                              const barColor = v >= 60 ? "bg-green-500/70" : v >= 30 ? "bg-yellow-500/70" : "bg-red-500/50";
                              return (
                                <div key={key} className="flex items-center gap-2">
                                  <span className="text-[10px] w-3">{icon}</span>
                                  <span className="text-[10px] text-slate-400 w-20 shrink-0">{label}</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Şu an için özel bir öneri bulunmuyor.</p>
                  )}
                </div>

                {/* Station Reviews Section */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 shrink-0">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-bold">Değerlendirmeler</span>
                    </div>
                    {reviewSummary && reviewSummary.reviewCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-white">{reviewSummary.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-slate-500">({reviewSummary.reviewCount})</span>
                      </div>
                    )}
                  </div>

                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center py-4 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : stationReviews.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-3">Henüz değerlendirme yapılmamış.</p>
                  ) : (
                    <div className="space-y-3">
                      {stationReviews.map((review) => (
                        <div key={review.id} className="rounded-xl bg-slate-800/60 p-3 border border-slate-700/30">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-slate-300">{review.userName}</span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map((s) => (
                                <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`} />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-slate-400 leading-relaxed">{review.comment}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-1.5">
                            {new Date(review.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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