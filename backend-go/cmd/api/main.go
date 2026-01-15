package main

import (
	"fmt"
	"net/http"
	"github.com/RiteeshTM/Federated-Decentralized-Social-Networking-Platform/internal/config"
)

func main() {
	cfg := config.Load()

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	addr := ":" + cfg.Port
	fmt.Println("Go API running on http://localhost" + addr)

	if err := http.ListenAndServe(addr, nil); err != nil {
		panic(err)
	}
}
