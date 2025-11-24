// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed işlemi başlıyor...')

  // 1. Önce eski verileri temizle (Hata almamak için)
  // deleteMany sıralaması önemli: Önce child (bağımlı) tablolar silinmeli
  await prisma.campaign.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.station.deleteMany()
  await prisma.badge.deleteMany()
  await prisma.user.deleteMany()

  // 2. Rozetleri (Gamification) Ekle
  const badgeNight = await prisma.badge.create({
    data: { name: "Gece Kuşu", description: "Gece tarifesinde 5 şarj", icon: "🦉" }
  })

  const badgeEco = await prisma.badge.create({
    data: { name: "Eco Şampiyonu", description: "Sadece yeşil enerjili istasyonları tercih et", icon: "🌱" }
  })

  const badgeWeekend = await prisma.badge.create({
    data: { name: "Hafta Sonu Savaşçısı", description: "Hafta sonu şarj et", icon: "🏖️" }
  })

  const badgeEarlyBird = await prisma.badge.create({
    data: { name: "Erken Kalkan", description: "Sabah 06:00 - 09:00 arası şarj et", icon: "🌅" }
  })

  const badgeLongHauler = await prisma.badge.create({
    data: { name: "Uzun Yolcu", description: "Şehirlerarası istasyonlarda şarj et", icon: "🛣️" }
  })
  
  // 3. Firma Hesabı Oluştur (Operator)
  const company = await prisma.user.create({
    data: {
      name: "Zorlu Enerji",
      email: "info@zorlu.com",
      role: "OPERATOR",
    }
  })

  // 4. Sürücü Hesabı Oluştur (Driver)
  await prisma.user.create({
    data: {
      name: "Hackathon Sürücü",
      email: "driver@test.com",
      role: "DRIVER",
      coins: 150,
      xp: 500,
      badges: { connect: [{ id: badgeNight.id }, { id: badgeEco.id }, { id: badgeWeekend.id }, { id: badgeEarlyBird.id }] }
    }
  })

  // 5. İstasyonları Ekle (HARİTADA GÖRÜNECEK NOKTALAR 📍)
  await prisma.station.createMany({
    data: [
      // Manisa Merkez & Çevre
      { name: "Manisa Magnesia AVM", lat: 38.614, lng: 27.405, ownerId: company.id, price: 7.5, address: "Laleli, Magnesia AVM, Manisa", density: 85 },
      { name: "Uncubozköy Kampüs", lat: 38.625, lng: 27.420, ownerId: company.id, price: 6.0, address: "Uncubozköy, CBÜ Kampüs, Manisa", density: 40 },
      { name: "Manisa Organize Sanayi", lat: 38.580, lng: 27.350, ownerId: company.id, price: 8.5, address: "MOSB 1. Kısım, Manisa", density: 90 },
      { name: "Manisa Prime AVM", lat: 38.618, lng: 27.412, ownerId: company.id, price: 7.8, address: "Güzelyurt, Manisa Prime, Manisa", density: 65 },
      { name: "Spil Dağı Milli Parkı", lat: 38.550, lng: 27.450, ownerId: company.id, price: 9.5, address: "Spil Dağı Zirve Yolu, Manisa", density: 10 },
      { name: "Manisa Şehir Hastanesi", lat: 38.605, lng: 27.380, ownerId: company.id, price: 6.5, address: "Adnan Menderes, Şehir Hastanesi, Manisa", density: 75 },
      { name: "Muradiye Kampüs", lat: 38.650, lng: 27.320, ownerId: company.id, price: 5.5, address: "Muradiye, CBÜ Kampüs, Manisa", density: 30 },
      { name: "Saruhanlı Merkez", lat: 38.730, lng: 27.570, ownerId: company.id, price: 7.0, address: "Saruhanlı Meydan, Manisa", density: 20 },
      { name: "Turgutlu Otoyol Çıkışı", lat: 38.490, lng: 27.700, ownerId: company.id, price: 8.0, address: "Turgutlu E-96 Karayolu, Manisa", density: 50 },
      { name: "Akhisar Novada", lat: 38.920, lng: 27.830, ownerId: company.id, price: 7.5, address: "Akhisar Çevre Yolu, Manisa", density: 60 },
      
      // İzmir & Çevre (Referans noktaları)
      { name: "İzmir Bornova DC", lat: 38.460, lng: 27.220, ownerId: company.id, price: 9.0, address: "Bornova Merkez, İzmir", density: 95 },
      { name: "Alsancak Liman", lat: 38.435, lng: 27.150, ownerId: company.id, price: 10.0, address: "Alsancak Liman Cad., İzmir", density: 80 },
    ]
  })

  console.log('✅ Veriler başarıyla yüklendi! Harita hazır.')
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })