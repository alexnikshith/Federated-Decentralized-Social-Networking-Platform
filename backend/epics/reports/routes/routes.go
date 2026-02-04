package routes

import (
	"federated-social/backend/epics/reports/handlers"
	"federated-social/backend/middleware"

	"github.com/gorilla/mux"
)

func RegisterReportRoutes(router *mux.Router) {
	handler := handlers.NewReportHandler()

	s := router.PathPrefix("/api/reports").Subrouter()
	s.Use(middleware.AuthMiddleware)

	s.HandleFunc("/heartbeat", handler.Heartbeat).Methods("POST")
	s.HandleFunc("/activity", handler.GetReport).Methods("GET")
	s.HandleFunc("/interactions", handler.GetInteractionReport).Methods("GET")
}
