package main

import (
	"context"
	"federated-social/backend/config"
	"federated-social/backend/database"
	contentRepo "federated-social/backend/epics/content-sharing/repository"
	contentRoutes "federated-social/backend/epics/content-sharing/routes"
	"federated-social/backend/epics/identity/repository"
	"federated-social/backend/epics/identity/routes"
	"federated-social/backend/middleware"
	"log"
	"net/http"
	"time"

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

	// Setup router
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.CORS)
	router.Use(middleware.Logging)

	// Register routes
	routes.RegisterIdentityRoutes(router)
	contentRoutes.RegisterContentSharingRoutes(router)

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
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
