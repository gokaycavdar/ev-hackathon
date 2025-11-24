"use client";

import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, DollarSign, LineChart, Users } from "lucide-react";

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

  useEffect(() => {
    const ownerId =
      typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") ?? "1" : "1";

    const controller = new AbortController();

    const loadDashboard = async () => {
      try {
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

  return (
    <div className="min-h-full text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-purple-900/30 pointer-events-none" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3rem] text-purple-300"></p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Zorlu Enerji Kontrol Paneli</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Gelir akışınızı, yük dengesini ve yeşil slot performansınızı gerçek zamanlı izleyin. Hackathon zamanı,
                hızla aksiyon alın.
              </p>
            </div>
            <button
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-500"
              type="button"
            >
              + Kampanya Başlat
            </button>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-200">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p>Panonuz yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-6 py-12 text-center text-sm text-red-200">
              {error}
            </div>
          ) : data ? (
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
                    {data.stations.length} istasyon yönetiliyor
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
                      {data.stations.map((station) => {
                        const statusColor =
                          station.mockStatus === "GREEN"
                            ? "bg-green-500/15 text-green-300"
                            : station.mockStatus === "YELLOW"
                            ? "bg-yellow-500/15 text-yellow-300"
                            : "bg-red-500/15 text-red-300";

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
                                {station.mockStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}