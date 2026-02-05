package handlers

import (
	"federated-social/backend/database"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MediaHandler struct{}

func NewMediaHandler() *MediaHandler {
	return &MediaHandler{}
}

// UploadMedia handles POST /api/messaging/upload
func (h *MediaHandler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	if database.GridFS == nil {
		respondError(w, "Media storage not initialized", http.StatusInternalServerError)
		return
	}

	// Limit upload size (e.g., 20MB)
	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		respondError(w, "File too large (max 20MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Upload to GridFS
	uploadOptions := options.GridFSUpload().SetMetadata(map[string]interface{}{
		"contentType": header.Header.Get("Content-Type"),
		"uploadedAt":  time.Now(),
		"type":        r.FormValue("type"),
	})

	uploadStream, err := database.GridFS.OpenUploadStream(header.Filename, uploadOptions)
	if err != nil {
		respondError(w, "Failed to initialize storage stream", http.StatusInternalServerError)
		return
	}
	defer uploadStream.Close()

	if _, err := io.Copy(uploadStream, file); err != nil {
		respondError(w, "Failed to save file contents", http.StatusInternalServerError)
		return
	}

	fileID := uploadStream.FileID.(primitive.ObjectID).Hex()
	url := fmt.Sprintf("/api/messages/media/%s", fileID)

	data := map[string]string{
		"url":      url,
		"fileName": header.Filename,
		"type":     r.FormValue("type"),
	}

	respondSuccess(w, "File uploaded successfully", data, http.StatusCreated)
}

// DownloadMedia handles GET /api/messages/media/{id}
func (h *MediaHandler) DownloadMedia(w http.ResponseWriter, r *http.Request) {
	if database.GridFS == nil {
		respondError(w, "Media storage not initialized", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	fileID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		respondError(w, "Invalid media ID", http.StatusBadRequest)
		return
	}

	downloadStream, err := database.GridFS.OpenDownloadStream(fileID)
	if err != nil {
		respondError(w, "Media not found", http.StatusNotFound)
		return
	}
	defer downloadStream.Close()

	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", downloadStream.GetFile().Name))

	// Try to get content type from metadata if it exists
	var metadata struct {
		ContentType string `bson:"contentType"`
	}
	if err := bson.Unmarshal(downloadStream.GetFile().Metadata, &metadata); err == nil {
		if metadata.ContentType != "" {
			w.Header().Set("Content-Type", metadata.ContentType)
		}
	}

	if _, err := io.Copy(w, downloadStream); err != nil {
		log.Printf("Error streaming media: %v", err)
	}
}
