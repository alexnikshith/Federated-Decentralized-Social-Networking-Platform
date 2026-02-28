package handlers

import (
	"federated-social/backend/config"
	"federated-social/backend/database"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AvatarHandler struct{}

func NewAvatarHandler() *AvatarHandler {
	return &AvatarHandler{}
}

// UploadAvatar handles POST /api/auth/upload-avatar
// Public endpoint for uploading avatars during signup or settings updates.
func (h *AvatarHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	if database.GridFS == nil {
		respondError(w, "Media storage not initialized", http.StatusInternalServerError)
		return
	}

	// Limit upload size to 5MB
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		respondError(w, "File too large (max 5MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, "Failed to get file from request", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Verify it's an image
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		respondError(w, "Only image files are allowed", http.StatusBadRequest)
		return
	}

	// Upload to GridFS
	uploadOptions := options.GridFSUpload().SetMetadata(map[string]interface{}{
		"contentType": contentType,
		"uploadedAt":  time.Now(),
		"type":        "avatar",
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

	// We reuse the public media route for avatars, and provide the absolute URL
	url := fmt.Sprintf("%s/api/messages/media/%s", config.AppConfig.BaseURL(), fileID)

	data := map[string]string{
		"url": url,
	}

	respondSuccess(w, "Avatar uploaded successfully", data, http.StatusCreated)
}
