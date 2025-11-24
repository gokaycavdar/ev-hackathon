"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Settings, User, Bell, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem("ecocharge:userId") ?? "1";
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name,
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSave = async () => {
    const userId = localStorage.getItem("ecocharge:userId") ?? "1";
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("Profil güncellendi!");
      } else {
        alert("Güncelleme başarısız.");
      }
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white">Ayarlar</h1>
        <p className="text-sm text-slate-200 mt-2">
          Hesap ve uygulama tercihlerinizi yönetin.
        </p>
      </header>

      <div className="grid gap-6 max-w-4xl">
        <Card className="p-6 border-slate-600 bg-slate-700/60">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profil Bilgileri</h2>
              <p className="text-sm text-slate-300">Kişisel bilgilerinizi güncelleyin.</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-10 text-slate-300">Yükleniyor...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-slate-300">Ad Soyad</label>
                <input 
                  className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-300">E-posta</label>
                <input 
                  className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Kaydet
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
