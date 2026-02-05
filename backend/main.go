package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	adminRoutes "federated-social/backend/epics/admin/routes"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentRoutes "federated-social/backend/epics/content-sharing/routes"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/identity/routes"
	messagingRepo "federated-social/backend/epics/messaging/repository"
	messagingRoutes "federated-social/backend/epics/messaging/routes"
	reportRoutes "federated-social/backend/epics/reports/routes"
	safetyRepo "federated-social/backend/epics/safety/repository"
	safetyRoutes "federated-social/backend/epics/safety/routes"
	"federated-social/backend/middleware"
	"federated-social/backend/pkg/websocket"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

func main() {
	// Load configuration
	config.LoadConfig()

	// Connect to database
	database.Connect()

	// Create indexes
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	userRepo := repository.NewUserRepository()
	if err := userRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create user indexes: %v", err)
	}

	verificationRepo := repository.NewVerificationRepository()
	if err := verificationRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create verification indexes: %v", err)
	}

	// Create content-sharing indexes
	postRepo := contentRepo.NewPostRepository()
	if err := postRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create post indexes: %v", err)
	}

	followRepo := contentRepo.NewFollowRepository()
	if err := followRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create follow indexes: %v", err)
	}

	notificationRepo := contentRepo.NewNotificationRepository()
	if err := notificationRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create notification indexes: %v", err)
	}

	searchRepo := contentRepo.NewSearchRepository()
	if err := searchRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create search indexes: %v", err)
	}

	// Create messaging indexes
	messagingR := messagingRepo.NewMessageRepository()
	if err := messagingR.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create messaging indexes: %v", err)
	}

	// Create safety indexes
	blockRepo := safetyRepo.NewBlockRepository()
	if err := blockRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create block indexes: %v", err)
	}

	// Setup router
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.Logging)

	// Register routes
	routes.RegisterIdentityRoutes(router)
	contentRoutes.RegisterContentSharingRoutes(router)
	reportRoutes.RegisterReportRoutes(router)
	safetyRoutes.RegisterSafetyRoutes(router)
	adminRoutes.RegisterAdminRoutes(router)
	messagingRoutes.RegisterMessagingRoutes(router)

	// Public media access
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// WebSocket Hub
	hub := websocket.NewHub()
	websocket.GlobalHub = hub
	go hub.Run()

	// WebSocket Endpoint
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		// Extract token from query param since headers are limited in WS
		tokenString := r.URL.Query().Get("token")
		if tokenString == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Validate token manually here (simple version reusing middleware logic principles)
		// Or better, make a small helper in middleware/auth.go to validate token string
		// For now, let's just parse it using the same secret
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.AppConfig.JWTSecret), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		userID := claims["user_id"].(string)

		websocket.ServeWs(hub, w, r, userID)
	})

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Start server
	addr := ":" + config.AppConfig.Port
	log.Printf("Server starting on %s", addr)

	server := &http.Server{
		Addr:         addr,
		Handler:      middleware.CORS(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
