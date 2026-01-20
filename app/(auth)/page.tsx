"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Rocket, Lock, ArrowRight, User } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
	const [mode, setMode] = useState<"login" | "register">("login");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Predict role based on email domain
	const predictedRole = useMemo(() => {
		const e = email.trim().toLowerCase();
		if (!e || !e.includes("@")) return null;
		const domain = e.split("@")[1];
		if (!domain) return null;
		const consumerDomains = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"];
		if (consumerDomains.includes(domain)) return "Sürücü";
		const operatorHints = ["enerji", "energy", "power", "elektrik", "zorlu", "shell", "bp"];
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
		<main className="min-h-screen text-white">
			<div className="relative overflow-hidden">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,.25),transparent_60%)]" />
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(16,185,129,.22),transparent_55%)]" />
				<div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-700/90" />
				<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-12 lg:py-20">
					<header className="mb-14">
						<span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-600/15 px-4 py-1 text-xs font-semibold text-blue-200 shadow-glow">
							<Rocket className="h-4 w-4" /> Hackathon Prototype
						</span>
						<h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
							<span className="text-gradient-eco">SmartCharge AI:</span> Smart Charging, Less Carbon.
						</h1>
						<p className="mt-5 max-w-2xl text-base text-slate-100">
							AI destekli yeşil slot önerileri, anlık istasyon bilgileri ve oyunlaştırılmış ödül sistemiyle elektrikli
							araç şarj deneyimini yeniden düşün. 24 saatlik sprint MVP.
						</p>
					</header>

					<div className="grid gap-10 lg:grid-cols-[1.6fr,1fr]">
						<section className="space-y-6">
							<div className="grid gap-5 sm:grid-cols-2">
								<Card className="group transition hover:border-blue-400/50 bg-slate-700/50 border-slate-600">
									<h2 className="text-sm font-semibold text-white flex items-center gap-2">
										<span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,.3)]" /> Drivers
									</h2>
									<p className="mt-2 text-xs leading-relaxed text-slate-200">
										Düşük şebeke yükü saatlerini yakala, ekstra coin kazan, karbon ayak izini azalt.
									</p>
								</Card>
								<Card className="group transition hover:border-purple-400/50 bg-slate-700/50 border-slate-600">
									<h2 className="text-sm font-semibold text-white flex items-center gap-2">
										<span className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_0_4px_rgba(168,85,247,.35)]" /> Operators
									</h2>
									<p className="mt-2 text-xs leading-relaxed text-slate-200">
										Gelir, yük dengesi ve yeşil teşvik performansını tek panelden yönet.
									</p>
								</Card>
							</div>

							<Card className="p-0 overflow-hidden bg-slate-700/50 border-slate-600">
								<div className="relative h-32 w-full">
									<div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-green-500/20" />
									<div className="absolute inset-0 flex items-center px-6">
										<p className="text-sm text-slate-200 max-w-md leading-relaxed">
											Gerçek zamanlı yük simülasyonu ve hızlandırılmış rezervasyon akışı ile yatırım potansiyelini
											canlı test et.
										</p>
									</div>
								</div>
							</Card>
						</section>

						<section className="rounded-3xl border border-slate-600/70 bg-slate-800/80 p-7 shadow-lg backdrop-blur-xl">
							<h2 className="flex items-center gap-2 text-lg font-semibold">
								<Lock className="h-4 w-4 text-blue-400" /> {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
							</h2>
							<p className="mt-1 text-xs text-slate-300">
								{mode === "login"
									? "Hesabınıza giriş yapın"
									: "Yeni hesap oluşturun"}
							</p>

							<form
								className="mt-6 space-y-4"
								onSubmit={handleSubmit}
							>
								{mode === "register" && (
									<label className="flex flex-col gap-2 text-xs font-medium text-slate-200">
										İsim
										<div className="relative">
											<User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
											<input
												className="w-full rounded-xl border border-slate-600 bg-slate-700/80 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
												type="text"
												placeholder="Adınız Soyadınız"
												value={name}
												onChange={(event) => setName(event.target.value)}
												required
											/>
										</div>
									</label>
								)}

								<label className="flex flex-col gap-2 text-xs font-medium text-slate-200">
									Email
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											className="w-full rounded-xl border border-slate-600 bg-slate-700/80 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
											type="email"
											placeholder="ornek@email.com"
											value={email}
											onChange={(event) => setEmail(event.target.value)}
											required
										/>
									</div>
								</label>

								<label className="flex flex-col gap-2 text-xs font-medium text-slate-200">
									Şifre
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
										<input
											className="w-full rounded-xl border border-slate-600 bg-slate-700/80 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
											type="password"
											placeholder={mode === "register" ? "En az 6 karakter" : "••••••••"}
											value={password}
											onChange={(event) => setPassword(event.target.value)}
											required
											minLength={6}
										/>
									</div>
								</label>

								{predictedRole && mode === "register" ? (
									<p className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
										<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${predictedRole === "Operatör" ? "bg-purple-500/15 text-purple-300 border border-purple-400/30" : "bg-green-500/15 text-green-300 border border-green-400/30"}`}>{predictedRole} rolü</span>
										{predictedRole === "Operatör" ? "Kurumsal alan adı tespit edildi." : "Bireysel hesap olarak kaydedilecek."}
									</p>
								) : null}

								{error ? <p className="text-xs text-red-400">{error}</p> : null}

								<button
									type="submit"
									className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isSubmitting}
								>
									{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
									{isSubmitting ? (mode === "login" ? "Giriş yapılıyor..." : "Kayıt yapılıyor...") : (mode === "login" ? "Giriş Yap" : "Kayıt Ol")}
								</button>
							</form>

							<div className="mt-6 text-center">
								<button
									className="text-xs text-slate-400 hover:text-blue-400 transition"
									onClick={() => {
										setMode(mode === "login" ? "register" : "login");
										setError(null);
									}}
									type="button"
								>
									{mode === "login"
										? "Hesabınız yok mu? Kayıt olun"
										: "Zaten hesabınız var mı? Giriş yapın"}
								</button>
							</div>

							{mode === "login" && (
								<div className="mt-4 p-3 bg-slate-700/40 rounded-lg border border-slate-600/50">
									<p className="text-[10px] text-slate-400 leading-relaxed">
										<strong>Demo hesaplar:</strong><br />
										Sürücü: driver@test.com / demo123<br />
										Operatör: info@zorlu.com / demo123
									</p>
								</div>
							)}
						</section>
					</div>
				</div>
			</div>
		</main>
	);
}
