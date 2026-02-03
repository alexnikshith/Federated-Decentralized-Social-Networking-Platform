package middleware

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	"net/http"
	"strings"

	"log"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type contextKey string

const (
	UserIDKey contextKey = "userID"
	RoleKey   contextKey = "userRole"
)

// AuthMiddleware validates JWT tokens
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip OPTIONS requests (preflight requests)
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing authorization header", http.StatusUnauthorized)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Verify against sessions collection to handle invalidation (e.g. role change)
		sessionsCol := database.GetCollection("sessions")
		var session struct {
			IsValid bool `bson:"is_valid"`
		}
		err = sessionsCol.FindOne(r.Context(), bson.M{"token": tokenString, "is_valid": true}).Decode(&session)
		if err != nil {
			http.Error(w, "Session no longer valid", http.StatusUnauthorized)
			return
		}

		// Extract user ID and role from claims
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userID := claims["user_id"].(string)
			role := "user"
			if r, ok := claims["role"].(string); ok && r != "" {
				role = r
			}
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, RoleKey, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		} else {
			http.Error(w, "Invalid token claims", http.StatusUnauthorized)
			return
		}
	})
}

// AdminMiddleware ensures the user has an admin role
func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(RoleKey).(string)
		if !ok || role != "admin" {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// OptionalAuth attempts to validate JWT tokens but does not block if missing
func OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip OPTIONS requests
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			next.ServeHTTP(w, r)
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString := parts[1]
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return []byte(config.AppConfig.JWTSecret), nil
			})

			if err == nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					userID := claims["user_id"].(string)
					role := "user"
					if r, ok := claims["role"].(string); ok && r != "" {
						role = r
					}
					ctx := context.WithValue(r.Context(), UserIDKey, userID)
					ctx = context.WithValue(ctx, RoleKey, role)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

// CORS middleware
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Logging middleware
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[%s] %s %s", r.RemoteAddr, r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// GetUserIDFromContext extracts user ID from context safely
func GetUserIDFromContext(ctx context.Context) primitive.ObjectID {
	val := ctx.Value(UserIDKey)
	if val == nil {
		return primitive.NilObjectID
	}

	userIDStr, ok := val.(string)
	if !ok {
		return primitive.NilObjectID
	}

	userID, _ := primitive.ObjectIDFromHex(userIDStr)
	return userID
}
