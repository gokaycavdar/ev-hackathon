package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"smartcharge-api/db/generated"
	"smartcharge-api/internal/auth"
	"smartcharge-api/internal/badge"
	"smartcharge-api/internal/campaign"
	"smartcharge-api/internal/chat"
	"smartcharge-api/internal/config"
	"smartcharge-api/internal/demouser"
	"smartcharge-api/internal/middleware"
	"smartcharge-api/internal/operator"
	"smartcharge-api/internal/recommend"
	"smartcharge-api/internal/reservation"
	"smartcharge-api/internal/station"
	"smartcharge-api/internal/user"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Connect to database
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Verify connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Initialize SQLC queries
	queries := generated.New(pool)

	// JWT secret
	jwtSecret := []byte(cfg.JWTSecret)

	// Auth middleware
	authMiddleware := middleware.AuthRequired(jwtSecret)

	// ── Services ──────────────────────────────────────────
	authService := auth.NewService(queries, jwtSecret)
	stationService := station.NewService(queries)
	reservationService := reservation.NewService(queries, pool)
	userService := user.NewService(queries)
	badgeService := badge.NewService(queries)
	campaignService := campaign.NewService(queries)
	operatorService := operator.NewService(queries)
	chatService := chat.NewService(queries)
	
	// Recommend service - uses RL scorer by default
	rlScorer := recommend.NewRLScorer(queries)
	recommendService := recommend.NewService(queries, rlScorer)

	// ── Handlers ──────────────────────────────────────────
	authHandler := auth.NewHandler(authService)
	stationHandler := station.NewHandler(stationService, recommendService)
	reservationHandler := reservation.NewHandler(reservationService)
	userHandler := user.NewHandler(userService)
	badgeHandler := badge.NewHandler(badgeService)
	campaignHandler := campaign.NewHandler(campaignService)
	operatorHandler := operator.NewHandler(operatorService)
	chatHandler := chat.NewHandler(chatService)
	demoUserHandler := demouser.NewHandler(queries)

	// ── Router ────────────────────────────────────────────
	router := gin.Default()

	// Global middleware
	router.Use(middleware.CORS(cfg.FrontendURL))

	// API v1 group
	v1 := router.Group("/v1")

	// Register all routes
	authHandler.RegisterRoutes(v1)
	stationHandler.RegisterRoutes(v1, authMiddleware)
	reservationHandler.RegisterRoutes(v1, authMiddleware)
	userHandler.RegisterRoutes(v1, authMiddleware)
	badgeHandler.RegisterRoutes(v1)
	campaignHandler.RegisterRoutes(v1, authMiddleware)
	operatorHandler.RegisterRoutes(v1, authMiddleware)
	chatHandler.RegisterRoutes(v1)
	demoUserHandler.RegisterRoutes(v1)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "smartcharge-api",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	// ── Server with graceful shutdown ─────────────────────
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("SmartCharge API starting on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Give outstanding requests 5 seconds to complete
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
