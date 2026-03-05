package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"smartcharge-api/db/generated"
)

// ========================================
// LINEAR REGRESSION DENSITY FORECASTING
// (Pure Go math — no external library)
// ========================================

type profileConfig struct {
	baseLoad       float64
	peakMultiplier float64
	variance       float64
}

var profiles = map[string]profileConfig{
	"central":  {baseLoad: 50, peakMultiplier: 1.8, variance: 15},
	"suburban": {baseLoad: 35, peakMultiplier: 1.5, variance: 12},
	"outskirt": {baseLoad: 20, peakMultiplier: 1.3, variance: 8},
}

type mockDataPoint struct {
	day       int
	dayOfWeek int
	hour      int
	load      float64
}

// generateTwoMonthMockData creates 60 days × 24 hours of simulated load data.
func generateTwoMonthMockData(profile string) []mockDataPoint {
	cfg := profiles[profile]
	var data []mockDataPoint

	for day := 0; day < 60; day++ {
		dayOfWeek := day % 7 // 0-6 (Mon-Sun)
		isWeekend := dayOfWeek >= 5

		for hour := 0; hour < 24; hour++ {
			load := cfg.baseLoad

			// Hour-based patterns
			if hour >= 7 && hour <= 9 {
				// Morning peak (commute)
				if isWeekend {
					load *= 1.1
				} else {
					load *= cfg.peakMultiplier
				}
			} else if hour >= 12 && hour <= 14 {
				// Lunch
				load *= 1.3
			} else if hour >= 17 && hour <= 20 {
				// Evening peak (commute home)
				if isWeekend {
					load *= 1.2
				} else {
					load *= cfg.peakMultiplier
				}
			} else if hour >= 22 || hour < 6 {
				// Night (low)
				load *= 0.4
			}

			// Weekend adjustment
			if isWeekend {
				load *= 0.85
			}

			// Random variance
			variance := (rand.Float64() - 0.5) * cfg.variance
			load = math.Min(100, math.Max(0, load+variance))

			// Time trend (some stations become more popular over time)
			direction := 1.0
			if rand.Float64() <= 0.5 {
				direction = -1.0
			}
			trendFactor := 1 + (float64(day)/60.0)*0.1*direction
			load = math.Min(100, math.Max(0, load*trendFactor))

			data = append(data, mockDataPoint{
				day:       day,
				dayOfWeek: dayOfWeek,
				hour:      hour,
				load:      math.Round(load),
			})
		}
	}

	return data
}

type weeklyForecast struct {
	dayOfWeek     int
	hour          int
	predictedLoad int
}

// linearRegression computes slope (m) and intercept (b) for y = mx + b.
func linearReg(points [][2]float64) (m, b float64) {
	n := float64(len(points))
	if n == 0 {
		return 0, 0
	}

	var sumX, sumY, sumXY, sumXX float64
	for _, p := range points {
		sumX += p[0]
		sumY += p[1]
		sumXY += p[0] * p[1]
		sumXX += p[0] * p[0]
	}

	denom := n*sumXX - sumX*sumX
	if denom == 0 {
		return 0, sumY / n
	}

	m = (n*sumXY - sumX*sumY) / denom
	b = (sumY - m*sumX) / n
	return m, b
}

// linearRegressionToWeekly applies per (dayOfWeek, hour) linear regression to predict next week.
func linearRegressionToWeekly(mockData []mockDataPoint) []weeklyForecast {
	var forecasts []weeklyForecast

	for dayOfWeek := 0; dayOfWeek < 7; dayOfWeek++ {
		for hour := 0; hour < 24; hour++ {
			// Filter samples for this dayOfWeek + hour
			var samples []mockDataPoint
			for _, d := range mockData {
				if d.dayOfWeek == dayOfWeek && d.hour == hour {
					samples = append(samples, d)
				}
			}

			if len(samples) < 2 {
				// Not enough data, use average
				sum := 0.0
				for _, s := range samples {
					sum += s.load
				}
				avg := sum / float64(len(samples))
				forecasts = append(forecasts, weeklyForecast{
					dayOfWeek:     dayOfWeek,
					hour:          hour,
					predictedLoad: int(math.Round(avg)),
				})
				continue
			}

			// Build regression data: [[idx, load], ...]
			points := make([][2]float64, len(samples))
			for i, s := range samples {
				points[i] = [2]float64{float64(i), s.load}
			}

			m, b := linearReg(points)

			// Predict for next week (index = len(samples))
			predicted := m*float64(len(samples)) + b

			// Clamp 0-100
			bounded := math.Min(100, math.Max(0, math.Round(predicted)))

			forecasts = append(forecasts, weeklyForecast{
				dayOfWeek:     dayOfWeek,
				hour:          hour,
				predictedLoad: int(bounded),
			})
		}
	}

	return forecasts
}

// calculateAverageDensity computes mean predictedLoad from forecasts.
func calculateAverageDensity(forecasts []weeklyForecast) int {
	if len(forecasts) == 0 {
		return 50
	}
	sum := 0
	for _, f := range forecasts {
		sum += f.predictedLoad
	}
	return int(math.Round(float64(sum) / float64(len(forecasts))))
}

// Station seed data
type stationSeed struct {
	name           string
	lat            float64
	lng            float64
	price          float64
	address        string
	density        int
	densityProfile string
}

var stationSeeds = []stationSeed{
	// Manisa Merkez & Çevre
	{"Manisa Magnesia AVM", 38.614, 27.405, 7.5, "Laleli, Magnesia AVM, Manisa", 85, "central"},
	{"Uncubozköy Kampüs", 38.625, 27.420, 6.0, "Uncubozköy, CBÜ Kampüs, Manisa", 40, "suburban"},
	{"Manisa Organize Sanayi", 38.580, 27.350, 8.5, "MOSB 1. Kısım, Manisa", 90, "central"},
	{"Manisa Prime AVM", 38.618, 27.412, 7.8, "Güzelyurt, Manisa Prime, Manisa", 65, "suburban"},
	{"Spil Dağı Milli Parkı", 38.550, 27.450, 9.5, "Spil Dağı Zirve Yolu, Manisa", 10, "outskirt"},
	{"Manisa Şehir Hastanesi", 38.605, 27.380, 6.5, "Adnan Menderes, Şehir Hastanesi, Manisa", 75, "central"},
	{"Muradiye Kampüs", 38.650, 27.320, 5.5, "Muradiye, CBÜ Kampüs, Manisa", 30, "outskirt"},
	{"Saruhanlı Merkez", 38.730, 27.570, 7.0, "Saruhanlı Meydan, Manisa", 20, "outskirt"},
	{"Turgutlu Otoyol Çıkışı", 38.490, 27.700, 8.0, "Turgutlu E-96 Karayolu, Manisa", 50, "suburban"},
	{"Akhisar Novada", 38.920, 27.830, 7.5, "Akhisar Çevre Yolu, Manisa", 60, "suburban"},
	{"Manisa Garaj", 38.610, 27.430, 6.8, "Yeni Garaj, Manisa", 55, "suburban"},
	{"Manisa Valilik", 38.612, 27.425, 7.2, "Hükümet Konağı, Manisa", 45, "suburban"},
	{"Manisa 19 Mayıs Stadyumu", 38.616, 27.418, 6.5, "Stadyum Çevresi, Manisa", 35, "outskirt"},
	{"Manisa Celal Bayar Hastanesi", 38.628, 27.422, 6.2, "Hastane Otoparkı, Manisa", 70, "central"},
	{"Manisa Kenan Evren Sanayi", 38.600, 27.390, 7.0, "Sanayi Sitesi, Manisa", 80, "central"},
	{"Manisa Tarzan Meydanı", 38.613, 27.426, 7.3, "Tarzan Meydanı, Manisa", 60, "suburban"},
	{"Manisa 45 Park AVM", 38.620, 27.395, 7.6, "Güzelyurt, 45 Park, Manisa", 50, "suburban"},
	{"Manisa Yunusemre Belediyesi", 38.615, 27.400, 6.9, "Yunusemre, Manisa", 40, "suburban"},
	{"Manisa Şehzadeler Belediyesi", 38.611, 27.428, 6.9, "Şehzadeler, Manisa", 45, "suburban"},
	{"Manisa Tren Garı", 38.608, 27.432, 6.5, "İstasyon Cad., Manisa", 30, "outskirt"},
	{"Manisa OSB 2. Kısım", 38.590, 27.340, 8.2, "MOSB 2. Kısım, Manisa", 85, "central"},
	{"Manisa OSB 3. Kısım", 38.570, 27.330, 8.0, "MOSB 3. Kısım, Manisa", 75, "central"},
	{"Manisa OSB 4. Kısım", 38.560, 27.320, 7.8, "MOSB 4. Kısım, Manisa", 65, "suburban"},
	{"Manisa OSB 5. Kısım", 38.550, 27.310, 7.5, "MOSB 5. Kısım, Manisa", 55, "suburban"},
	{"Manisa Muradiye Sanayi", 38.640, 27.330, 6.8, "Muradiye Sanayi, Manisa", 45, "suburban"},
	{"Manisa Horozköy Garı", 38.630, 27.400, 6.2, "Horozköy, Manisa", 35, "outskirt"},
	{"Manisa Barbaros Mahallesi", 38.620, 27.410, 6.5, "Barbaros, Manisa", 40, "suburban"},
	{"Manisa Kuşlubahçe", 38.615, 27.420, 6.7, "Kuşlubahçe, Manisa", 50, "suburban"},
	{"Manisa Spil Yolu Girişi", 38.605, 27.435, 7.0, "Karaköy, Manisa", 25, "outskirt"},
	{"Manisa Akgedik TOKİ", 38.680, 27.400, 6.0, "Akgedik, Manisa", 20, "outskirt"},
	{"Manisa Gürle", 38.660, 27.380, 6.3, "Gürle, Manisa", 15, "outskirt"},
	{"Manisa Karaoğlanlı", 38.580, 27.480, 6.5, "Karaoğlanlı, Manisa", 10, "outskirt"},
	{"Manisa Sancaklıbozköy", 38.550, 27.520, 6.8, "Sancaklıbozköy, Manisa", 12, "outskirt"},
	{"Manisa Aşağıçobanisa", 38.520, 27.580, 7.0, "Aşağıçobanisa, Manisa", 18, "outskirt"},
	{"Manisa Hamzabeyli", 38.500, 27.620, 7.2, "Hamzabeyli, Manisa", 22, "outskirt"},
	{"Manisa Nurlupınar", 38.600, 27.440, 6.6, "Nurlupınar, Manisa", 55, "suburban"},
	{"Manisa Alaybey", 38.610, 27.435, 6.9, "Alaybey, Manisa", 60, "suburban"},
	{"Manisa Malta Parkı", 38.625, 27.415, 7.1, "Malta, Manisa", 45, "suburban"},
	{"Manisa Uncubozköy Meydan", 38.630, 27.425, 7.4, "Uncubozköy, Manisa", 70, "central"},
	{"Manisa Laleli Parkı", 38.618, 27.408, 7.3, "Laleli, Manisa", 80, "central"},
	{"Manisa Mesir Tabiat Parkı", 38.622, 27.410, 7.5, "Mesir, Manisa", 65, "suburban"},
	{"Manisa Kent Park", 38.612, 27.415, 7.2, "Kent Park, Manisa", 75, "central"},
	{"Manisa Ulupark", 38.614, 27.428, 7.0, "Ulupark, Manisa", 85, "central"},
	{"Manisa Fatih Parkı", 38.610, 27.430, 6.8, "Fatih Parkı, Manisa", 50, "suburban"},
	// İzmir & Çevre (Reference points)
	{"İzmir Bornova DC", 38.460, 27.220, 9.0, "Bornova Merkez, İzmir", 95, "central"},
	{"Alsancak Liman", 38.435, 27.150, 10.0, "Alsancak Liman Cad., İzmir", 80, "central"},
}

// Badge seed data
type badgeSeed struct {
	name        string
	description string
	icon        string
}

var badgeSeeds = []badgeSeed{
	{"Gece Kuşu", "Gece tarifesinde 5 şarj", "🦉"},
	{"Eco Şampiyonu", "Sadece yeşil enerjili istasyonları tercih et", "🌱"},
	{"Hafta Sonu Savaşçısı", "Hafta sonu şarj et", "🏖️"},
	{"Erken Kalkan", "Sabah 06:00 - 09:00 arası şarj et", "🌅"},
	{"Uzun Yolcu", "Şehirlerarası istasyonlarda şarj et", "🛣️"},
}

// Badge criteria seed data (must match badgeSeeds order)
type badgeCriteriaSeed struct {
	metric    string
	threshold int
}

var badgeCriteriaSeeds = []badgeCriteriaSeed{
	{"night_charges", 5},     // Gece Kuşu
	{"green_charges", 10},    // Eco Şampiyonu
	{"weekend_charges", 5},   // Hafta Sonu Savaşçısı
	{"morning_charges", 5},   // Erken Kalkan
	{"intercity_charges", 3}, // Uzun Yolcu
}

// Campaign seed data
type campaignSeed struct {
	title       string
	description string
	target      string
	discount    string
	coinReward  int32
	endDate     time.Time
	badgeIndex  int // index into badgeSeeds/badgeIDs
}

var campaignSeeds = []campaignSeed{
	{
		title:       "Gece Kuşu Özel - %20 İndirim",
		description: "Gece 22:00 - 06:00 arası şarj et, %20 indirim kazan!",
		target:      "Gece Kuşu badge'ine sahip kullanıcılar",
		discount:    "%20",
		coinReward:  100,
		endDate:     time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		badgeIndex:  0, // Gece Kuşu
	},
	{
		title:       "Eco Fırsat - 2x Coin",
		description: "Yeşil enerjili istasyonlarda şarj et, 2 kat coin kazan!",
		target:      "Eco Şampiyonu badge'ine sahip kullanıcılar",
		discount:    "2x Coin",
		coinReward:  200,
		endDate:     time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC),
		badgeIndex:  1, // Eco Şampiyonu
	},
	{
		title:       "Hafta Sonu Kaçamağı - Ücretsiz İlk Saat",
		description: "Hafta sonu şarj etmeyi seven sürücülere özel!",
		target:      "Hafta Sonu Savaşçısı badge'ine sahip kullanıcılar",
		discount:    "İlk saat ücretsiz",
		coinReward:  75,
		endDate:     time.Date(2026, 2, 15, 0, 0, 0, 0, time.UTC),
		badgeIndex:  2, // Hafta Sonu Savaşçısı
	},
	{
		title:       "Erken Kalkan Yol Alır - %15 İndirim",
		description: "Sabah 06:00 - 09:00 arası şarj et, %15 indirim!",
		target:      "Erken Kalkan badge'ine sahip kullanıcılar",
		discount:    "%15",
		coinReward:  50,
		endDate:     time.Date(2026, 3, 15, 0, 0, 0, 0, time.UTC),
		badgeIndex:  3, // Erken Kalkan
	},
}

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable"
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	queries := generated.New(pool)

	fmt.Println("Seed islemi basliyor...")

	// 1. Clean existing data (order matters: children first)
	fmt.Println("Cleaning existing data...")
	pool.Exec(ctx, "DELETE FROM station_density_forecasts")
	pool.Exec(ctx, "DELETE FROM campaign_target_badges")
	pool.Exec(ctx, "DELETE FROM campaigns")
	pool.Exec(ctx, "DELETE FROM reservations")
	pool.Exec(ctx, "DELETE FROM user_badges")
	pool.Exec(ctx, "DELETE FROM stations")
	pool.Exec(ctx, "DELETE FROM badges")
	pool.Exec(ctx, "DELETE FROM users")

	// 2. Create badges
	fmt.Println("Creating badges...")
	badgeIDs := make([]int32, len(badgeSeeds))
	for i, bs := range badgeSeeds {
		badge, err := queries.CreateBadge(ctx, generated.CreateBadgeParams{
			Name:        bs.name,
			Description: bs.description,
			Icon:        bs.icon,
		})
		if err != nil {
			log.Fatalf("Failed to create badge %q: %v", bs.name, err)
		}
		badgeIDs[i] = badge.ID
	}

	// 2b. Seed badge criteria
	fmt.Println("Seeding badge criteria...")
	pool.Exec(ctx, "DELETE FROM badge_progress")
	pool.Exec(ctx, "DELETE FROM badge_criteria")
	for i, bc := range badgeCriteriaSeeds {
		_, err := pool.Exec(ctx,
			"INSERT INTO badge_criteria (badge_id, metric, threshold, time_window) VALUES ($1, $2, $3, 'all_time') ON CONFLICT (badge_id, metric) DO NOTHING",
			badgeIDs[i], bc.metric, bc.threshold,
		)
		if err != nil {
			log.Fatalf("Failed to seed badge criteria for badge %d: %v", badgeIDs[i], err)
		}
	}

	// 3. Create operator users
	fmt.Println("Creating users...")
	defaultPassword, err := bcrypt.GenerateFromPassword([]byte("demo123"), 10)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	company, err := queries.CreateUser(ctx, generated.CreateUserParams{
		Name:     "Zorlu Enerji",
		Email:    "info@zorlu.com",
		Password: string(defaultPassword),
		Role:     "OPERATOR",
	})
	if err != nil {
		log.Fatalf("Failed to create operator user: %v", err)
	}

	_, err = queries.CreateUser(ctx, generated.CreateUserParams{
		Name:     "Eşarj A.Ş.",
		Email:    "info@esarj.com",
		Password: string(defaultPassword),
		Role:     "OPERATOR",
	})
	if err != nil {
		log.Fatalf("Failed to create operator user Eşarj: %v", err)
	}

	_, err = queries.CreateUser(ctx, generated.CreateUserParams{
		Name:     "Sharz.net",
		Email:    "info@sharz.net",
		Password: string(defaultPassword),
		Role:     "OPERATOR",
	})
	if err != nil {
		log.Fatalf("Failed to create operator user Sharz.net: %v", err)
	}

	// 4. Create driver users with varied stats
	type driverSeed struct {
		name  string
		email string
		coins int32
		co2   float64
		xp    int32
	}

	driverSeeds := []driverSeed{
		{"Hackathon Sürücü", "driver@test.com", 850, 42.5, 2100},
		{"Ayşe Yılmaz", "ayse@test.com", 1200, 60.0, 3200},
		{"Mehmet Kaya", "mehmet@test.com", 650, 32.5, 1800},
		{"Zeynep Demir", "zeynep@test.com", 2500, 125.0, 5500},
		{"Ali Çelik", "ali@test.com", 400, 20.0, 1200},
		{"Fatma Öztürk", "fatma@test.com", 1800, 90.0, 4100},
		{"Emre Arslan", "emre@test.com", 300, 15.0, 900},
		{"Selin Koç", "selin@test.com", 950, 47.5, 2400},
		{"Burak Şahin", "burak@test.com", 1500, 75.0, 3800},
		{"Deniz Aydın", "deniz@test.com", 550, 27.5, 1500},
	}

	var driverID int32
	for i, ds := range driverSeeds {
		user, err := queries.CreateUser(ctx, generated.CreateUserParams{
			Name:     ds.name,
			Email:    ds.email,
			Password: string(defaultPassword),
			Role:     "DRIVER",
		})
		if err != nil {
			log.Fatalf("Failed to create driver user %q: %v", ds.name, err)
		}

		// Set initial stats
		if ds.coins > 0 || ds.xp > 0 {
			_, err = queries.UpdateUserStats(ctx, generated.UpdateUserStatsParams{
				ID:       user.ID,
				Coins:    ds.coins,
				Co2Saved: ds.co2,
				Xp:       ds.xp,
			})
			if err != nil {
				log.Fatalf("Failed to set stats for driver %q: %v", ds.name, err)
			}
		}

		// First driver (Hackathon Sürücü) gets badges
		if i == 0 {
			driverID = user.ID
		}
	}

	// Assign 4 badges to the first driver (Gece Kusu, Eco Sampiyonu, Hafta Sonu Savascisi, Erken Kalkan)
	for i := 0; i < 4; i++ {
		err := queries.AddUserBadge(ctx, generated.AddUserBadgeParams{
			UserID:  driverID,
			BadgeID: badgeIDs[i],
		})
		if err != nil {
			log.Fatalf("Failed to assign badge to driver: %v", err)
		}
	}

	fmt.Println("  Sürücüler (10 kullanıcı): driver@test.com, ayse@test.com, ... / demo123")
	fmt.Println("  Operatörler: info@zorlu.com, info@esarj.com, info@sharz.net / demo123")

	// 5. Create stations
	fmt.Println("Creating stations...")
	stationIDs := make([]int32, len(stationSeeds))
	for i, ss := range stationSeeds {
		station, err := queries.CreateStation(ctx, generated.CreateStationParams{
			Name:           ss.name,
			Lat:            ss.lat,
			Lng:            ss.lng,
			Address:        pgtype.Text{String: ss.address, Valid: true},
			Price:          ss.price,
			OwnerID:        pgtype.Int4{Int32: company.ID, Valid: true},
			DensityProfile: ss.densityProfile,
		})
		if err != nil {
			log.Fatalf("Failed to create station %q: %v", ss.name, err)
		}
		stationIDs[i] = station.ID

		// Set initial density
		err = queries.UpdateStationDensity(ctx, generated.UpdateStationDensityParams{
			ID:      station.ID,
			Density: int32(ss.density),
		})
		if err != nil {
			log.Fatalf("Failed to set density for station %q: %v", ss.name, err)
		}
	}
	fmt.Printf("  %d stations created.\n", len(stationSeeds))

	// 6. Generate forecasts using linear regression
	fmt.Println("Generating density forecasts with linear regression...")
	totalForecasts := 0

	for i, ss := range stationSeeds {
		stationID := stationIDs[i]
		profile := ss.densityProfile

		// Generate 2-month mock data
		mockData := generateTwoMonthMockData(profile)

		// Apply linear regression to get weekly forecast
		wf := linearRegressionToWeekly(mockData)

		// Upsert forecasts into DB
		for _, f := range wf {
			err := queries.UpsertForecast(ctx, generated.UpsertForecastParams{
				StationID:     stationID,
				DayOfWeek:     int32(f.dayOfWeek),
				Hour:          int32(f.hour),
				PredictedLoad: int32(f.predictedLoad),
			})
			if err != nil {
				log.Fatalf("Failed to upsert forecast for station %d: %v", stationID, err)
			}
			totalForecasts++
		}

		// Update station density with average of forecasts
		avgDensity := calculateAverageDensity(wf)
		err := queries.UpdateStationDensity(ctx, generated.UpdateStationDensityParams{
			ID:      stationID,
			Density: int32(avgDensity),
		})
		if err != nil {
			log.Fatalf("Failed to update density for station %d: %v", stationID, err)
		}
	}
	fmt.Printf("  %d stations x 7 days x 24 hours = %d forecast records created.\n", len(stationSeeds), totalForecasts)

	// 7. Create campaigns with badge targeting
	fmt.Println("Creating campaigns...")
	for _, cs := range campaignSeeds {
		campaign, err := queries.CreateCampaign(ctx, generated.CreateCampaignParams{
			Title:       cs.title,
			Description: cs.description,
			Status:      "ACTIVE",
			Target:      cs.target,
			Discount:    cs.discount,
			EndDate:     pgtype.Timestamptz{Time: cs.endDate, Valid: true},
			OwnerID:     company.ID,
			StationID:   pgtype.Int4{Valid: false}, // NULL — applies to all stations
			CoinReward:  cs.coinReward,
		})
		if err != nil {
			log.Fatalf("Failed to create campaign %q: %v", cs.title, err)
		}

		// Link target badge
		err = queries.AddCampaignTargetBadge(ctx, generated.AddCampaignTargetBadgeParams{
			CampaignID: campaign.ID,
			BadgeID:    badgeIDs[cs.badgeIndex],
		})
		if err != nil {
			log.Fatalf("Failed to link badge to campaign %q: %v", cs.title, err)
		}
	}

	fmt.Println("Badge-targeted campaigns created.")
	fmt.Println("Seed completed successfully! Database is ready.")
}
