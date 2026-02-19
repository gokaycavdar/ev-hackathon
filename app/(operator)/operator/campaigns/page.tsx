"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, Calendar, Users, Edit2, Trash2, X, Save, Tag, Clock, Award } from "lucide-react";
import { authFetch, unwrapResponse } from "@/lib/auth";

type Badge = {
  id: number;
  name: string;
  icon: string;
  description: string;
};

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
  targetBadges?: Badge[];
};

type Station = {
  id: number;
  name: string;
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<number[]>([]);

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
      const [resCampaigns, resStations, resBadges] = await Promise.all([
        authFetch("/api/campaigns"),
        authFetch("/api/company/my-stations"),
        authFetch("/api/badges")
      ]);

      if (resCampaigns.ok) {
        const data = await unwrapResponse<Campaign[]>(resCampaigns);
        setCampaigns(data);
      }

      if (resStations.ok) {
        const data = await unwrapResponse<{ stations?: Station[] }>(resStations);
        if (data.stations) {
          setStations(data.stations);
        }
      }

      if (resBadges.ok) {
        const data = await unwrapResponse<Badge[]>(resBadges);
        setBadges(data);
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
    setSelectedBadgeIds([]);
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
    setSelectedBadgeIds(campaign.targetBadges?.map(b => b.id) || []);
    setEditingId(campaign.id);
    setIsCreating(true);
  };

  const handleSave = async () => {
    const url = editingId ? `/api/campaigns/${editingId}` : "/api/campaigns";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await authFetch(url, {
        method,
        body: JSON.stringify({ ...formData, targetBadgeIds: selectedBadgeIds }),
      });

      if (res.ok) {
        setIsCreating(false);
        setEditingId(null);
        setSelectedBadgeIds([]);
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
      const res = await authFetch(`/api/campaigns/${id}`, { method: "DELETE" });
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
                    className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${formData.status === status
                      ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                      : "border-white/10 bg-surface-2 text-text-secondary hover:bg-surface-3"
                      }`}
                  >
                    {status === "ACTIVE" ? "Aktif" : status === "DRAFT" ? "Taslak" : "Bitti"}
                  </button>
                ))}
              </div>
            </div>

            {/* Hedef Badge Seçimi */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-2">
                <Award size={14} />
                Hedef Rozetler (Bu rozetlere sahip kullanıcılara gösterilecek)
              </label>
              <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-white/10 bg-surface-2">
                {badges.length === 0 ? (
                  <p className="text-text-tertiary text-sm">Yükleniyor...</p>
                ) : (
                  badges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => {
                        if (selectedBadgeIds.includes(badge.id)) {
                          setSelectedBadgeIds(selectedBadgeIds.filter(id => id !== badge.id));
                        } else {
                          setSelectedBadgeIds([...selectedBadgeIds, badge.id]);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${selectedBadgeIds.includes(badge.id)
                        ? "bg-purple-500/20 text-purple-300 border-2 border-purple-500"
                        : "bg-surface-3 text-text-secondary border-2 border-transparent hover:bg-surface-3/80"
                        }`}
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </button>
                  ))
                )}
              </div>
              {selectedBadgeIds.length > 0 && (
                <p className="text-xs text-purple-400">
                  {selectedBadgeIds.length} rozet seçildi - Bu kampanya sadece seçili rozetlere sahip kullanıcılara gösterilecek
                </p>
              )}
              {selectedBadgeIds.length === 0 && (
                <p className="text-xs text-text-tertiary">
                  Rozet seçmezseniz kampanya herkese gösterilecek
                </p>
              )}
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
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${campaign.status === 'ACTIVE'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : campaign.status === 'DRAFT'
                    ? 'bg-surface-3 text-text-secondary border border-white/10'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                  {campaign.status === 'ACTIVE' ? 'Aktif' : campaign.status === 'DRAFT' ? 'Taslak' : 'Bitti'}
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{campaign.title}</h3>
              <p className="text-sm text-slate-300 line-clamp-2 mb-6 h-10">{campaign.description}</p>

              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Tag size={14} />
                    <span>İndirim</span>
                  </div>
                  <span className="font-bold text-accent-primary text-lg">{campaign.discount}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Users size={14} />
                    <span>Hedef</span>
                  </div>
                  <span className="font-semibold text-white truncate max-w-[150px]">
                    {campaign.station ? campaign.station.name : "Tüm İstasyonlar"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={14} />
                    <span>Bitiş</span>
                  </div>
                  <span className="font-semibold text-white">
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
