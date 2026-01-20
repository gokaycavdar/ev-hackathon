"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap, MapPin, Trophy, Building2, ArrowRight, CheckCircle2, X, Lock, User } from "lucide-react";

type LoginResponse = {
	user?: {
		id: number;
		role: string;
		name: string;
	};
	error?: string;
};

export default function AuthLandingPage() {
	const router = useRouter();
	const [showLogin, setShowLogin] = useState(false);
	const [mode, setMode] = useState<"login" | "register">("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);


	const predictedRole = useMemo(() => {
		const e = email.trim().toLowerCase();
		if (!e || !e.includes("@")) return null;
		const domain = e.split("@")[1];
		if (!domain) return null;
		const consumerDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"];
		if (consumerDomains.includes(domain)) return "Sürücü";
		const operatorHints = ["enerji", "energy", "power", "elektrik", "grid", "charge", "ev", "zorlu", "shell", "bp", "tesla"];
		if (operatorHints.some((k) => domain.includes(k))) return "Operatör";
		return "Sürücü";
	}, [email]);

	const handleSubmit = async (event?: React.FormEvent) => {
		if (event) event.preventDefault();

		const payloadEmail = email.trim().toLowerCase();

		if (!payloadEmail || !password) {
			setError("Email ve şifre gerekli");
			return;
		}

		if (mode === "register" && !name) {
			setError("İsim gerekli");
			return;
		}

		try {
			setIsSubmitting(true);
			setError(null);

			const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
			const body = mode === "login"
				? { email: payloadEmail, password }
				: { name, email: payloadEmail, password };

			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});

			const data: LoginResponse = await response.json();

			if (!response.ok || !data.user) {
				throw new Error(data.error ?? `${mode === "login" ? "Giriş" : "Kayıt"} başarısız`);
			}

			if (typeof window !== "undefined") {
				localStorage.setItem("ecocharge:userId", data.user.id.toString());
				localStorage.setItem("ecocharge:role", data.user.role);
				localStorage.setItem("ecocharge:name", data.user.name);
			}

			router.push(data.user.role === "OPERATOR" ? "/operator" : "/driver");
		} catch (err) {
			const message = err instanceof Error ? err.message : `${mode === "login" ? "Giriş" : "Kayıt"} sırasında hata oluştu`;
			setError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-primary-bg text-primary selection:bg-accent-primary selection:text-white">
			{/* Background Effects */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-accent-primary/10 blur-[120px]" />
				<div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
			</div>

			<div className="relative z-10 w-full max-w-6xl px-6 py-12 text-center">
				<div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

					<h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-7xl font-display text-primary">
						SmartCharge <br />
						<span className="text-gradient">
							Akıllı Şarjın Geleceği
						</span>
					</h1>

					<p className="mx-auto mb-10 max-w-2xl text-lg text-secondary leading-relaxed">
						Yapay zeka destekli önerilerle en verimli saatlerde şarj et,
						oyunlaştırma ile kazan. Elektrikli araç deneyimini SmartCharge ile dönüştür.
					</p>

					{/* Feature Grid */}
					<div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
						<div className="group glass-card rounded-2xl p-5 transition hover:border-accent-primary/30 hover:bg-surface-2">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary group-hover:scale-110 transition-transform">
								<Zap className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-primary">Yapay Zeka Destekli</h3>
							<p className="mt-1 text-xs text-secondary">En uygun ve ekonomik şarj saatlerini belirler.</p>
						</div>
						<div className="group glass-card rounded-2xl p-5 transition hover:border-green-500/30 hover:bg-surface-2">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform">
								<MapPin className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-primary">Akıllı Harita</h3>
							<p className="mt-1 text-xs text-secondary">Gerçek zamanlı istasyon doluluk takibi.</p>
						</div>
						<div className="group glass-card rounded-2xl p-5 transition hover:border-yellow-500/30 hover:bg-surface-2">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-400 group-hover:scale-110 transition-transform">
								<Trophy className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-primary">Oyunlaştırma</h3>
							<p className="mt-1 text-xs text-secondary">Coin, XP ve rozetlerle ödül sistemi.</p>
						</div>
						<div className="group glass-card rounded-2xl p-5 transition hover:border-purple-500/30 hover:bg-surface-2">
							<div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
								<Building2 className="h-5 w-5" />
							</div>
							<h3 className="font-semibold text-primary">İşletme Paneli</h3>
							<p className="mt-1 text-xs text-secondary">Operatörler için detaylı yönetim.</p>
						</div>
					</div>

					{/* CTA Button */}
					<button
						onClick={() => setShowLogin(true)}
						className={`group relative inline-flex items-center gap-3 rounded-full bg-accent-primary px-8 py-4 text-lg font-bold text-white transition-all hover:bg-accent-hover hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.5)] active:scale-95 ${showLogin ? 'hidden' : ''}`}
					>
						Hemen Başla
						<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
					</button>

					{/* Login Modal Overlay */}
					{showLogin && (
						<div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
							{/* Backdrop */}
							<div
								className="absolute inset-0 bg-black/60 backdrop-blur-sm"
								onClick={() => setShowLogin(false)}
							/>

							{/* Modal Content */}
							<div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/10 bg-surface-1 p-8 shadow-2xl animate-in zoom-in-95 duration-200">
								<button
									onClick={() => {
										setShowLogin(false);
										setMode("login");
										setError(null);
									}}
									className="absolute right-4 top-4 text-secondary hover:text-primary transition"
								>
									<X className="h-5 w-5" />
								</button>

								<h2 className="mb-2 text-2xl font-bold text-primary">
									{mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
								</h2>
								<p className="mb-6 text-xs text-secondary">
									{mode === "login" ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
								</p>

								<form onSubmit={handleSubmit} className="space-y-4">
									{mode === "register" && (
										<div>
											<label htmlFor="name" className="sr-only">İsim</label>
											<div className="relative">
												<User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
												<input
													id="name"
													type="text"
													placeholder="Adınız Soyadınız"
													value={name}
													onChange={(e) => setName(e.target.value)}
													className="w-full rounded-xl border border-primary/10 bg-surface-2/50 px-4 py-3 pl-10 text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition"
													required
												/>
											</div>
										</div>
									)}

									<div>
										<label htmlFor="email" className="sr-only">E-posta</label>
										<input
											id="email"
											type="email"
											placeholder="E-posta adresiniz"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="w-full rounded-xl border border-primary/10 bg-surface-2/50 px-4 py-3 text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition"
											required
											autoFocus={mode === "login"}
										/>
										{predictedRole && mode === "register" && (
											<p className="mt-2 flex items-center gap-1.5 text-xs text-accent-primary">
												<CheckCircle2 className="h-3 w-3" />
												{predictedRole} rolü tespit edildi
											</p>
										)}
									</div>

									<div>
										<label htmlFor="password" className="sr-only">Şifre</label>
										<div className="relative">
											<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
											<input
												id="password"
												type="password"
												placeholder={mode === "register" ? "En az 6 karakter" : "••••••••"}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												className="w-full rounded-xl border border-primary/10 bg-surface-2/50 px-4 py-3 pl-10 text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition"
												required
												minLength={6}
											/>
										</div>
									</div>

									{error && (
										<div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 border border-red-500/20">
											{error}
										</div>
									)}

									<button
										type="submit"
										disabled={isSubmitting}
										className="w-full rounded-xl bg-accent-primary py-3 font-bold text-white transition hover:bg-accent-hover disabled:opacity-50 shadow-lg shadow-accent-primary/20"
									>
										{isSubmitting ? (
											<span className="flex items-center justify-center gap-2">
												<Loader2 className="h-4 w-4 animate-spin" /> {mode === "login" ? "Giriş yapılıyor..." : "Kayıt yapılıyor..."}
											</span>
										) : (
											mode === "login" ? "Giriş Yap" : "Kayıt Ol"
										)}
									</button>

									<div className="text-center">
										<button
											type="button"
											onClick={() => {
												setMode(mode === "login" ? "register" : "login");
												setError(null);
											}}
											className="text-xs text-secondary hover:text-accent-primary transition"
										>
											{mode === "login" ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
										</button>
									</div>

									{mode === "login" && (
										<div className="mt-4 p-3 bg-surface-2/50 rounded-lg border border-primary/10">
											<p className="text-[10px] text-secondary leading-relaxed">
												<strong className="text-primary">Demo hesaplar:</strong><br />
												Sürücü: driver@test.com / demo123<br />
												Operatör: info@zorlu.com / demo123
											</p>
										</div>
									)}
								</form>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<footer className="absolute bottom-6 text-center text-xs text-tertiary">
					&copy; 2025 SmartCharge. All rights reserved.
				</footer>
			</div>
		</main>
	);
}
