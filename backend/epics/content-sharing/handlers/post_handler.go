package handlers

import (
	"encoding/json"
	"federated-social/backend/epics/content-sharing/dto"
	"federated-social/backend/epics/content-sharing/service"
	"federated-social/backend/middleware"
	"log"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PostHandler struct {
	postService *service.PostService
}

func NewPostHandler() *PostHandler {
	return &PostHandler{
		postService: service.NewPostService(),
	}
}

// CreatePost handles POST /api/posts
func (h *PostHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	var req dto.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	post, err := h.postService.CreatePost(r.Context(), userID, req)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Post created successfully", post, http.StatusCreated)
}

// GetFeed handles GET /api/feed
func (h *PostHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())

	// Get limit from query params (default 50)
	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = parsedLimit
		}
	}

	feed, err := h.postService.GetFeed(r.Context(), userID, limit)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// DEBUG: Log feed details
	log.Printf("DEBUG GetFeed: UserID=%v, Requested=%d posts, Returning=%d posts", userID, limit, len(feed.Posts))
	for i, post := range feed.Posts {
		log.Printf("  Post %d: ID=%v, AuthorID=%v, AuthorName=%s, Content=%.40s",
			i+1, post.ID, post.AuthorID, post.AuthorName, post.Content)
	}

	respondSuccess(w, "Feed retrieved successfully", feed, http.StatusOK)
}

// LikePost handles POST /api/posts/:id/like
func (h *PostHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	if err := h.postService.LikePost(r.Context(), postID, userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Post liked successfully", nil, http.StatusOK)
}

// UnlikePost handles DELETE /api/posts/:id/like
func (h *PostHandler) UnlikePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	if err := h.postService.UnlikePost(r.Context(), postID, userID); err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Post unliked successfully", nil, http.StatusOK)
}

// CreateComment handles POST /api/posts/:id/comments
func (h *PostHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	var req dto.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	comment, err := h.postService.CreateComment(r.Context(), postID, userID, req)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Comment created successfully", comment, http.StatusCreated)
}

// GetComments handles GET /api/posts/:id/comments
func (h *PostHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)

	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	comments, err := h.postService.GetComments(r.Context(), postID)
	if err != nil {
		respondError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	respondSuccess(w, "Comments retrieved successfully", comments, http.StatusOK)
}

// DeletePost handles DELETE /api/posts/:id
func (h *PostHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserIDFromContext(r.Context())
	vars := mux.Vars(r)

	postID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid post ID", http.StatusBadRequest)
		return
	}

	if err := h.postService.DeletePost(r.Context(), postID, userID); err != nil {
		respondError(w, err.Error(), http.StatusForbidden)
		return
	}

	respondSuccess(w, "Post deleted successfully", nil, http.StatusOK)
}
