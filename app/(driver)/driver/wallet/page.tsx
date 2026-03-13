"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, Coins, Leaf, Loader2, Sparkles, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { authFetch, unwrapResponse, getStoredUserId } from "@/lib/auth";
import { useGeolocation } from "@/lib/useGeolocation";

type Badge = {
	id: number;
	name: string;
	description: string;
	icon: string;
};

type BadgeProgress = {
	id: number;
	name: string;
	description: string;
	icon: string;
	metric: string;
	threshold: number;
	currentCount: number;
	earned: boolean;
	earnedAt: string | null;
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

type LeaderboardEntry = {
	id: number;
	name: string;
	xp: number;
};

type ScoredStation = {
	stationId?: number;
	StationID?: number;
	score?: number;
	Score?: number;
	components?: Record<string, number | undefined>;
	Components?: Record<string, number | undefined>;
	explanation?: string;
	Explanation?: string;
};

export default function DriverWalletPage() {
	const [user, setUser] = useState<UserPayload | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"overview" | "badges" | "leaderboard" | "recommendations">("overview");
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
	const [recommendations, setRecommendations] = useState<ScoredStation[]>([]);
	const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
	const [recommendationStations, setRecommendationStations] = useState<Record<number, { name: string; lat: number; lng: number; price: number; address?: string }>>({});
	const [badgeProgress, setBadgeProgress] = useState<BadgeProgress[]>([]);
	const [isLoadingBadges, setIsLoadingBadges] = useState(false);
	const geo = useGeolocation();

	useEffect(() => {
		const userId = getStoredUserId();
		if (!userId) {
			setError("Önce giriş yapmalısınız.");
			setIsLoading(false);
			return;
		}

		const controller = new AbortController();
		const loadUser = async () => {
			try {
				const response = await authFetch(`/api/users/${userId}`, { signal: controller.signal });
				const data = await unwrapResponse<UserPayload>(response);
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

	// Fetch leaderboard when tab switches to leaderboard
	useEffect(() => {
		if (activeTab !== "leaderboard" || leaderboard.length > 0) return;
		const controller = new AbortController();
		const loadLeaderboard = async () => {
			setIsLoadingLeaderboard(true);
			try {
				const response = await authFetch("/api/users/leaderboard?limit=10", { signal: controller.signal });
				const entries = await unwrapResponse<LeaderboardEntry[]>(response);
				setLeaderboard(entries);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Leaderboard fetch failed", err);
			} finally {
				setIsLoadingLeaderboard(false);
			}
		};
		loadLeaderboard();
		return () => controller.abort();
	}, [activeTab, leaderboard.length]);

	// Fetch badge progress when tab switches to badges
	useEffect(() => {
		if (activeTab !== "badges" || badgeProgress.length > 0) return;
		const controller = new AbortController();
		const loadBadges = async () => {
			setIsLoadingBadges(true);
			try {
				const response = await authFetch("/api/badges/progress", { signal: controller.signal });
				const data = await unwrapResponse<BadgeProgress[]>(response);
				setBadgeProgress(data);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Badge progress fetch failed", err);
			} finally {
				setIsLoadingBadges(false);
			}
		};
		loadBadges();
		return () => controller.abort();
	}, [activeTab, badgeProgress.length]);

	// Fetch recommendations when tab switches to recommendations
	useEffect(() => {
		if (activeTab !== "recommendations") return;
		const controller = new AbortController();
		const loadRecommendations = async () => {
			setIsLoadingRecommendations(true);
			try {
				console.log("Fetching recommendations...");
				
				// First fetch station details
				const stationsRes = await authFetch("/api/stations", { signal: controller.signal });
				const stationsData = await unwrapResponse<{ id: number; name: string; lat: number; lng: number; price: number; address?: string }[]>(stationsRes);
				console.log("Stations response:", stationsData);
				
				const stationMap: Record<number, { name: string; lat: number; lng: number; price: number; address?: string }> = {};
				stationsData.forEach((s) => { stationMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng, price: s.price, address: s.address }; });
				setRecommendationStations(stationMap);
				
				// Then fetch recommendations
				const response = await authFetch(`/api/stations/recommend?limit=10${geo.lat != null && geo.lng != null ? `&lat=${geo.lat}&lng=${geo.lng}` : ""}`, { signal: controller.signal });
				const data = await unwrapResponse<{ algorithm: string; results: ScoredStation[] }>(response);
				console.log("Recommendations response:", data);
				setRecommendations(data.results || []);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error("Recommendations fetch failed", err);
			} finally {
				setIsLoadingRecommendations(false);
			}
		};
		loadRecommendations();
		return () => controller.abort();
	}, [activeTab]);

	// Compute user's rank in leaderboard
	const userRank = useMemo(() => {
		if (!user || leaderboard.length === 0) return null;
		const index = leaderboard.findIndex((entry) => entry.id === user.id);
		return index >= 0 ? index + 1 : null;
	}, [user, leaderboard]);

	const totalGreenSessions = useMemo(() => {
		if (!user) return 0;
		return user.reservations.filter((reservation) => reservation.isGreen).length;
	}, [user]);

	const latestReservations = useMemo(() => {
		if (!user) return [];
		return user.reservations.slice(0, 4);
	}, [user]);

	return (
		<main className="min-h-screen bg-primary-bg text-primary font-sans">
			<div className="relative">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-primary/10 via-primary-bg to-primary-bg" />
				<div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
					
					{/* Header */}
					<header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-8">
						<div>
							<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-primary">
								<Sparkles className="h-4 w-4" />
								<span>Gamification Hub</span>
							</div>
							<h1 className="mt-2 text-4xl font-bold text-white tracking-tight font-display">Sürücü Cüzdanı</h1>
							<p className="mt-2 max-w-2xl text-text-secondary">
								Yeşil şarj ile kazandığın coinler, rozetler ve liderlik durumu.
							</p>
						</div>
						<Link
							href="/driver"
							className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface-1 px-5 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-accent-primary/50 hover:bg-accent-primary/10 hover:text-accent-primary"
						>
							<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /> Haritaya Dön
						</Link>
					</header>

					{/* Tabs */}
					<div className="flex gap-8 border-b border-white/10 px-2">
						<button 
							onClick={() => setActiveTab("overview")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "overview" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Genel Bakış
							{activeTab === "overview" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
						<button 
							onClick={() => setActiveTab("badges")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "badges" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Rozetlerim
							{activeTab === "badges" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
						<button 
							onClick={() => setActiveTab("leaderboard")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "leaderboard" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							Liderlik Tablosu
							{activeTab === "leaderboard" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
						<button 
							onClick={() => setActiveTab("recommendations")} 
							className={`relative pb-4 text-sm font-medium transition-colors ${activeTab === "recommendations" ? "text-accent-primary" : "text-text-tertiary hover:text-white"}`}
						>
							✨ Sana Özel
							{activeTab === "recommendations" && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
						</button>
					</div>

					{isLoading ? (
						<div className="flex flex-col items-center justify-center gap-3 py-24 text-text-tertiary">
							<Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
							<p>Cüzdan verileri senkronize ediliyor...</p>
						</div>
					) : error ? (
						<div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center text-sm text-red-200">
							{error}
						</div>
					) : user ? (
						<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
							
							{/* OVERVIEW TAB */}
							{activeTab === "overview" && (
								<div className="space-y-8">
									{/* Stats Cards */}
									<div className="grid gap-6 md:grid-cols-3">
										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-yellow-500/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-yellow-500/10 blur-2xl transition group-hover:bg-yellow-500/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>Toplam Coin</span>
												<Coins className="h-5 w-5 text-yellow-500" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.coins.toLocaleString()}</p>
											<p className="mt-2 text-xs text-text-secondary">Yeşil slotlardan kazanılan toplam değer.</p>
										</div>

										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-green-500/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green-500/10 blur-2xl transition group-hover:bg-green-500/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>CO₂ Tasarrufu</span>
												<Leaf className="h-5 w-5 text-green-500" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.co2Saved.toFixed(1)} <span className="text-2xl text-text-tertiary">kg</span></p>
											<p className="mt-2 text-xs text-text-secondary flex items-center gap-1">
												<Sparkles className="h-3 w-3 text-green-400" /> {totalGreenSessions} yeşil şarj işlemi
											</p>
											<div className="mt-4 pt-4 border-t border-white/5">
												<p className="text-xs text-text-tertiary flex items-center gap-2">
													<span className="text-green-500">≈</span>
													yıllık {(user.co2Saved / 20).toFixed(2)} ağaç emisyon temizliği
												</p>
											</div>
										</div>

										<div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-surface-1 p-8 transition hover:border-accent-primary/30">
											<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-primary/10 blur-2xl transition group-hover:bg-accent-primary/20" />
											<div className="flex items-center justify-between text-sm font-medium text-text-tertiary">
												<span>XP Seviyesi</span>
												<Award className="h-5 w-5 text-accent-primary" />
											</div>
											<p className="mt-4 text-5xl font-bold text-white tracking-tight">{user.xp.toLocaleString()}</p>
											<p className="mt-2 text-xs text-text-secondary">Sonraki seviyeye {((Math.floor(user.xp / 500) + 1) * 500) - user.xp} XP kaldı.</p>
										</div>
									</div>

									{/* Recent Activity */}
									<div className="rounded-3xl border border-white/10 bg-surface-1/50 p-8">
										<h2 className="mb-6 text-xl font-bold text-white">Son Aktiviteler</h2>
										{latestReservations.length === 0 ? (
											<div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
												<Leaf className="h-12 w-12 opacity-20 mb-4" />
												<p>Henüz bir aktivite bulunmuyor.</p>
											</div>
										) : (
											<div className="space-y-3">
												{latestReservations.map((reservation) => (
													<div
														key={reservation.id}
														className="group flex items-center justify-between rounded-2xl border border-white/5 bg-surface-1 px-6 py-4 transition hover:border-white/10 hover:bg-surface-2"
													>
														<div className="flex items-center gap-4">
															<div className={`flex h-10 w-10 items-center justify-center rounded-full ${reservation.isGreen ? "bg-green-500/20 text-green-400" : "bg-surface-2 text-text-tertiary"}`}>
																{reservation.isGreen ? <Leaf className="h-5 w-5" /> : <Award className="h-5 w-5" />}
															</div>
															<div>
																<p className="font-semibold text-white">{reservation.station.name}</p>
																<p className="text-xs text-text-tertiary">
																	{new Date(reservation.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} • {reservation.hour}
																</p>
															</div>
														</div>
														<div className="text-right">
															<p className={`font-bold ${reservation.isGreen ? "text-yellow-400" : "text-text-secondary"}`}>
																+{reservation.earnedCoins} Coin
															</p>
															{reservation.isGreen && (
																<span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
																	Eco Slot
																</span>
															)}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}

							{/* BADGES TAB */}
							{activeTab === "badges" && (
								<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
									{isLoadingBadges ? (
										<div className="col-span-full flex flex-col items-center justify-center gap-3 py-24 text-text-tertiary">
											<Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
											<p>Rozetler yükleniyor...</p>
										</div>
									) : badgeProgress.length === 0 ? (
										<div className="col-span-full flex flex-col items-center justify-center py-24 text-text-tertiary">
											<Award className="h-16 w-16 opacity-20 mb-4" />
											<p>Rozet bilgisi bulunamadı.</p>
										</div>
									) : (
										badgeProgress.map((bp) => {
											const progressPercent = bp.threshold > 0 ? Math.min(100, Math.round((bp.currentCount / bp.threshold) * 100)) : 0;
											const criteriaLabels: Record<string, string> = {
											night_charges: "Gece saatlerinde (23:00-06:00) şarj",
												green_charges: "Yeşil enerji slotlarında şarj",
												weekend_charges: "Hafta sonu şarj",
												morning_charges: "Sabah saatlerinde (06:00-09:00) şarj",
												intercity_charges: "Şehirlerarası istasyonlarda şarj",
											};
											const criteriaText = criteriaLabels[bp.metric] || bp.description;
											return (
												<div
													key={`${bp.id}-${bp.metric}`}
													className={`group relative flex flex-col items-center gap-4 rounded-3xl border p-8 text-center transition ${
														bp.earned
															? "border-accent-primary/30 bg-surface-1 hover:border-accent-primary/50 hover:bg-surface-2"
															: "border-dashed border-white/10 bg-surface-1/30"
													}`}
												>
													{bp.earned && (
														<div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 to-purple-500/5 opacity-0 transition group-hover:opacity-100 rounded-3xl" />
													)}
													<span className={`text-6xl drop-shadow-2xl filter transition duration-300 ${
														bp.earned ? "group-hover:scale-110" : "grayscale opacity-50"
													}`}>
														{bp.icon}
													</span>
													<div className="relative w-full">
														<h3 className={`text-lg font-bold ${bp.earned ? "text-white" : "text-text-secondary"}`}>
															{bp.name}
														</h3>
														<p className="mt-2 text-sm text-text-secondary leading-relaxed">{bp.description}</p>
														
														{/* Criteria / condition */}
														<div className="mt-3 rounded-xl bg-surface-2/60 px-4 py-2.5">
															<p className="text-xs font-medium text-text-tertiary">
																Koşul: <span className="text-text-secondary">{bp.threshold}x {criteriaText}</span>
															</p>
														</div>

														{/* Progress bar - always shown */}
														<div className="mt-3">
															<div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
																<div
																	className={`h-full rounded-full transition-all duration-500 ${
																		bp.earned ? "bg-green-500" : "bg-accent-primary/60"
																	}`}
																	style={{ width: `${bp.earned ? 100 : progressPercent}%` }}
																/>
															</div>
															<div className="mt-1.5 flex items-center justify-between">
																<p className={`text-xs font-medium ${bp.earned ? "text-green-400" : "text-text-tertiary"}`}>
																	{bp.earned ? `${bp.threshold}/${bp.threshold}` : `${bp.currentCount}/${bp.threshold}`} tamamlandı
																</p>
																{bp.earned ? (
																	<span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
																		Kazanıldı
																		{bp.earnedAt && (
																			<span className="text-green-500/60">
																				({new Date(bp.earnedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })})
																			</span>
																		)}
																	</span>
																) : (
																	<span className="text-xs text-text-tertiary">%{progressPercent}</span>
																)}
															</div>
														</div>
													</div>
												</div>
											);
										})
									)}
								</div>
							)}

							{/* LEADERBOARD TAB */}
							{activeTab === "leaderboard" && (
								<div className="mx-auto max-w-3xl">
									<div className="rounded-[2rem] border border-white/10 bg-surface-1 p-8 shadow-2xl">
										<div className="mb-8 flex items-center justify-between">
											<h2 className="flex items-center gap-3 text-2xl font-bold text-white">
												<Trophy className="h-8 w-8 text-yellow-500" />
												Haftanın Liderleri
											</h2>
											<span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-text-secondary">
												XP Sıralaması
											</span>
										</div>
										
										{isLoadingLeaderboard ? (
											<div className="flex flex-col items-center justify-center gap-3 py-12 text-text-tertiary">
												<Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
												<p>Liderlik tablosu yükleniyor...</p>
											</div>
										) : (
											<div className="space-y-4">
												{leaderboard.map((u, i) => {
													const badge = i === 0 ? "\u{1F3C6}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : "\u26A1";
													return (
														<div 
															key={u.id} 
															className={`relative flex items-center justify-between rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
																i === 0 ? "border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent" :
																i === 1 ? "border-text-tertiary/30 bg-surface-2" :
																i === 2 ? "border-orange-500/30 bg-orange-500/5" :
																"border-white/5 bg-surface-1/50"
															}`}
														>
															<div className="flex items-center gap-6">
																<div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-lg ${
																	i === 0 ? "bg-yellow-500 text-black ring-4 ring-yellow-500/20" :
																	i === 1 ? "bg-slate-300 text-black" :
																	i === 2 ? "bg-orange-400 text-black" :
																	"bg-slate-700 text-slate-400"
																}`}>
																	{i + 1}
																</div>
																<div>
																	<p className={`font-bold ${i === 0 ? "text-yellow-400" : "text-white"}`}>{u.name}</p>
																	<p className="text-xs text-slate-500">Sürücü Ligi</p>
																</div>
															</div>
															<div className="flex items-center gap-6">
																<span className="text-2xl filter drop-shadow-lg">{badge}</span>
																<div className="text-right">
																	<p className="font-mono text-lg font-bold text-blue-300">{u.xp.toLocaleString()} XP</p>
																</div>
															</div>
														</div>
													);
												})}
												
												{/* User's Real Rank */}
												{userRank !== null && (
													<div className="mt-8 border-t border-slate-700 pt-6">
														<div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
															<div className="flex items-center gap-6">
																<div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30">
																	{userRank}
																</div>
																<div>
																	<p className="font-bold text-white">Sen</p>
																	<p className="text-xs text-blue-300">{userRank <= 3 ? "Zirvedesin!" : "Yükseliştesin!"}</p>
																</div>
															</div>
															<div className="font-mono text-lg font-bold text-blue-300">{user.xp.toLocaleString()} XP</div>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							)}

							{/* RECOMMENDATIONS TAB - RL SCORES */}
							{activeTab === "recommendations" && (
								<div className="mx-auto max-w-5xl">
									<div className="rounded-[2rem] border border-white/10 bg-surface-1 p-8 shadow-2xl">
										<div className="mb-8 flex items-center justify-between">
											<h2 className="flex items-center gap-3 text-2xl font-bold text-white">
												<Sparkles className="h-8 w-8 text-purple-400" />
												 Sana Özel Öneriler
											</h2>
											<span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400 ring-1 ring-purple-500/40">
												AI Destekli
											</span>
										</div>
										
										{isLoadingRecommendations ? (
											<div className="flex flex-col items-center justify-center gap-3 py-12 text-text-tertiary">
												<Loader2 className="h-6 w-6 animate-spin text-purple-500" />
												<p>AI önerileri hesaplanıyor...</p>
											</div>
										) : recommendations.length === 0 ? (
											<div className="text-center py-12 text-text-tertiary">
												<p>Öneriler yüklenemedi.</p>
											</div>
										) : (
										<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-purple-500/30 scrollbar-track-transparent">
												{recommendations.map((rec, i) => {
													const stationId = (rec.stationId ?? rec.StationID ?? 0);
													const station = recommendationStations[stationId];
													const scorePercent = Math.round(rec.score ?? rec.Score ?? 0);
													const components = rec.components ?? rec.Components ?? {};
													const loadScore = Math.round(components.load ?? components.Load ?? 0);
													const greenScore = Math.round(components.green ?? components.Green ?? 0);
													const distanceScore = Math.round(components.distance ?? 0);
													const priceScore = Math.round(components.price ?? components.Price ?? 0);
													
													const metrics = [
														{ label: "Yoğunluk", value: loadScore, icon: "🏭" },
														{ label: "Yeşil Enerji", value: greenScore, icon: "🌿" },
														{ label: "Yakınlık", value: distanceScore, icon: "📍" },
														{ label: "Uygun Fiyat", value: priceScore, icon: "💰" },
													];
													
													return (
														<div 
															key={stationId} 
															className="snap-start shrink-0 w-72 relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-surface-2 p-5 transition-all hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10"
														>
															{/* Rank + Score header */}
															<div className="flex items-center justify-between mb-4">
																<div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white shadow-lg">
																	{i + 1}
																</div>
																<div className="flex items-center gap-2">
																	<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/30">
																		<span className="text-lg font-bold text-white">{scorePercent}</span>
																	</div>
																</div>
															</div>

															{/* Station name */}
															<h3 className="font-bold text-white text-base leading-tight mb-1 line-clamp-2">
																{station?.name || `İstasyon #${stationId}`}
															</h3>
															{station?.address && (
																<p className="text-xs text-text-tertiary mb-3 line-clamp-1">{station.address}</p>
															)}
															
															<p className="text-xs text-text-tertiary mb-4 line-clamp-2">
																{rec.explanation || rec.Explanation}
															</p>

															{/* Score bars - friendly format */}
															<div className="space-y-1.5 mb-4">
																{metrics.map(({ label, value, icon }) => {
																	const barColor = value >= 60 ? "bg-green-500/70" : value >= 30 ? "bg-yellow-500/70" : "bg-red-500/50";
																	return (
																		<div key={label} className="flex items-center gap-2">
																			<span className="text-xs w-4">{icon}</span>
																			<span className="text-[10px] text-text-tertiary w-20 shrink-0">{label}</span>
																			<div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
																				<div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
																			</div>
																		</div>
																	);
																})}
															</div>

															{/* Price */}
															{station && (
																<div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-text-tertiary">
																	<span>{station.price?.toFixed(2) || "---"} ₺/kWh</span>
																	<Link
																		href={`/driver?stationId=${stationId}`}
																		className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
																	>
																		Haritada Gör →
																	</Link>
																</div>
															)}
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>
							)}

						</div>
					) : null}
				</div>
			</div>
		</main>
	);
}
