"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Check, 
  ChevronRight, 
  MapPin, 
  Zap, 
  DollarSign, 
  Info, 
  BatteryCharging,
  Save
} from "lucide-react";

type StationFormData = {
  name: string;
  type: "AC" | "DC";
  power: number;
  connectorType: string;
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
    type: "DC", // Default or fetched
    power: 120, // Default or fetched
    connectorType: "CCS2", // Default or fetched
    latitude: 0,
    longitude: 0,
    address: "",
    price: 0,
  });

  useEffect(() => {
    const fetchStation = async () => {
      try {
        const res = await fetch(`/api/stations/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            name: data.name,
            type: "DC", // Mock
            power: 120, // Mock
            connectorType: "CCS2", // Mock
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
      const res = await fetch(`/api/stations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/operator/stations" 
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-semibold">İstasyonu Düzenle</h1>
          </div>
          <div className="text-sm text-slate-400">
            Adım {currentStep} / {STEPS.length}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-purple-600 transition-all duration-500 -z-10"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            ></div>
            
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isActive 
                        ? "border-purple-500 bg-purple-500/20 text-purple-400" 
                        : isCompleted 
                          ? "border-purple-500 bg-purple-500 text-white" 
                          : "border-slate-700 bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-500"}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">İstasyon Özellikleri</h2>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">İstasyon Adı</label>
                <input 
                  type="text" 
                  placeholder="Örn: Alsancak Hızlı Şarj" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Şarj Tipi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: "AC"})}
                      className={`p-3 rounded-xl border text-center transition ${
                        formData.type === "AC" 
                          ? "border-purple-500 bg-purple-500/10 text-purple-400" 
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      AC
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: "DC"})}
                      className={`p-3 rounded-xl border text-center transition ${
                        formData.type === "DC" 
                          ? "border-purple-500 bg-purple-500/10 text-purple-400" 
                          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      DC
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Güç (kW)</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
                    value={formData.power}
                    onChange={(e) => setFormData({...formData, power: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Soket Tipi</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition appearance-none"
                  value={formData.connectorType}
                  onChange={(e) => setFormData({...formData, connectorType: e.target.value})}
                >
                  <option value="Type 2">Type 2 (Mennekes)</option>
                  <option value="CCS2">CCS2</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Konum Bilgileri</h2>
              
              <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 h-48 flex items-center justify-center text-slate-500 mb-4">
                <div className="text-center">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Harita Seçimi (Simülasyon)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Enlem</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-purple-500 outline-none transition"
                    value={formData.latitude}
                    onChange={(e) => setFormData({...formData, latitude: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Boylam</label>
                  <input 
                    type="number" 
                    step="0.0001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-purple-500 outline-none transition"
                    value={formData.longitude}
                    onChange={(e) => setFormData({...formData, longitude: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Açık Adres</label>
                <textarea 
                  rows={3}
                  placeholder="Mahalle, Cadde, No..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:border-purple-500 outline-none transition resize-none"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-white mb-6">Fiyatlandırma</h2>
              
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Birim Fiyat</h3>
                    <p className="text-sm text-slate-400">kWh başına ücretlendirme</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Birim Fiyat (₺/kWh)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white text-lg font-semibold placeholder-slate-500 focus:border-purple-500 outline-none transition"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₺</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  * Bu fiyat tüm kullanıcılar için geçerli olacaktır. Kampanyalar ayrıca uygulanır.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-slate-700">
            <button 
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                currentStep === 1 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Geri
            </button>
            
            <button 
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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