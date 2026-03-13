package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	GinMode     string
	FrontendURL string
	LLMURL      string
	LLMModel    string
}

func Load() *Config {
	_ = godotenv.Load()

	ginMode := getEnv("GIN_MODE", "debug")

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		if ginMode == "release" {
			log.Fatal("FATAL: JWT_SECRET environment variable is required in production (GIN_MODE=release)")
		}
		// Allow a dev-only fallback in debug mode
		jwtSecret = "dev-only-secret-do-not-use-in-production"
		log.Println("WARNING: Using default JWT secret. Set JWT_SECRET env var for production.")
	}

	cfg := &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://admin:admin@localhost:5432/evcharge?sslmode=disable"),
		JWTSecret:   jwtSecret,
		Port:        getEnv("PORT", "8080"),
		GinMode:     ginMode,
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),
		LLMURL:      getEnv("LLM_URL", "http://localhost:11434"),
		LLMModel:    getEnv("LLM_MODEL", "llama3.2"),
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
