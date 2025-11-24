"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, Coins, Leaf, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

type Badge = {
	id: number;
	name: string;
	description: string;
	icon: string;
};

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
	id: number;
	name: string;
	email: string;
	coins: number;
	co2Saved: number;
	xp: number;
	badges: Badge[];
	reservations: Reservation[];
};

export default function DriverWalletPage() {
	const [user, setUser] = useState<UserPayload | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const userId = typeof window !== "undefined" ? localStorage.getItem("ecocharge:userId") : null;
		if (!userId) {
			setError("Önce giriş yapmalısınız.");
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		const loadUser = async () => {
			try {
				const response = await fetch(`/api/users/${userId}`, { signal: controller.signal });
				if (!response.ok) throw new Error("Kullanıcı bilgisi alınamadı");
				const data = (await response.json()) as UserPayload;
				setUser(data);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Wallet fetch failed", err);
				setError("Kullanıcı bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.");
			} finally {
				setIsLoading(false);
			}
		};

		loadUser();
		return () => controller.abort();
	}, []);

	const totalGreenSessions = useMemo(() => {
		if (!user) return 0;
		return user.reservations.filter((reservation) => reservation.isGreen).length;
	}, [user]);

	const latestReservations = useMemo(() => {
		if (!user) return [];
		return user.reservations.slice(0, 4);
	}, [user]);

	return (
		<main className="min-h-screen bg-slate-800 text-white">
			<div className="relative">
				<div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-emerald-900/30" />
				<div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
					<header className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<p className="text-xs uppercase tracking-widest text-green-400">Rozetler ve Kazançlarım </p>
							<h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Cüzdan</h1>
							<p className="mt-2 max-w-2xl text-sm text-slate-200">
								Yeşil slotlardan topladığın coinler ve karbon tasarrufların burada. Devam ettikçe yeni rozetler kazan!
							</p>
						</div>
						<Link
							href="/driver"
							className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500/50 hover:text-white"
						>
							<ArrowLeft className="h-4 w-4" /> Haritaya Dön
						</Link>
					</header>

					{isLoading ? (
						<div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-300">
							<Loader2 className="h-6 w-6 animate-spin" />
							<p>Verilerin yükleniyor...</p>
						</div>
					) : error ? (
						<div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-sm text-red-200">
							{error}
						</div>
					) : user ? (
						<section className="space-y-10">
							<div className="grid gap-6 md:grid-cols-3">
								<div className="rounded-3xl border border-slate-600 bg-slate-700/60 p-6 shadow-lg">
									<div className="flex items-center justify-between text-xs text-slate-300">
										<span>Toplam Coin</span>
										<Coins className="h-4 w-4 text-yellow-400" />
									</div>
									<p className="mt-4 text-4xl font-semibold text-yellow-300">{user.coins.toLocaleString()}</p>
									<p className="mt-2 text-xs text-slate-300">Yeşil slotlardan maksimum katma değer.</p>
								</div>

								<div className="rounded-3xl border border-slate-600 bg-slate-700/60 p-6 shadow-lg">
									<div className="flex items-center justify-between text-xs text-slate-300">
										<span>CO₂ Tasarrufu</span>
										<Leaf className="h-4 w-4 text-green-400" />
									</div>
									<p className="mt-4 text-4xl font-semibold text-green-300">{user.co2Saved.toFixed(1)} kg</p>
									<p className="mt-2 text-xs text-slate-300 flex items-center gap-1">
										<Sparkles className="h-3 w-3 text-green-300" /> {totalGreenSessions} yeşil slot rezervasyonu
									</p>
								</div>

								<div className="rounded-3xl border border-slate-600 bg-slate-700/60 p-6 shadow-lg">
									<div className="flex items-center justify-between text-xs text-slate-300">
										<span>XP Seviyesi</span>
										<Award className="h-4 w-4 text-blue-300" />
									</div>
									<p className="mt-4 text-4xl font-semibold text-blue-300">{user.xp.toLocaleString()}</p>
									<p className="mt-2 text-xs text-slate-300">Aktif görevler ve enerji tasarruflarıyla yükseliyor.</p>
								</div>
							</div>

							<div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
								<div className="rounded-3xl border border-slate-600 bg-slate-700/60 p-6 shadow-lg">
									<div className="flex items-center justify-between">
										<h2 className="text-lg font-semibold text-white">Rozet Koleksiyonu</h2>
										<span className="rounded-full bg-slate-600 px-3 py-1 text-xs text-slate-200">
											{user.badges.length} rozet
										</span>
									</div>
									{user.badges.length === 0 ? (
										<p className="mt-6 text-sm text-slate-300">Henüz rozet kazanmadın. Yeşil slotları deneyerek başlayabilirsin.</p>
									) : (
										<div className="mt-6 grid gap-4 sm:grid-cols-2">
											{user.badges.map((badge) => (
												<div
													key={badge.id}
													className="flex flex-col gap-2 rounded-2xl border border-slate-600 bg-slate-700/80 p-4 text-sm text-slate-200"
												>
													<span className="text-2xl">{badge.icon}</span>
													<p className="font-semibold text-white">{badge.name}</p>
													<p className="text-xs text-slate-300">{badge.description}</p>
												</div>
											))}
										</div>
									)}
								</div>

								<div className="rounded-3xl border border-slate-600 bg-slate-700/60 p-6 shadow-lg">
									<h2 className="text-lg font-semibold text-white">Son Rezervasyonlar</h2>
									{latestReservations.length === 0 ? (
										<p className="mt-4 text-sm text-slate-300">Henüz kayıtlı rezervasyonun bulunmuyor.</p>
									) : (
										<div className="mt-5 space-y-4">
											{latestReservations.map((reservation) => (
												<div
													key={reservation.id}
													className="flex items-center justify-between rounded-2xl border border-slate-600 bg-slate-700/70 px-4 py-3 text-xs"
												>
													<div>
														<p className="font-semibold text-slate-200">{reservation.station.name}</p>
														<p className="mt-1 text-slate-300">
															{new Date(reservation.date).toLocaleDateString("tr-TR", {
																day: "2-digit",
																month: "short",
															})}
															, {reservation.hour}
														</p>
													</div>
													<div className="text-right">
														<p className={`font-semibold ${reservation.isGreen ? "text-green-300" : "text-slate-300"}`}>
															+{reservation.earnedCoins} coin
														</p>
														<p className="mt-1 text-slate-400">{reservation.isGreen ? "Eco Slot" : "Standart"}</p>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</section>
					) : null}
				</div>
			</div>
		</main>
	);
}
