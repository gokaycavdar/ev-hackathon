"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  MapPin, 
  DollarSign, 
  Info, 
  Save
} from "lucide-react";
import { authFetch, unwrapResponse } from "@/lib/auth";

type StationFormData = {
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  price: number;
};

const STEPS = [
  { id: 1, title: "Temel Bilgiler", icon: Info },
  { id: 2, title: "Konum", icon: MapPin },
  { id: 3, title: "Fiyatlandırma", icon: DollarSign },
];

export default function EditStationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<StationFormData>({
    name: "",
    latitude: 0,
    longitude: 0,
    address: "",
    price: 0,
  });

  useEffect(() => {
    const fetchStation = async () => {
      try {
        const res = await authFetch(`/api/stations/${id}`);
        if (res.ok) {
          const data = await unwrapResponse<{ name: string; lat: number; lng: number; address?: string; price: number }>(res);
          setFormData({
            name: data.name,
            latitude: data.lat,
            longitude: data.lng,
            address: data.address || "",
            price: data.price,
          });
        }
      } catch (error) {
        console.error("Failed to fetch station", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchStation();
    }
  }, [id]);

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/stations/${id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/operator/stations");
      } else {
        alert("İstasyon güncellenirken bir hata oluştu.");
      }
    } catch (error) {
      console.error("Failed to update station", error);
      alert("Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-bg flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-bg text-primary font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-surface-1/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/operator/stations" 
              className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-semibold text-white">İstasyonu Düzenle</h1>
          </div>
          <div className="text-sm text-text-secondary">
            Adım {currentStep} / {STEPS.length}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-2 -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-accent-primary transition-all duration-500 -z-10"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>
            
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-primary-bg px-2">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isActive 
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary" 
                        : isCompleted 
                          ? "border-accent-primary bg-accent-primary text-white" 
                          : "border-surface-2 bg-surface-1 text-text-tertiary"
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-accent-primary" : "text-text-tertiary"}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="glass-card rounded-2xl p-8">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">İstasyon Özellikleri</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">İstasyon Adı</label>
                <input 
                  type="text" 
                  placeholder="Örn: Alsancak Hızlı Şarj" 
                  className="w-full bg-surface-2 border border-white/10 rounded-xl p-4 text-white placeholder-text-tertiary focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-none transition"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Konum Bilgileri</h2>
              
              <div className="bg-surface-2 rounded-xl border border-white/10 p-4 h-48 flex items-center justify-center text-text-tertiary mb-4">
                <div className="text-center">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Harita Seçimi (Simülasyon)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Enlem</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    className="w-full bg-surface-2 border border-white/10 rounded-xl p-4 text-white placeholder-text-tertiary focus:border-accent-primary outline-none transition"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Boylam</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    className="w-full bg-surface-2 border border-white/10 rounded-xl p-4 text-white placeholder-text-tertiary focus:border-accent-primary outline-none transition"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Açık Adres</label>
                <textarea 
                  rows={3}
                  placeholder="Mahalle, Cadde, No..." 
                  className="w-full bg-surface-2 border border-white/10 rounded-xl p-4 text-white placeholder-text-tertiary focus:border-accent-primary outline-none transition resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Fiyatlandırma</h2>
              
              <div className="p-6 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent-primary/20 text-accent-primary">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Birim Fiyat</h3>
                    <p className="text-sm text-text-secondary">kWh başına ücretlendirme</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Birim Fiyat (₺/kWh)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full bg-surface-2 border border-white/10 rounded-xl p-4 pl-12 text-white text-lg font-semibold placeholder-text-tertiary focus:border-accent-primary outline-none transition"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-semibold">₺</span>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  * Bu fiyat tüm kullanıcılar için geçerli olacaktır. Kampanyalar ayrıca uygulanır.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
            <button 
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                currentStep === 1 
                  ? "text-text-tertiary cursor-not-allowed" 
                  : "text-text-secondary hover:bg-surface-2 hover:text-white"
              }`}
            >
              Geri
            </button>
            
            <button 
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-accent-primary text-white font-semibold hover:bg-accent-hover transition shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Kaydediliyor...
                </>
              ) : currentStep === STEPS.length ? (
                <>
                  <Save size={18} />
                  Kaydet
                </>
              ) : (
                <>
                  Devam Et
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}