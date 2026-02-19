"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  DollarSign,
  LineChart,
  Users,
  TrendingUp,
  Zap,
  Leaf,
  AlertCircle,
} from "lucide-react";
import { authFetch, unwrapResponse, getStoredUserId } from "@/lib/auth";

type StationSummary = {
  id: number;
  name: string;
  price: number;
  load: number;
  status: "GREEN" | "YELLOW" | "RED";
  reservationCount: number;
  greenReservationCount: number;
  revenue: number;
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

export default function OperatorDashboardPage() {
  const [data, setData] = useState<OperatorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Operator");

  useEffect(() => {
    const ownerId = getStoredUserId() ?? "1";

    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        // Fetch User Info for Company Name
        const userRes = await authFetch(`/api/users/${ownerId}`, { signal: controller.signal });
        if (userRes.ok) {
          const userInfo = await unwrapResponse<{ name?: string }>(userRes);
          setCompanyName(userInfo.name || "Operator");
        }

        const response = await authFetch("/api/company/my-stations", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("İstasyon verisi alınamadı");
        const payload = await unwrapResponse<OperatorResponse>(response);
        setData(payload);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Operator dashboard load failed", err);
        setError("Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
    return () => controller.abort();
  }, []);

  const totalGreenCharges = useMemo(() => {
    if (!data) return 0;
    return data.stations.reduce((sum, station) => sum + station.greenReservationCount, 0);
  }, [data]);

  const uniqueCustomers = useMemo(() => {
    if (!data) return 0;
    return Math.max(Math.round(data.stats.totalReservations * 0.65), data.stats.totalReservations);
  }, [data]);

  const cards = useMemo(() => {
    if (!data)
      return [
        { title: "Toplam Gelir", value: "—", icon: DollarSign, accent: "text-green-400" },
        { title: "Aktif Yük", value: "—", icon: BatteryCharging, accent: "text-blue-400" },
        { title: "Yeşil Şarjlar", value: "—", icon: LineChart, accent: "text-emerald-400" },
        { title: "Müşteri Sayısı", value: "—", icon: Users, accent: "text-purple-400" },
      ];

    return [
      {
        title: "Toplam Gelir",
        value: `₺${data.stats.totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`,
        icon: DollarSign,
        accent: "text-green-400",
      },
      {
        title: "Aktif Yük",
        value: `%${data.stats.avgLoad}`,
        icon: BatteryCharging,
        accent: "text-blue-300",
      },
      {
        title: "Yeşil Şarjlar",
        value: totalGreenCharges.toString(),
        icon: LineChart,
        accent: "text-emerald-300",
      },
      {
        title: "Müşteri Sayısı",
        value: uniqueCustomers.toString(),
        icon: Users,
        accent: "text-purple-300",
      },
    ];
  }, [data, totalGreenCharges, uniqueCustomers]);

  const topStations = useMemo(() => {
    if (!data) return [];
    return [...data.stations].sort((a, b) => (b.load || 0) - (a.load || 0)).slice(0, 5);
  }, [data]);

  const bottomStations = useMemo(() => {
    if (!data) return [];
    return [...data.stations].sort((a, b) => (a.load || 0) - (b.load || 0)).slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-secondary">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        <p>Panonuz yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-12 text-center text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-full text-primary">
      <div className="relative">
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-accent-primary font-bold">Yönetim Paneli</p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl text-white font-display">{companyName} Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                Gelir akışınızı, yük dengesini ve yeşil slot performansınızı gerçek zamanlı izleyin.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/operator/stations"
                className="rounded-xl border border-white/10 bg-surface-1 px-5 py-3 text-sm font-semibold text-white transition hover:bg-surface-2"
              >
                İstasyonları Yönet
              </Link>
              <Link
                href="/operator/campaigns"
                className="rounded-xl bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-hover"
              >
                + Kampanya Başlat
              </Link>
            </div>
          </header>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="glass-card rounded-3xl p-6 transition hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
                    <span>{card.title}</span>
                    <card.icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                  <p className="mt-5 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-2 text-xs text-text-tertiary">Son 24 saatlik performans</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2">
              {topStations.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-surface-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      En İyi 5 İstasyon
                    </h2>
                    <span className="text-xs font-medium text-text-tertiary">Yük Oranına Göre</span>
                  </div>
                  <div className="space-y-4">
                    {topStations.map((station, index) => (
                      <div
                        key={station.id}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-2/30 p-4 transition hover:bg-surface-2 hover:border-white/10"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                          index === 1 ? "bg-slate-500/20 text-slate-300" :
                          index === 2 ? "bg-orange-500/20 text-orange-400" :
                          "bg-surface-3 text-text-tertiary"
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white truncate">{station.name}</p>
                            <span className="text-xs font-bold text-green-400">%{station.load}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${station.load}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-text-tertiary">
                            <span className="flex items-center gap-1">
                              <Leaf className="h-3 w-3 text-green-500" /> {station.greenReservationCount} Yeşil Şarj
                            </span>
                            <span>•</span>
                            <span>#{station.id}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bottomStations.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-surface-1 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      Geliştirilmesi Gerekenler
                    </h2>
                    <span className="text-xs font-medium text-text-tertiary">Düşük Kullanım</span>
                  </div>
                  <div className="space-y-4">
                    {bottomStations.map((station, index) => (
                      <div
                        key={station.id}
                        className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-surface-2/30 p-4 transition hover:bg-surface-2 hover:border-white/10"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-text-tertiary">
                          {data!.stations.length - 4 + index}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white truncate">{station.name}</p>
                            <span className="text-xs font-bold text-red-400">%{station.load}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.max(station.load, 5)}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                              <span className="flex items-center gap-1">
                                <Leaf className="h-3 w-3 text-text-tertiary" /> {station.greenReservationCount} Yeşil Şarj
                              </span>
                            </div>
                            <Link href="/operator/campaigns" className="text-[10px] font-bold text-accent-primary hover:underline">
                              Kampanya Oluştur
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}