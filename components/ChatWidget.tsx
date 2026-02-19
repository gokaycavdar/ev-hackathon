"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Zap, Calendar, Loader2 } from "lucide-react";
import { Card } from "./ui/Card";
import { authFetch, unwrapResponse, getStoredUserId, getToken } from "@/lib/auth";

type Recommendation = {
  id: number;
  name: string;
  hour: string;
  coins: number;
  reason: string;
  isGreen: boolean;
};

type Message = {
  role: "user" | "bot";
  content: string;
  recommendations?: Recommendation[];
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Merhaba! Ben SmartCharge AI asistanı. Sana en uygun şarj istasyonlarını bulmamı ister misin? 'Bana istasyon öner' yazabilirsin.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const [userId, setUserId] = useState<number | null>(null);

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

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) {
      setMessages(prev => [...prev, { role: "bot", content: "Kullanıcı bilgisi yükleniyor, lütfen bekleyin..." }]);
      return;
    }

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await unwrapResponse<{ role: string; content: string; recommendations?: Recommendation[] }>(res);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.content,
          recommendations: data.recommendations,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: "Üzgünüm, şu an bağlantı kuramıyorum. Lütfen tekrar dene." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async (rec: Recommendation) => {
    try {
      const res = await authFetch("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          stationId: rec.id,
          date: new Date().toISOString(),
          hour: rec.hour,
          isGreen: rec.isGreen,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert("Rezervasyon oluşturulamadı: " + (errData.error?.message || "Hata"));
        return;
      }

      const data = await unwrapResponse<{ id: number }>(res);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `Harika! ${rec.name} istasyonunda saat ${rec.hour} için randevun oluşturuldu.`,
        },
      ]);
    } catch (error) {
      alert("Bir hata oluştu.");
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 hover:scale-105 active:scale-95"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 shadow-2xl shadow-black/50 animate-in slide-in-from-bottom-10 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-700/50 p-4 backdrop-blur-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <Bot size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">SmartCharge AI</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600"
                  }`}
                >
                  <p>{msg.content}</p>
                  
                  {/* Recommendations Grid */}
                  {msg.recommendations && (
                    <div className="mt-4 space-y-3">
                      {msg.recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className="rounded-xl border border-slate-600 bg-slate-800/50 p-3 transition hover:border-blue-500/50"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white text-xs">{rec.name}</h4>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                              <Zap size={10} /> +{rec.coins} Coin
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-3">
                            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{rec.hour}</span>
                            <span>•</span>
                            <span className="text-green-400">{rec.reason}</span>
                          </div>
                          <button
                            onClick={() => handleBook(rec)}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition-colors"
                          >
                            <Calendar size={12} /> Hemen Rezerve Et
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Bir şeyler yaz..."
                className="w-full rounded-xl border border-slate-600 bg-slate-900/50 py-3 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-blue-500 hover:bg-blue-500/10 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
