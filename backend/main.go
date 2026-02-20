package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	adminRoutes "federated-social/backend/epics/admin/routes"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentRoutes "federated-social/backend/epics/content-sharing/routes"
	federationModels "federated-social/backend/epics/federation/models"
	federationRepo "federated-social/backend/epics/federation/repository"
	federationRoutes "federated-social/backend/epics/federation/routes"
	federationService "federated-social/backend/epics/federation/service"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/identity/routes"
	messagingRepo "federated-social/backend/epics/messaging/repository"
	messagingRoutes "federated-social/backend/epics/messaging/routes"
	reportRepo "federated-social/backend/epics/reports/repository"
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

// bootstrapFederationInstances ensures that known federated instances are registered in the database
func bootstrapFederationInstances(ctx context.Context, instanceRepo *federationRepo.InstanceRepository) {
	// Define the peer server based on current instance
	var peerDomain, peerInbox string

	if config.AppConfig.InstanceName == "server1" {
		peerDomain = "localhost:8081"
		peerInbox = "http://server2:8080/federation/inbox"
	} else if config.AppConfig.InstanceName == "server2" {
		peerDomain = "localhost:8080"
		peerInbox = "http://server1:8080/federation/inbox"
	} else {
		// If instance name is something else, skip bootstrap
		log.Printf("Skipping federation bootstrap for unknown instance: %s", config.AppConfig.InstanceName)
		return
	}

	// Check if peer instance already exists
	existingInstances, err := instanceRepo.ListAllInstances(ctx)
	if err != nil {
		log.Printf("Warning: Failed to check existing instances: %v", err)
		return
	}

	// Check if peer already registered
	for _, instance := range existingInstances {
		if instance.Domain == peerDomain {
			log.Printf("Federation peer %s already registered", peerDomain)
			return
		}
	}

	// Register the peer instance using UpsertInstance
	peerInstance := &federationModels.Instance{
		Domain:     peerDomain,
		InboxURL:   peerInbox,
		TrustLevel: "trusted",
		LastSeenAt: time.Now(),
	}

	err = instanceRepo.UpsertInstance(ctx, peerInstance)
	if err != nil {
		log.Printf("Warning: Failed to bootstrap federation peer %s: %v", peerDomain, err)
	} else {
		log.Printf("✓ Bootstrapped federation peer: %s (inbox: %s)", peerDomain, peerInbox)
	}
}

func main() {
	// Load configuration from .env or environment variables
	config.LoadConfig()

	// Connect to MongoDB database
	database.Connect()

	// Create database indexes to ensure performance and uniqueness
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

	// Run migrations
	if err := userRepo.MigrateGlobalDiscovery(ctx); err != nil {
		log.Printf("Warning: Failed to migrate user discovery settings: %v", err)
	}

	// Create content-sharing indexes (Posts, Follows, Notifications, Search)
	postRepo := contentRepo.NewPostRepository()
	if err := postRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create post indexes: %v", err)
	}

	storyRepo := contentRepo.NewStoryRepository()
	if err := storyRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create story indexes: %v", err)
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

	// Create safety indexes (Blocking)
	blockRepo := safetyRepo.NewBlockRepository()
	if err := blockRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create block indexes: %v", err)
	}

	// Create report indexes (User Reports)
	userReportRepo := reportRepo.NewReportRepository()
	if err := userReportRepo.CreateIndexes(ctx); err != nil {
		log.Printf("Warning: Failed to create report indexes: %v", err)
	}

	// Create federation indexes
	if config.AppConfig.FederationEnabled {
		log.Println("Federation enabled - creating federation indexes")

		instanceRepo := federationRepo.NewInstanceRepository()
		if err := instanceRepo.CreateIndexes(ctx); err != nil {
			log.Printf("Warning: Failed to create instance indexes: %v", err)
		}

		remoteUserRepo := federationRepo.NewRemoteUserRepository()
		if err := remoteUserRepo.CreateIndexes(ctx); err != nil {
			log.Printf("Warning: Failed to create remote user indexes: %v", err)
		}

		remotePostRepo := federationRepo.NewRemotePostRepository()
		if err := remotePostRepo.CreateIndexes(ctx); err != nil {
			log.Printf("Warning: Failed to create remote post indexes: %v", err)
		}

		eventRepo := federationRepo.NewFederationEventRepository()
		if err := eventRepo.CreateIndexes(ctx); err != nil {
			log.Printf("Warning: Failed to create federation event indexes: %v", err)
		}

		relationshipsRepo := federationRepo.NewRemoteRelationshipsRepository()
		if err := relationshipsRepo.CreateIndexes(ctx); err != nil {
			log.Printf("Warning: Failed to create remote relationship indexes: %v", err)
		}

		// Bootstrap federated instances
		bootstrapFederationInstances(ctx, instanceRepo)
	}

	// Setup Gorilla Mux router
	router := mux.NewRouter()

	// Apply global middleware (Logging)
	router.Use(middleware.Logging)

	// Register module routes
	routes.RegisterIdentityRoutes(router)
	contentRoutes.RegisterContentSharingRoutes(router)
	reportRoutes.RegisterReportRoutes(router)
	safetyRoutes.RegisterSafetyRoutes(router)
	adminRoutes.RegisterAdminRoutes(router)
	messagingRoutes.RegisterMessagingRoutes(router)

	// Register federation routes
	if config.AppConfig.FederationEnabled {
		federationRoutes.RegisterFederationRoutes(router)
		log.Println("Federation routes registered")
	}

	// Public media access handler
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// WebSocket Hub Initialization
	hub := websocket.NewHub()
	websocket.GlobalHub = hub
	go hub.Run()

	// WebSocket Endpoint with manual token validation
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

	// Start federation activity processor
	if config.AppConfig.FederationEnabled {
		processor := federationService.NewActivityProcessor()
		processor.Start()
		log.Println("Federation activity processor started")
	}

	// Start HTTP server with CORS and Timeouts
	addr := ":" + config.AppConfig.Port
	log.Printf("Server starting on %s (Instance: %s, Federation: %v)",
		addr, config.AppConfig.InstanceName, config.AppConfig.FederationEnabled)

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
