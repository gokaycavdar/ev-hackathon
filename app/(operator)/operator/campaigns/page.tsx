"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Users, ArrowRight, Edit2, Trash2, X, Save, Tag, Clock, AlertCircle } from "lucide-react";

type Campaign = {
  id: number;
  title: string;
  description: string;
  status: "ACTIVE" | "DRAFT" | "ENDED";
  target: string;
  discount: string;
  endDate: string | null;
  stationId?: number | null;
  coinReward?: number;
  station?: { name: string };
};

type Station = {
  id: number;
  name: string;
  mockStatus?: "GREEN" | "YELLOW" | "RED";
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const suggestedStations = stations.filter(s => s.mockStatus === "GREEN");
  
  // Form state
  const [formData, setFormData] = useState<Partial<Campaign>>({
    title: "",
    description: "",
    status: "DRAFT",
    target: "",
    discount: "",
    endDate: "",
    stationId: null,
    coinReward: 0,
  });

  const fetchCampaigns = async () => {
    try {
      const ownerId = localStorage.getItem("ecocharge:userId") ?? "1";
      const [resCampaigns, resStations] = await Promise.all([
        fetch(`/api/campaigns?ownerId=${ownerId}`),
        fetch(`/api/company/my-stations?ownerId=${ownerId}`)
      ]);

      if (resCampaigns.ok) {
        const data = await resCampaigns.json();
        setCampaigns(data);
      }
      
      if (resStations.ok) {
        const data = await resStations.json();
        // Handle different response structures
        if (data.stations) {
          setStations(data.stations);
        } else if (Array.isArray(data)) {
          setStations(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = () => {
    setFormData({
      title: "Yeni Kampanya",
      description: "",
      status: "DRAFT",
      target: "Tüm İstasyonlar",
      discount: "%10",
      endDate: new Date().toISOString().split('T')[0],
      stationId: null,
      coinReward: 50,
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      title: campaign.title,
      description: campaign.description,
      status: campaign.status,
      target: campaign.target,
      discount: campaign.discount,
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : "",
      stationId: campaign.stationId,
      coinReward: campaign.coinReward,
    });
    setEditingId(campaign.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    const ownerId = localStorage.getItem("ecocharge:userId") ?? "1";
    const url = editingId ? `/api/campaigns/${editingId}` : "/api/campaigns";
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
        fetchCampaigns();
      } else {
        alert("Kaydetme başarısız oldu.");
      }
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-10 text-white font-sans">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Kampanya Yönetimi</h1>
          <p className="text-slate-400 mt-1">Müşteri etkileşimini artırmak için kampanyalar oluşturun.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-500 hover:shadow-purple-500/40"
          >
            <Plus size={18} />
            Yeni Kampanya
          </button>
        )}
      </header>

      {/* Suggestions Section */}
      {!isCreating && suggestedStations.length > 0 && (
        <div className="mb-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-500/20 p-3 text-blue-400">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Kampanya Önerisi</h3>
              <p className="mt-1 text-sm text-slate-300">
                Aşağıdaki istasyonlarınızda yoğunluk düşük seviyede. Kullanımı artırmak için bu istasyonlara özel kampanyalar oluşturabilirsiniz.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {suggestedStations.map(station => (
                  <div key={station.id} className="flex items-center gap-3 rounded-xl bg-slate-800 p-3 border border-slate-700">
                    <div>
                      <div className="font-medium text-white text-sm">{station.name}</div>
                      <div className="text-xs text-green-400">Düşük Yoğunluk</div>
                    </div>
                    <button
                      onClick={() => {
                        handleCreate();
                        setFormData(prev => ({
                          ...prev,
                          title: `${station.name} Özel İndirimi`,
                          description: `${station.name} istasyonunda geçerli %20 indirim fırsatı!`,
                          stationId: station.id,
                          discount: "%20",
                          target: station.name
                        }));
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition"
                    >
                      Kampanya Oluştur
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="mb-8 rounded-2xl border border-purple-500/30 bg-slate-800/80 p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{editingId ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Kampanya Başlığı</label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Hedef Kitle / İstasyon</label>
              <select
                className="w-full rounded-xl border border-slate-600 bg-slate-700 p-3 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={formData.stationId || ""}
                onChange={(e) => setFormData({ ...formData, stationId: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">Tüm İstasyonlar</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-slate-300">Açıklama</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-600 bg-slate-700 p-3 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">İndirim Oranı / Tutarı</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="%10 veya 50 TL"
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 p-3 pl-10 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Bitiş Tarihi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-600 bg-slate-700 p-3 pl-10 text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Durum</label>
              <div className="flex gap-3">
                {["ACTIVE", "DRAFT", "ENDED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFormData({ ...formData, status: status as any })}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                      formData.status === status
                        ? "border-purple-500 bg-purple-500/20 text-purple-300"
                        : "border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}
                  >
                    {status === "ACTIVE" ? "Aktif" : status === "DRAFT" ? "Taslak" : "Bitti"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-slate-700 pt-6">
            <button
              onClick={() => setIsCreating(false)}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-500/20"
            >
              <Save size={18} />
              Kaydet
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-700 bg-slate-800/50 py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-700 p-4">
            <Megaphone className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Kampanya Bulunamadı</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-400">
            Henüz bir kampanya oluşturmadınız. İlk kampanyanızı oluşturarak başlayın.
          </p>
          <button 
            onClick={handleCreate}
            className="mt-6 text-sm font-medium text-purple-400 hover:text-purple-300"
          >
            Kampanya oluştur &rarr;
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="group relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-6 transition hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10"
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                <button 
                  onClick={() => handleEdit(campaign)}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="p-2 rounded-lg bg-slate-700 hover:bg-red-600/20 hover:text-red-400 text-slate-300 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  campaign.status === 'ACTIVE' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : campaign.status === 'DRAFT' 
                      ? 'bg-slate-700 text-slate-400 border border-slate-600' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status === 'DRAFT' ? 'Taslak' : 'Bitti'}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-6 h-10">{campaign.description}</p>

              <div className="space-y-3 border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Tag size={14} />
                    <span>İndirim</span>
                  </div>
                  <span className="font-semibold text-purple-400">{campaign.discount}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={14} />
                    <span>Hedef</span>
                  </div>
                  <span className="font-medium text-slate-200 truncate max-w-[150px]">
                    {campaign.station ? campaign.station.name : "Tüm İstasyonlar"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={14} />
                    <span>Bitiş</span>
                  </div>
                  <span className="font-medium text-slate-200">
                    {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('tr-TR') : "Süresiz"}
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 transition-opacity group-hover:opacity-100"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
