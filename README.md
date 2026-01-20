# 🚗⚡ SmartCharge AI - EV Şarj İstasyonu Yönetim Platformu

> **Hackathon MVP** - AI destekli yeşil enerji slot önerileri, oyunlaştırılmış ödül sistemi ve operatör dashboard'u ile elektrikli araç şarj deneyimi.

## 🎯 Özellikler

### Sürücü Özellikleri
- 🗺️ **Interaktif Harita**: Leaflet ile gerçek zamanlı istasyon görünümü
- 🤖 **AI Asistan**: OpenAI tabanlı akıllı şarj önerileri
- 🌱 **Yeşil Enerji**: CO2 tasarrufu ve bonus coin kazanımı
- 🏆 **Gamification**: XP, rozet ve liderlik tablosu sistemi
- 📅 **Rezervasyon**: Saatlik slot bazlı rezervasyon
- 💰 **Dijital Cüzdan**: Coin sistemi ile ödül kazanma

### Operatör Özellikleri
- 📊 **Analytics Dashboard**: Gelir, kullanım ve CO2 istatistikleri
- 🎯 **Kampanya Yönetimi**: İndirim ve bonus coin kampanyaları
- 🔧 **İstasyon Yönetimi**: CRUD operasyonları
- 📈 **Yük Analizi**: 24 saatlik yük eğrileri

## 🛠️ Teknoloji Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: TailwindCSS
- **Maps**: Leaflet + React Leaflet
- **AI**: OpenAI API
- **Container**: Docker + Docker Compose

## 📋 Gereksinimler

- Node.js 20+
- Docker & Docker Compose
- npm/yarn/pnpm

## 🚀 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone <repo-url>
cd ev-hackathon
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment Ayarları
```bash
# .env dosyasını oluşturun
cp .env.example .env

# .env dosyasını düzenleyin:
# DATABASE_URL="postgresql://admin:admin@localhost:5432/evcharge?schema=public"
# OPENAI_API_KEY="your-api-key-here"
```

### 4. Database Kurulumu
```bash
# PostgreSQL container'ı başlatın
docker-compose up -d

# Prisma migration
npx prisma migrate dev --name init

# Seed data yükleyin (Manisa ve İzmir istasyonları)
npx prisma db seed
```

### 5. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) adresini tarayıcınızda açın.

## 👥 Demo Kullanıcılar

Sisteme giriş yapmak için:

| Rol | Email | Açıklama |
|-----|-------|----------|
| Sürücü | `driver@test.com` | Rezervasyon yapabilir, AI asistanı kullanabilir |
| Operatör | `info@zorlu.com` | İstasyon ve kampanya yönetimi |

> **Not**: Mevcut sistemde şifre kontrolü yok, sadece email ile giriş yapılıyor.

## 📁 Proje Yapısı

```
ev-hackathon/
├── app/
│   ├── (auth)/              # Giriş sayfası
│   ├── (driver)/            # Sürücü dashboard
│   ├── (operator)/          # Operatör dashboard
│   └── api/                 # Backend API routes
├── components/
│   ├── ChatWidget.tsx       # AI asistan widget
│   ├── Map.tsx              # Leaflet harita
│   └── ui/                  # UI bileşenleri
├── lib/
│   ├── prisma.ts            # Prisma client
│   ├── utils-ai.ts          # Sürücü utils
│   └── utils-operator-ai.ts # Operatör utils
├── prisma/
│   ├── schema.prisma        # Database şeması
│   └── seed.ts              # Seed data
└── docker-compose.yml       # PostgreSQL config
```

## 🔧 Prisma Komutları

```bash
# Studio (GUI)
npx prisma studio

# Schema değişikliği sonrası migration
npx prisma migrate dev --name migration_name

# Client yeniden oluşturma
npx prisma generate

# Database sıfırlama + seed
npx prisma migrate reset
```

## 🗺️ Seed Data

Seed scripti şu istasyonları içerir:
- **Manisa**: ~40 istasyon (Merkez, OSB, kampüs, AVM'ler)
- **İzmir**: 2 referans istasyon
- **Rozetler**: 5 farklı oyunlaştırma rozeti
- **Demo Kullanıcılar**: Sürücü ve operatör hesapları

## 📊 Database Şeması

### Temel Modeller
- **User**: Kullanıcılar (Sürücü/Operatör), coins, XP, CO2 tasarrufu
- **Station**: Şarj istasyonları, konum, fiyat, yoğunluk
- **Reservation**: Rezervasyonlar, yeşil enerji, kazanılan ödüller
- **Campaign**: İndirim kampanyaları, bonus coinler
- **Badge**: Gamification rozetleri

## ⚠️ Geliştirme Notları

Bu proje **hackathon MVP** seviyesindedir. Production kullanımı için:

1. **Güvenlik**: Password hash, JWT, session management
2. **Mock Data**: Gerçek IoT/Grid API entegrasyonu
3. **OpenAI**: AI chat tam entegrasyonu
4. **Testing**: Unit, integration, E2E testleri
5. **Monitoring**: Error tracking, analytics

Detaylı geliştirme planı için: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)

## 🐛 Bilinen Sorunlar

- [ ] Şifresiz giriş (sadece email)
- [ ] Mock data kullanımı (gelir, yük eğrileri)
- [ ] OpenAI API entegrasyonu tamamlanmadı
- [ ] Rate limiting yok
- [ ] Input validation eksik

## 📚 Kaynaklar

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

## 📄 Lisans

Bu proje hackathon amaçlı geliştirilmiştir.
