"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Users, ArrowRight, Edit2, Trash2, X, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
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
        setStations(data.stations || []);
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
      }
    } catch (error) {
      console.error("Save failed", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      fetchCampaigns();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 text-white p-8">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Kampanya Yönetimi</h1>
          <p className="text-sm text-slate-200 mt-2">
            Sürücü davranışlarını yönlendirmek için dinamik kampanyalar oluşturun.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-semibold transition shadow-lg shadow-purple-900/20"
          >
            <Plus className="h-5 w-5" /> Yeni Kampanya
          </button>
        )}
      </header>

      {isCreating && (
        <Card className="p-6 mb-8 border-purple-500/30 bg-slate-700/80">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">{editingId ? "Kampanyayı Düzenle" : "Yeni Kampanya Oluştur"}</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-200 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Başlık</label>
              <input 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Hedef İstasyon (Opsiyonel)</label>
              <select 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.stationId ?? ""}
                onChange={e => setFormData({...formData, stationId: e.target.value ? Number(e.target.value) : null})}
              >
                <option value="">Tüm İstasyonlar</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Ekstra Coin Ödülü</label>
              <input 
                type="number"
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.coinReward}
                onChange={e => setFormData({...formData, coinReward: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs text-slate-200">Açıklama</label>
              <textarea 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                rows={2}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">İndirim / Avantaj</label>
              <input 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                placeholder="%20 İndirim"
                value={formData.discount}
                onChange={e => setFormData({...formData, discount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Bitiş Tarihi</label>
              <input 
                type="date"
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.endDate ?? ""}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-200">Durum</label>
              <select 
                className="w-full bg-slate-600 border border-slate-500 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option value="DRAFT">Taslak</option>
                <option value="ACTIVE">Aktif</option>
                <option value="ENDED">Sona Erdi</option>
              </select>
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
        <div className="text-center py-20 text-slate-200">Yükleniyor...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-slate-200 bg-slate-700/30 rounded-3xl border border-slate-600 border-dashed">
          <Megaphone className="h-10 w-10 mx-auto mb-4 opacity-20" />
          <p>Henüz kampanya oluşturulmamış.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-6 border-slate-600 bg-slate-700/60 hover:border-purple-500/30 transition group relative">
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button 
                  onClick={() => handleEdit(campaign)}
                  className="p-2 rounded-lg bg-slate-600 hover:bg-blue-600/20 hover:text-blue-400 text-slate-200 transition"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDelete(campaign.id)}
                  className="p-2 rounded-lg bg-slate-600 hover:bg-red-600/20 hover:text-red-400 text-slate-200 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${campaign.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-slate-600 text-slate-200'}`}>
                    <Megaphone className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{campaign.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                        campaign.status === 'ACTIVE' 
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                          : 'bg-slate-500 text-slate-200 border border-slate-400'
                      }`}>
                        {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status === 'DRAFT' ? 'Taslak' : 'Bitti'}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm mt-1 max-w-xl">{campaign.description}</p>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> {campaign.station ? campaign.station.name : campaign.target || "Tüm İstasyonlar"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Bitiş: {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('tr-TR') : '—'}
                      </span>
                      {campaign.coinReward && campaign.coinReward > 0 && (
                        <span className="flex items-center gap-1.5 text-yellow-400/80">
                          + {campaign.coinReward} Coin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pl-14 md:pl-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-300 uppercase tracking-wider font-medium">Avantaj</div>
                    <div className="text-xl font-bold text-purple-300">{campaign.discount}</div>
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
