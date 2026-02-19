"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, X, MapPin, ArrowRight, Sparkles, Clock, BatteryCharging, Coins, ExternalLink, TrendingDown, Gift, Award } from "lucide-react";
import { authFetch, unwrapResponse, getStoredUserId, getToken } from "@/lib/auth";

// Tab 1: Şu An En Müsait (Forecast bazlı)
type ForecastRecommendation = {
  stationId: number;
  stationName: string;
  lat: number;
  lng: number;
  price: number;
  address: string | null;
  predictedLoad: number;
  slot: string;
  coins: number;
};

// Tab 2: Sana Özel (Badge bazlı kampanyalar)
type PersonalizedCampaign = {
  id: number;
  title: string;
  description: string;
  discount: string;
  coinReward: number;
  endDate: string | null;
  matchedBadges: { id: number; name: string; icon: string }[];
  station: { id: number; name: string; lat: number; lng: number } | null;
};

type Badge = {
  id: number;
  name: string;
  icon: string;
  description: string;
};

export default function GlobalAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecast" | "personalized">("forecast");

  // Tab 1 state
  const [forecastRecs, setForecastRecs] = useState<ForecastRecommendation[]>([]);
  const [currentTime, setCurrentTime] = useState<{ dayOfWeek: number; hour: number } | null>(null);

  // Tab 2 state
  const [campaigns, setCampaigns] = useState<PersonalizedCampaign[]>([]);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  // Gün isimlerini Türkçe olarak
  const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

  useEffect(() => {
    const initUser = async () => {
      // If JWT token exists, use stored userId
      const token = getToken();
      const storedId = getStoredUserId();
      if (token && storedId) {
        setUserId(Number.parseInt(storedId, 10));
        return;
      }

      // Fallback: demo user when no JWT
      try {
        const res = await fetch("/api/demo-user");
        if (res.ok) {
          const data = await unwrapResponse<{ id: number }>(res);
          setUserId(data.id);
        }
      } catch (e) {
        console.error("Failed to sync demo user", e);
      }
    };
    initUser();
  }, []);

  // Modal açıldığında verileri yükle
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setSuccessMsg(null);

      // Her iki tab için verileri paralel yükle
      Promise.all([
        // Tab 1: Forecast verileri
        authFetch("/api/stations/forecast").then(res => res.json()),
        // Tab 2: Personalized kampanyalar
        authFetch("/api/campaigns/for-user").then(res => res.json()).catch(() => ({ success: false }))
      ])
        .then(([forecastData, campaignData]) => {
          // Tab 1: En düşük yoğunluklu 3 istasyonu al
          if (forecastData.success && forecastData.data?.forecasts) {
            setCurrentTime(forecastData.data.currentTime);
            const topRecs = forecastData.data.forecasts.slice(0, 3).map((f: any, idx: number) => ({
              stationId: f.stationId,
              stationName: f.stationName,
              lat: f.lat,
              lng: f.lng,
              price: f.price,
              address: f.address,
              predictedLoad: f.predictedLoad,
              slot: `${f.hour.toString().padStart(2, "0")}:00 - ${((f.hour + 1) % 24).toString().padStart(2, "0")}:00`,
              coins: f.predictedLoad < 30 ? 50 : f.predictedLoad < 50 ? 35 : 20,
            }));
            setForecastRecs(topRecs);
          }

          // Tab 2: Kampanyalar (double-wrapped: data.campaigns)
          if (campaignData.success && campaignData.data) {
            setCampaigns(campaignData.data.campaigns || []);
            setUserBadges(campaignData.data.userBadges || []);
          }

          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch data", err);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const handleInspect = (stationId: number) => {
    setIsOpen(false);
    router.push(`/driver?stationId=${stationId}`);
  };

  const handleBook = async (stationId: number, slot: string) => {
    setBookingId(stationId);

    try {
      const res = await authFetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          stationId,
          date: new Date().toISOString(),
          hour: slot.split(" - ")[0],
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
        alert("Rezervasyon başarısız: " + (data.error?.message || "Hata"));
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
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-110 hover:shadow-purple-600/50 active:scale-95"
        title="Akıllı Şarj Önerileri"
      >
        <Zap className="h-7 w-7 fill-white" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-600 bg-slate-800 shadow-2xl ring-1 ring-white/10">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-8 py-6 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">Akıllı Şarj Önerileri</h2>
                  <p className="text-sm text-slate-400">
                    {currentTime && `${dayNames[currentTime.dayOfWeek]} ${currentTime.hour.toString().padStart(2, "0")}:00 için tahminler`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full bg-slate-700 p-2 text-slate-400 transition hover:bg-slate-600 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900/50">
              <button
                onClick={() => setActiveTab("forecast")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-all ${activeTab === "forecast"
                    ? "bg-slate-800 text-white border-b-2 border-purple-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
              >
                <TrendingDown className="h-4 w-4" />
                Şu An En Müsait
              </button>
              <button
                onClick={() => setActiveTab("personalized")}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold transition-all ${activeTab === "personalized"
                    ? "bg-slate-800 text-white border-b-2 border-purple-500"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
              >
                <Gift className="h-4 w-4" />
                Sana Özel
                {campaigns.length > 0 && (
                  <span className="ml-1 rounded-full bg-purple-500 px-2 py-0.5 text-xs text-white">
                    {campaigns.length}
                  </span>
                )}
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
              ) : activeTab === "forecast" ? (
                /* TAB 1: Şu An En Müsait - Forecast Bazlı */
                <div>
                  <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">Linear Regression ile tahmin edilen en düşük yoğunluklu istasyonlar</span>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
                    {forecastRecs.map((rec, idx) => (
                      <div
                        key={rec.stationId}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-green-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-green-900/20"
                      >
                        {/* Background Gradient */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5 opacity-0 transition group-hover:opacity-100" />

                        {/* Rank Badge */}
                        <div className="absolute -top-1 -left-1 flex h-8 w-8 items-center justify-center rounded-br-xl bg-green-500 text-sm font-bold text-white">
                          #{idx + 1}
                        </div>

                        <div className="relative z-10 pt-4">
                          {/* Badges */}
                          <div className="mb-4 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${rec.predictedLoad < 30 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                rec.predictedLoad < 50 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                  "bg-orange-500/10 text-orange-400 border-orange-500/20"
                              }`}>
                              %{rec.predictedLoad} Tahmin
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
                              <Sparkles className="h-3 w-3" /> AI Öneri
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white mb-1">{rec.stationName}</h3>
                          <p className="text-sm text-slate-400 mb-4">
                            Şu an için en düşük yoğunluk #{idx + 1}
                          </p>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                                <Clock className="h-4 w-4" />
                              </div>
                              <span className="font-medium">{rec.slot}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-300">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                                <Coins className="h-4 w-4" />
                              </div>
                              <span>{rec.price.toFixed(2)} ₺/kWh</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto relative z-10">
                          <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-900/50 px-4 py-3 border border-slate-700/50">
                            <span className="text-xs font-medium text-slate-400">Eco Kazanç</span>
                            <span className="font-bold text-yellow-400">+{rec.coins} Coin</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleInspect(rec.stationId)}
                              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-700 text-white transition hover:bg-slate-600 active:scale-95"
                              title="Haritada Gör"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleBook(rec.stationId, rec.slot)}
                              disabled={bookingId !== null}
                              className={`group/btn flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition active:scale-95 ${bookingId === rec.stationId
                                  ? "bg-slate-700 text-slate-400 cursor-wait"
                                  : "bg-green-500 text-white hover:bg-green-400"
                                }`}
                            >
                              {bookingId === rec.stationId ? (
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
                </div>
              ) : (
                /* TAB 2: Sana Özel - Badge Bazlı Kampanyalar */
                <div>
                  {/* User Badges */}
                  {userBadges.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-400 text-sm mb-3">
                        <Award className="h-4 w-4" />
                        <span className="font-medium">Rozetlerin</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userBadges.map((badge) => (
                          <span key={badge.id} className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-3 py-1.5 text-sm">
                            <span>{badge.icon}</span>
                            <span className="text-white">{badge.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {campaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 text-slate-400">
                        <Gift className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Henüz sana özel kampanya yok</h3>
                      <p className="text-slate-400 max-w-md">
                        Daha fazla rozet kazan ve sana özel kampanyaları aç!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-3">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/50 p-6 transition-all hover:border-purple-500/50 hover:bg-slate-800 hover:shadow-xl hover:shadow-purple-900/20"
                        >
                          {/* Background Gradient */}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 transition group-hover:opacity-100" />

                          <div className="relative z-10">
                            {/* Matched Badges */}
                            <div className="mb-4 flex flex-wrap gap-2">
                              {campaign.matchedBadges.map((badge) => (
                                <span key={badge.id} className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-400 border border-purple-500/20">
                                  <span>{badge.icon}</span> {badge.name}
                                </span>
                              ))}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1">{campaign.title}</h3>
                            <p className="text-sm text-slate-400 mb-4">{campaign.description}</p>

                            <div className="space-y-3 mb-6">
                              <div className="flex items-center gap-3 text-sm text-slate-300">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400">
                                  <Gift className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-yellow-400">{campaign.discount}</span>
                              </div>
                              {campaign.endDate && (
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
                                    <Clock className="h-4 w-4" />
                                  </div>
                                  <span>Son: {new Date(campaign.endDate).toLocaleDateString("tr-TR")}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-auto relative z-10">
                            <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-900/50 px-4 py-3 border border-slate-700/50">
                              <span className="text-xs font-medium text-slate-400">Ekstra Kazanç</span>
                              <span className="font-bold text-yellow-400">+{campaign.coinReward} Coin</span>
                            </div>

                            {campaign.station ? (
                              <button
                                onClick={() => handleInspect(campaign.station!.id)}
                                className="group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3.5 text-sm font-bold text-white transition hover:bg-purple-400 active:scale-95"
                              >
                                İstasyona Git
                                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                              </button>
                            ) : (
                              <div className="text-center text-sm text-slate-400 py-2">
                                Tüm istasyonlarda geçerli
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
