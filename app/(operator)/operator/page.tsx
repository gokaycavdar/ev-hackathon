"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BatteryCharging,
  DollarSign,
  LineChart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import {
  generateDailyRevenue,
  generateMonthlyRevenue,
  generateCO2Savings,
  generateLoadCurve,
  generateMonthlyRevenueTrend,
  generateAIInsights,
} from "@/lib/utils-operator-ai";

type StationSummary = {
  id: number;
  name: string;
  price: number;
  mockLoad: number;
  mockStatus: "GREEN" | "YELLOW" | "RED";
  reservationCount: number;
  greenReservationCount: number;
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

  // Mock Analytics State
  const [dailyRevenue] = useState(generateDailyRevenue());
  const [monthlyRevenue] = useState(generateMonthlyRevenue());
  const [co2Savings] = useState(generateCO2Savings());
  const [loadCurve] = useState(generateLoadCurve());
  const [revenueTrend] = useState(generateMonthlyRevenueTrend());
  const [aiInsights] = useState(generateAIInsights());

  useEffect(() => {
    const ownerId =
      typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") ?? "1" : "1";

    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
        // Fetch User Info for Company Name
        const userRes = await fetch(`/api/users/${ownerId}`, { signal: controller.signal });
        if (userRes.ok) {
          const userData = await userRes.json();
          setCompanyName(userData.name || "Operator");
        }

        const response = await fetch(`/api/company/my-stations?ownerId=${ownerId}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("İstasyon verisi alınamadı");
        const payload = (await response.json()) as OperatorResponse;
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
    return [...data.stations].sort((a, b) => (b.mockLoad || 0) - (a.mockLoad || 0)).slice(0, 5);
  }, [data]);

  const bottomStations = useMemo(() => {
    if (!data) return [];
    return [...data.stations].sort((a, b) => (a.mockLoad || 0) - (b.mockLoad || 0)).slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-200">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
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
    <div className="min-h-full text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-purple-900/30 pointer-events-none" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-purple-300"></p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{companyName} Kontrol Paneli</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Gelir akışınızı, yük dengesini ve yeşil slot performansınızı gerçek zamanlı izleyin. Hackathon zamanı,
                hızla aksiyon alın.
              </p>
            </div>
            <Link
              href="/operator/campaigns"
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-500"
            >
              + Kampanya Başlat
            </Link>
          </header>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-slate-600 bg-slate-700/70 p-6 shadow-lg transition hover:border-purple-400/40"
                >
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span>{card.title}</span>
                    <card.icon className={`h-5 w-5 ${card.accent}`} />
                  </div>
                  <p className="mt-5 text-3xl font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-xs text-slate-200">Son 24 saatlik performans</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-600 bg-slate-700/70 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-600 px-6 py-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">İstasyon Durumları</h2>
                  <p className="text-xs text-slate-200">Green slot oranı ve yük yoğunluğu simulasyona dayalıdır.</p>
                </div>
                <span className="rounded-full bg-slate-600 px-4 py-1 text-xs text-slate-200">
                  {data?.stations.length || 0} istasyon yönetiliyor
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm text-slate-200">
                  <thead className="bg-slate-700/60 text-xs uppercase tracking-widest text-slate-200">
                    <tr>
                      <th className="px-6 py-4">İstasyon</th>
                      <th className="px-6 py-4">Yük</th>
                      <th className="px-6 py-4">Fiyat</th>
                      <th className="px-6 py-4">Rezervasyon</th>
                      <th className="px-6 py-4">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600/80">
                    {data?.stations.map((station) => {
                      const statusColor =
                        station.mockStatus === "GREEN"
                          ? "bg-green-500/15 text-green-300"
                          : station.mockStatus === "YELLOW"
                          ? "bg-yellow-500/15 text-yellow-300"
                          : "bg-red-500/15 text-red-300";
                      
                      const statusText = 
                        station.mockStatus === "GREEN" ? "Düşük Yoğunluk" :
                        station.mockStatus === "YELLOW" ? "Orta Yoğunluk" : "Yüksek Yoğunluk";

                      return (
                        <tr key={station.id} className="hover:bg-slate-600/60">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{station.name}</div>
                            <div className="text-xs text-slate-200">#{station.id.toString().padStart(3, "0")}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-28 rounded-full bg-slate-600">
                                <div
                                  className={`h-full rounded-full ${
                                    station.mockStatus === "RED"
                                      ? "bg-red-500"
                                      : station.mockStatus === "YELLOW"
                                      ? "bg-yellow-400"
                                      : "bg-green-400"
                                  }`}
                                  style={{ width: `${station.mockLoad}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-200">%{station.mockLoad}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono">{station.price.toFixed(2)} ₺</td>
                          <td className="px-6 py-4 text-xs text-slate-200">
                            {station.greenReservationCount} yeşil / {station.reservationCount} toplam
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics Section - Mocked Data */}
            <div className="rounded-3xl border border-slate-600 bg-slate-700/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white">Analiz ve Öngörüler</h2>
              <p className="mt-2 text-sm text-slate-200">
                Sistem tarafından sağlanan otomatik analizler ve öngörülerdir.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-800 p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Günlük Gelir</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        ₺{dailyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${dailyRevenue.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {dailyRevenue.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <ArrowUpRight className="h-4 w-4" />
                        %{dailyRevenue.percentageChange.toFixed(2)}
                      </span>
                    ) : dailyRevenue.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(dailyRevenue.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Aylık Gelir</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        ₺{monthlyRevenue.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${monthlyRevenue.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {monthlyRevenue.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <ArrowUpRight className="h-4 w-4" />
                        %{monthlyRevenue.percentageChange.toFixed(2)}
                      </span>
                    ) : monthlyRevenue.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(monthlyRevenue.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">CO2 Tasarrufu</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        {co2Savings.total.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} kg
                      </p>
                    </div>
                    <Leaf className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${co2Savings.percentageChange}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {co2Savings.percentageChange > 0 ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ArrowUpRight className="h-4 w-4" />
                        %{co2Savings.percentageChange.toFixed(2)}
                      </span>
                    ) : co2Savings.percentageChange < 0 ? (
                      <span className="flex items-center gap-1 text-red-400">
                        <ArrowDownRight className="h-4 w-4" />
                        %{Math.abs(co2Savings.percentageChange).toFixed(2)}
                      </span>
                    ) : (
                      "Değişim yok"
                    )}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Yük Eğrisi</p>
                      <p className="mt-1 text-lg font-bold text-white">
                        %{Math.round((loadCurve.reduce((a, b) => a + b.load, 0) / loadCurve.length) || 0)}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-yellow-500"
                      style={{ width: `${Math.abs(loadCurve[loadCurve.length - 1].load)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {loadCurve[loadCurve.length - 1].load > 50 ? (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <ArrowUpRight className="h-4 w-4" />
                        Yüksek Yoğunluk
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-400">
                        <ArrowDownRight className="h-4 w-4" />
                        Normal Seviye
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-2xl bg-slate-800 p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">AI Destekli İçgörüler</h3>
                  <Lightbulb className="h-8 w-8 text-yellow-300" />
                </div>
                <p className="mt-2 text-sm text-slate-200">
                  Sistem tarafından otomatik olarak oluşturulan içgörülerdir.
                </p>
                <div className="mt-4 space-y-4">
                  {aiInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-2xl bg-slate-700 p-4 shadow-md transition hover:bg-slate-600 border border-slate-600/50"
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-orange-400 shrink-0 mt-0.5" />}
                        {insight.type === 'success' && <TrendingUp className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />}
                        {insight.type === 'info' && <Zap className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />}
                        
                        <div className="flex-1">
                          <p className="text-sm text-slate-200 leading-snug mb-2">{insight.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-purple-300">{insight.impact}</span>
                            <button className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white transition">
                              {insight.action} &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-10">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {topStations.length > 0 && (
                <div className="rounded-3xl border border-slate-600 bg-slate-700/70 p-6 shadow-lg">
                  <h2 className="mb-4 text-lg font-semibold text-white">En İyi 5 İstasyon</h2>
                  <div className="flex flex-col gap-4">
                    {topStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center justify-between rounded-lg bg-slate-800 p-4 transition hover:bg-slate-700"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{station.name}</p>
                          <p className="text-xs text-slate-400">
                            #{station.id.toString().padStart(3, "0")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-2.5 w-2.5 rounded-full bg-green-500" />
                          <span className="text-xs text-slate-200">
                            %{station.mockLoad} (Yeşil: {station.greenReservationCount})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bottomStations.length > 0 && (
                <div className="rounded-3xl border border-slate-600 bg-slate-700/70 p-6 shadow-lg">
                  <h2 className="mb-4 text-lg font-semibold text-white">En Kötü 5 İstasyon</h2>
                  <div className="flex flex-col gap-4">
                    {bottomStations.map((station) => (
                      <div
                        key={station.id}
                        className="flex items-center justify-between rounded-lg bg-slate-800 p-4 transition hover:bg-slate-700"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{station.name}</p>
                          <p className="text-xs text-slate-400">
                            #{station.id.toString().padStart(3, "0")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-2.5 w-2.5 rounded-full bg-red-500" />
                          <span className="text-xs text-slate-200">
                            %{station.mockLoad} (Yeşil: {station.greenReservationCount})
                          </span>
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