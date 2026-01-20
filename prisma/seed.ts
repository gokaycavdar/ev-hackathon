// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  // Şifreleri hash'le
  const defaultPassword = await bcrypt.hash('demo123', 10)

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
      password: defaultPassword,
      role: "OPERATOR",
    }
  })

  // 4. Sürücü Hesabı Oluştur (Driver)
  await prisma.user.create({
    data: {
      name: "Hackathon Sürücü",
      email: "driver@test.com",
      password: defaultPassword,
      role: "DRIVER",
      badges: { connect: [{ id: badgeNight.id }, { id: badgeEco.id }, { id: badgeWeekend.id }, { id: badgeEarlyBird.id }] }
    }
  })

  console.log('📝 Demo kullanıcılar oluşturuldu:')
  console.log('   Sürücü: driver@test.com / demo123')
  console.log('   Operatör: info@zorlu.com / demo123')

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
      { name: "Manisa Garaj", lat: 38.610, lng: 27.430, ownerId: company.id, price: 6.8, address: "Yeni Garaj, Manisa", density: 55 },
      { name: "Manisa Valilik", lat: 38.612, lng: 27.425, ownerId: company.id, price: 7.2, address: "Hükümet Konağı, Manisa", density: 45 },
      { name: "Manisa 19 Mayıs Stadyumu", lat: 38.616, lng: 27.418, ownerId: company.id, price: 6.5, address: "Stadyum Çevresi, Manisa", density: 35 },
      { name: "Manisa Celal Bayar Hastanesi", lat: 38.628, lng: 27.422, ownerId: company.id, price: 6.2, address: "Hastane Otoparkı, Manisa", density: 70 },
      { name: "Manisa Kenan Evren Sanayi", lat: 38.600, lng: 27.390, ownerId: company.id, price: 7.0, address: "Sanayi Sitesi, Manisa", density: 80 },
      { name: "Manisa Tarzan Meydanı", lat: 38.613, lng: 27.426, ownerId: company.id, price: 7.3, address: "Tarzan Meydanı, Manisa", density: 60 },
      { name: "Manisa 45 Park AVM", lat: 38.620, lng: 27.395, ownerId: company.id, price: 7.6, address: "Güzelyurt, 45 Park, Manisa", density: 50 },
      { name: "Manisa Yunusemre Belediyesi", lat: 38.615, lng: 27.400, ownerId: company.id, price: 6.9, address: "Yunusemre, Manisa", density: 40 },
      { name: "Manisa Şehzadeler Belediyesi", lat: 38.611, lng: 27.428, ownerId: company.id, price: 6.9, address: "Şehzadeler, Manisa", density: 45 },
      { name: "Manisa Tren Garı", lat: 38.608, lng: 27.432, ownerId: company.id, price: 6.5, address: "İstasyon Cad., Manisa", density: 30 },
      { name: "Manisa OSB 2. Kısım", lat: 38.590, lng: 27.340, ownerId: company.id, price: 8.2, address: "MOSB 2. Kısım, Manisa", density: 85 },
      { name: "Manisa OSB 3. Kısım", lat: 38.570, lng: 27.330, ownerId: company.id, price: 8.0, address: "MOSB 3. Kısım, Manisa", density: 75 },
      { name: "Manisa OSB 4. Kısım", lat: 38.560, lng: 27.320, ownerId: company.id, price: 7.8, address: "MOSB 4. Kısım, Manisa", density: 65 },
      { name: "Manisa OSB 5. Kısım", lat: 38.550, lng: 27.310, ownerId: company.id, price: 7.5, address: "MOSB 5. Kısım, Manisa", density: 55 },
      { name: "Manisa Muradiye Sanayi", lat: 38.640, lng: 27.330, ownerId: company.id, price: 6.8, address: "Muradiye Sanayi, Manisa", density: 45 },
      { name: "Manisa Horozköy Garı", lat: 38.630, lng: 27.400, ownerId: company.id, price: 6.2, address: "Horozköy, Manisa", density: 35 },
      { name: "Manisa Barbaros Mahallesi", lat: 38.620, lng: 27.410, ownerId: company.id, price: 6.5, address: "Barbaros, Manisa", density: 40 },
      { name: "Manisa Kuşlubahçe", lat: 38.615, lng: 27.420, ownerId: company.id, price: 6.7, address: "Kuşlubahçe, Manisa", density: 50 },
      { name: "Manisa Spil Yolu Girişi", lat: 38.605, lng: 27.435, ownerId: company.id, price: 7.0, address: "Karaköy, Manisa", density: 25 },
      { name: "Manisa Akgedik TOKİ", lat: 38.680, lng: 27.400, ownerId: company.id, price: 6.0, address: "Akgedik, Manisa", density: 20 },
      { name: "Manisa Gürle", lat: 38.660, lng: 27.380, ownerId: company.id, price: 6.3, address: "Gürle, Manisa", density: 15 },
      { name: "Manisa Karaoğlanlı", lat: 38.580, lng: 27.480, ownerId: company.id, price: 6.5, address: "Karaoğlanlı, Manisa", density: 10 },
      { name: "Manisa Sancaklıbozköy", lat: 38.550, lng: 27.520, ownerId: company.id, price: 6.8, address: "Sancaklıbozköy, Manisa", density: 12 },
      { name: "Manisa Aşağıçobanisa", lat: 38.520, lng: 27.580, ownerId: company.id, price: 7.0, address: "Aşağıçobanisa, Manisa", density: 18 },
      { name: "Manisa Hamzabeyli", lat: 38.500, lng: 27.620, ownerId: company.id, price: 7.2, address: "Hamzabeyli, Manisa", density: 22 },
      { name: "Manisa Nurlupınar", lat: 38.600, lng: 27.440, ownerId: company.id, price: 6.6, address: "Nurlupınar, Manisa", density: 55 },
      { name: "Manisa Alaybey", lat: 38.610, lng: 27.435, ownerId: company.id, price: 6.9, address: "Alaybey, Manisa", density: 60 },
      { name: "Manisa Malta Parkı", lat: 38.625, lng: 27.415, ownerId: company.id, price: 7.1, address: "Malta, Manisa", density: 45 },
      { name: "Manisa Uncubozköy Meydan", lat: 38.630, lng: 27.425, ownerId: company.id, price: 7.4, address: "Uncubozköy, Manisa", density: 70 },
      { name: "Manisa Laleli Parkı", lat: 38.618, lng: 27.408, ownerId: company.id, price: 7.3, address: "Laleli, Manisa", density: 80 },
      { name: "Manisa Mesir Tabiat Parkı", lat: 38.622, lng: 27.410, ownerId: company.id, price: 7.5, address: "Mesir, Manisa", density: 65 },
      { name: "Manisa Kent Park", lat: 38.612, lng: 27.415, ownerId: company.id, price: 7.2, address: "Kent Park, Manisa", density: 75 },
      { name: "Manisa Ulupark", lat: 38.614, lng: 27.428, ownerId: company.id, price: 7.0, address: "Ulupark, Manisa", density: 85 },
      { name: "Manisa Fatih Parkı", lat: 38.610, lng: 27.430, ownerId: company.id, price: 6.8, address: "Fatih Parkı, Manisa", density: 50 },

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