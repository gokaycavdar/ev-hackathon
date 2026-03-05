package errors

import "net/http"

// AppError is a structured application error with HTTP status code and error code.
type AppError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *AppError) Error() string {
	return e.Message
}

// Pre-defined sentinel errors
var (
	ErrInvalidCredentials = &AppError{http.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect"}
	ErrUnauthorized       = &AppError{http.StatusUnauthorized, "AUTH_UNAUTHORIZED", "Authentication required"}
	ErrForbidden          = &AppError{http.StatusForbidden, "AUTH_FORBIDDEN", "Insufficient permissions"}
	ErrNotFound           = &AppError{http.StatusNotFound, "RESOURCE_NOT_FOUND", "Resource not found"}
	ErrValidation         = &AppError{http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input"}
	ErrConflict           = &AppError{http.StatusConflict, "RESOURCE_CONFLICT", "Resource already exists"}
	ErrAlreadyCompleted   = &AppError{http.StatusBadRequest, "RESERVATION_ALREADY_COMPLETED", "Reservation is already completed"}
	ErrInternal           = &AppError{http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred"}
)

// NewValidationError creates a new validation error with a custom message.
func NewValidationError(msg string) *AppError {
	return &AppError{http.StatusBadRequest, "VALIDATION_ERROR", msg}
}

// NewNotFoundError creates a not-found error for a specific resource.
func NewNotFoundError(resource string) *AppError {
	return &AppError{http.StatusNotFound, "RESOURCE_NOT_FOUND", resource + " not found"}
}

// NewConflictError creates a conflict error with a custom message.
func NewConflictError(msg string) *AppError {
	return &AppError{http.StatusConflict, "RESOURCE_CONFLICT", msg}
}

// NewForbiddenError creates a forbidden error with a custom message.
func NewForbiddenError(msg string) *AppError {
	return &AppError{http.StatusForbidden, "AUTH_FORBIDDEN", msg}
}
