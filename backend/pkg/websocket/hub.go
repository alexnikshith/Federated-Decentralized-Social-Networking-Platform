package websocket

import (
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to them.
// It uses a map to track clients per UserID to support multiple devices/tab per user.
type Hub struct {
	// Registered clients map: userID -> map of client pointers (to support multiple tabs/devices)
	clients map[string]map[*Client]bool

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Inbound messages to broadcast.
	broadcast chan *BroadcastMessage

	mutex sync.RWMutex
}

type BroadcastMessage struct {
	ReceiverID string      `json:"receiver_id"`
	Type       string      `json:"type"` // "message", "notification", etc.
	Payload    interface{} `json:"payload"`
}

var GlobalHub *Hub

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan *BroadcastMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[string]map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			if _, ok := h.clients[client.userID]; !ok {
				h.clients[client.userID] = make(map[*Client]bool)
			}
			h.clients[client.userID][client] = true
			h.mutex.Unlock()
			log.Printf("WS: Client connected: %s", client.userID)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client.userID]; ok {
				if _, ok := h.clients[client.userID][client]; ok {
					delete(h.clients[client.userID], client)
					close(client.send)
					if len(h.clients[client.userID]) == 0 {
						delete(h.clients, client.userID)
					}
				}
			}
			h.mutex.Unlock()
			log.Printf("WS: Client disconnected: %s", client.userID)

		case message := <-h.broadcast:
			h.mutex.RLock()
			// Send to specific receiver
			if clients, ok := h.clients[message.ReceiverID]; ok {
				for client := range clients {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(clients, client)
					}
				}
			}
			h.mutex.RUnlock()
		}
	}
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(userID string, msgType string, payload interface{}) {
	h.broadcast <- &BroadcastMessage{
		ReceiverID: userID,
		Type:       msgType,
		Payload:    payload,
	}
}
