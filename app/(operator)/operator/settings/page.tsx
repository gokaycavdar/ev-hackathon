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
    <div className="min-h-screen bg-primary-bg text-primary p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white font-display">Ayarlar</h1>
        <p className="text-sm text-text-secondary mt-2">
          Hesap ve uygulama tercihlerinizi yönetin.
        </p>
      </header>

      <div className="grid gap-6 max-w-4xl">
        <Card className="p-6 border-white/10 bg-surface-1 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-accent-primary/10 text-accent-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profil Bilgileri</h2>
              <p className="text-sm text-text-secondary">Kişisel bilgilerinizi güncelleyin.</p>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-10 text-text-tertiary">Yükleniyor...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-text-secondary">Ad Soyad</label>
                <input 
                  className="w-full bg-surface-2 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent-primary outline-none focus:ring-1 focus:ring-accent-primary"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-text-secondary">E-posta</label>
                <input 
                  className="w-full bg-surface-2 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-accent-primary outline-none focus:ring-1 focus:ring-accent-primary"
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
              className="px-6 py-2 rounded-lg bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-accent-primary/20"
            >
              <Save className="h-4 w-4" /> Kaydet
            </button>
          </div>
        </Card>

      </div>
    </div>
  );
}
