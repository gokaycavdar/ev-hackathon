"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, MapPin, Edit2, Trash2, X, Save, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Station = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  price: number;
  mockLoad?: number;
  mockStatus?: "GREEN" | "YELLOW" | "RED";
  reservationCount?: number;
  revenue?: number;
};

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Station>>({
    name: "",
    lat: 41.0082,
    lng: 28.9784,
    address: "",
    price: 5.0,
  });

  const fetchStations = async () => {
    try {
      const ownerId = localStorage.getItem("ecocharge:userId") ?? "1";
      const res = await fetch(`/api/company/my-stations?ownerId=${ownerId}`);

      if (res.ok) {
        const data = await res.json();
        setStations(data.stations || []);
      }
    } catch (error) {
      console.error("Failed to fetch stations", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleCreate = () => {
    setFormData({
      name: "Yeni İstasyon",
      lat: 41.0082,
      lng: 28.9784,
      address: "",
      price: 5.0,
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (station: Station) => {
    setFormData({
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      address: station.address || "",
      price: station.price,
    });
    setEditingId(station.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    const ownerId = localStorage.getItem("ecocharge:userId") ?? "1";
    const url = editingId ? `/api/company/my-stations/${editingId}` : "/api/company/my-stations";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ownerId }),
      });

      if (res.ok) {
        setIsCreating(false);
        setEditingId(null);
        fetchStations();
      } else {
        alert("Kaydetme başarısız oldu.");
      }
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu istasyonu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/company/my-stations/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchStations();
      } else {
        const data = await res.json();
        alert(data.error || "Silme başarısız.");
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">İstasyon Yönetimi</h1>
          <p className="text-sm text-slate-200 mt-2">
            Şarj istasyonlarınızı ekleyin, düzenleyin ve yönetin.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-semibold transition shadow-lg shadow-purple-900/20"
          >
            <Plus className="h-5 w-5" /> Yeni İstasyon
          </button>
        )}
      </header>

      {isCreating && (
        <Card className="p-6 mb-8 border-purple-500/30 bg-slate-700/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">{editingId ? "İstasyonu Düzenle" : "Yeni İstasyon Ekle"}</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-300 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-slate-200">İstasyon Adı</label>
              <input 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Fiyat (₺/kWh)</label>
              <input 
                type="number"
                step="0.1"
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs text-slate-200">Adres</label>
              <input 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.address || ""}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Enlem (Latitude)</label>
              <input 
                type="number"
                step="0.0001"
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.lat}
                onChange={e => setFormData({...formData, lat: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Boylam (Longitude)</label>
              <input 
                type="number"
                step="0.0001"
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.lng}
                onChange={e => setFormData({...formData, lng: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg text-slate-200 hover:bg-slate-600 transition"
            >
              İptal
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Kaydet
            </button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-20 text-slate-300">Yükleniyor...</div>
      ) : stations.length === 0 ? (
        <div className="text-center py-20 text-slate-300 bg-slate-700/30 rounded-3xl border border-slate-600 border-dashed">
          <Zap className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p>Henüz istasyon eklenmemiş.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((station) => (
            <Card key={station.id} className="p-6 border-slate-600 bg-slate-700/60 hover:border-purple-500/30 transition group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button 
                  onClick={() => handleEdit(station)}
                  className="p-2 rounded-lg bg-slate-600 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(station.id)}
                  className="p-2 rounded-lg bg-slate-600 hover:bg-red-600/20 hover:text-red-400 text-slate-300 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{station.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-300 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">
                      {station.address || 
                        (station.lat && station.lng 
                          ? `${Number(station.lat).toFixed(4)}, ${Number(station.lng).toFixed(4)}` 
                          : "Konum bilgisi yok")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-600/50">
                <div>
                  <div className="text-xs text-slate-300 mb-1">Birim Fiyat</div>
                  <div className="text-lg font-bold text-white flex items-center gap-1">
                    {station.price} <span className="text-xs font-normal text-slate-300">₺/kWh</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-300 mb-1">Toplam Gelir</div>
                  <div className="text-lg font-bold text-green-400 flex items-center gap-1">
                    {station.revenue || 0} <span className="text-xs font-normal text-green-400/70">₺</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
