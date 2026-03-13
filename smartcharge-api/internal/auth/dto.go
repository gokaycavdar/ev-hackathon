package auth

// LoginRequest is the request body for POST /v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RegisterRequest is the request body for POST /v1/auth/register.
type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=72"`
}

// AuthResponse is the response for login and register endpoints.
type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// UserResponse is the user data included in auth responses.
type UserResponse struct {
	ID       int32         `json:"id"`
	Name     string        `json:"name"`
	Email    string        `json:"email"`
	Role     string        `json:"role"`
	Coins    int32         `json:"coins"`
	Co2Saved float64       `json:"co2Saved"`
	XP       int32         `json:"xp"`
	Badges   []BadgeItem   `json:"badges,omitempty"`
	Stations []StationItem `json:"stations,omitempty"`
}

// BadgeItem is a minimal badge representation for auth responses.
type BadgeItem struct {
	ID          int32  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
}

// StationItem is a minimal station representation for auth responses.
type StationItem struct {
	ID    int32   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}
