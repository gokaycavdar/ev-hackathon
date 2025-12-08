"use client";

import { useState, useEffect, useMemo } from "react";
import { Megaphone, Plus, Calendar, Users, ArrowRight, Edit2, Trash2, X, Save, Tag, Clock, AlertCircle, Sparkles, TrendingDown, Zap, Target, BarChart3 } from "lucide-react";

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
  
  // AI Recommendations Logic
  const recommendations = useMemo(() => {
    if (stations.length === 0) return [];
    
    const recs = [];
    
    // 1. Low Density Recommendation
    const lowDensityStations = stations.filter(s => s.mockStatus === "GREEN");
    if (lowDensityStations.length > 0) {
      recs.push({
        id: 1,
        type: "DENSITY",
        title: "Düşük Yoğunluk Fırsatı",
        station: lowDensityStations[0],
        reason: "Bu istasyonun kullanım oranı %30'un altında. Trafiği artırmak için indirim tanımlayın.",
        stat: "%24 Kullanım",
        icon: TrendingDown,
        color: "blue",
        suggestedDiscount: "%15"
      });
    }

    // 2. Idle Station Recommendation (Mock)
    const idleStation = stations.find(s => s.id % 2 === 0) || stations[0];
    if (idleStation) {
      recs.push({
        id: 2,
        type: "IDLE",
        title: "Hareketsiz İstasyon",
        station: idleStation,
        reason: "Son 48 saatte rezervasyon hacmi düşük. Kullanıcıları çekmek için kampanya başlatın.",
        stat: "📉 Düşük Hacim",
        icon: AlertCircle,
        color: "orange",
        suggestedDiscount: "%20"
      });
    }

    // 3. Loyalty/Segment Recommendation (Mock)
    const popularStation = stations.find(s => s.mockStatus === "RED") || stations[stations.length - 1];
    if (popularStation) {
      recs.push({
        id: 3,
        type: "LOYALTY",
        title: "Sadakat Kampanyası",
        station: popularStation,
        reason: "Bu istasyon çok popüler. Sadık müşterilere özel 'Teşekkür' indirimi sunun.",
        stat: "⭐ Yüksek Puan",
        icon: Sparkles,
        color: "purple",
        suggestedDiscount: "%10"
      });
    }

    return recs;
  }, [stations]);
  
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
    <div className="min-h-screen bg-primary-bg p-6 lg:p-10 text-primary font-sans">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-display">Kampanya Yönetimi</h1>
          <p className="text-text-secondary mt-1">Müşteri etkileşimini artırmak için kampanyalar oluşturun.</p>
        </div>
        {!isCreating && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-xl bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-hover hover:shadow-accent-primary/30"
          >
            <Plus size={18} />
            Yeni Kampanya
          </button>
        )}
      </header>

      {/* AI Recommendations Section */}
      {!isCreating && recommendations.length > 0 && (
        <div className="mb-10 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Sparkles className="h-5 w-5 text-accent-primary" />
            <h3 className="text-lg font-bold text-white">AI Kampanya Önerileri</h3>
          </div>
          
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-5 scrollbar-thin scrollbar-thumb-surface-3 scrollbar-track-transparent">
            {recommendations.map((rec) => (
              <div 
                key={rec.id} 
                className="group relative flex-shrink-0 w-80 flex flex-col justify-between rounded-2xl bg-surface-1 border border-white/5 p-5 shadow-sm transition-all hover:shadow-md hover:border-accent-primary/30 hover:-translate-y-1"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${
                      rec.color === "blue" ? "bg-blue-500/10 text-blue-400" :
                      rec.color === "orange" ? "bg-orange-500/10 text-orange-400" :
                      "bg-purple-500/10 text-purple-400"
                    }`}>
                      <rec.icon size={20} />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      rec.color === "blue" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      rec.color === "orange" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                      "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    }`}>
                      {rec.stat}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-1">{rec.title}</h4>
                  <p className="text-xs font-medium text-text-tertiary mb-3 flex items-center gap-1">
                    <Target size={12} />
                    {rec.station.name}
                  </p>
                  
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {rec.reason}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Önerilen</span>
                    <span className="text-sm font-bold text-white">{rec.suggestedDiscount} İndirim</span>
                  </div>
                  <button
                    onClick={() => {
                      handleCreate();
                      setFormData(prev => ({
                        ...prev,
                        title: `${rec.station.name} Fırsatı`,
                        description: rec.reason,
                        stationId: rec.station.id,
                        discount: rec.suggestedDiscount,
                        target: rec.station.name
                      }));
                    }}
                    className="flex items-center gap-2 rounded-lg bg-surface-3 px-4 py-2 text-xs font-bold text-white hover:bg-accent-primary transition shadow-md shadow-black/20"
                  >
                    Oluştur <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isCreating && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-surface-1 p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">{editingId ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}</h2>
            <button onClick={() => setIsCreating(false)} className="text-text-tertiary hover:text-white transition">
              <X size={20} />
            </button>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Kampanya Başlığı</label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Hedef Kitle / İstasyon</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 text-white focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
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
              <label className="text-xs font-medium text-text-secondary">Açıklama</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">İndirim Oranı / Tutarı</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="%10 veya 50 TL"
                  className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 pl-10 text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Bitiş Tarihi</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="date"
                  className="w-full rounded-xl border border-white/10 bg-surface-2 p-3 pl-10 text-white placeholder-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  value={formData.endDate || ""}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">Durum</label>
              <div className="flex gap-3">
                {["ACTIVE", "DRAFT", "ENDED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFormData({ ...formData, status: status as any })}
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                      formData.status === status
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-white/10 bg-surface-2 text-text-secondary hover:bg-surface-3"
                    }`}
                  >
                    {status === "ACTIVE" ? "Aktif" : status === "DRAFT" ? "Taslak" : "Bitti"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-6">
            <button
              onClick={() => setIsCreating(false)}
              className="rounded-xl px-6 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-2 transition"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-accent-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition shadow-lg shadow-accent-primary/20"
            >
              <Save size={18} />
              Kaydet
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-surface-1 py-20 text-center shadow-sm">
          <div className="mb-4 rounded-full bg-surface-2 p-4">
            <Megaphone className="h-8 w-8 text-text-tertiary" />
          </div>
          <h3 className="text-lg font-semibold text-white">Kampanya Bulunamadı</h3>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Henüz bir kampanya oluşturmadınız. İlk kampanyanızı oluşturarak başlayın.
          </p>
          <button 
            onClick={handleCreate}
            className="mt-6 text-sm font-medium text-accent-primary hover:text-accent-hover"
          >
            Kampanya oluştur &rarr;
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-surface-1 p-6 transition hover:border-accent-primary/30 hover:shadow-lg hover:shadow-accent-primary/10"
            >
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                <button 
                  onClick={() => handleEdit(campaign)}
                  className="p-2 rounded-lg bg-surface-2 hover:bg-accent-primary/10 hover:text-accent-primary text-text-tertiary transition border border-white/5"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="p-2 rounded-lg bg-surface-2 hover:bg-red-500/10 hover:text-red-400 text-text-tertiary transition border border-white/5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  campaign.status === 'ACTIVE' 
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                    : campaign.status === 'DRAFT' 
                      ? 'bg-surface-3 text-text-secondary border border-white/10' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status === 'DRAFT' ? 'Taslak' : 'Bitti'}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
              <p className="text-sm text-text-secondary line-clamp-2 mb-6 h-10">{campaign.description}</p>

              <div className="space-y-3 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Tag size={14} />
                    <span>İndirim</span>
                  </div>
                  <span className="font-bold text-accent-primary">{campaign.discount}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Users size={14} />
                    <span>Hedef</span>
                  </div>
                  <span className="font-medium text-text-secondary truncate max-w-[150px]">
                    {campaign.station ? campaign.station.name : "Tüm İstasyonlar"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-text-tertiary">
                    <Clock size={14} />
                    <span>Bitiş</span>
                  </div>
                  <span className="font-medium text-text-secondary">
                    {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('tr-TR') : "Süresiz"}
                  </span>
                </div>
              </div>
              
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-accent-primary to-accent-secondary opacity-0 transition-opacity group-hover:opacity-100"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
