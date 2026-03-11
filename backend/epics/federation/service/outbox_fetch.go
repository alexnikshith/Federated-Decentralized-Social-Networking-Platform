package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"federated-social/backend/epics/federation/models"
)

// FetchAndIngestOutbox fetches an ActivityPub outbox and ingests recent posts
func (s *FederationService) FetchAndIngestOutbox(ctx context.Context, actor *APActor, remoteUser *models.RemoteUser) error {
	if actor.Outbox == "" {
		return nil
	}
	
	req, err := http.NewRequestWithContext(ctx, "GET", actor.Outbox, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/activity+json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("outbox returned %d", resp.StatusCode)
	}

	var outbox struct {
		Type       string      `json:"type"`
		First      interface{} `json:"first"`
		OrderedItems []interface{} `json:"orderedItems"` // Sometimes it's inline
	}
	if err := json.NewDecoder(resp.Body).Decode(&outbox); err != nil {
		return err
	}

	// We only want the first page for initial sync
	var firstPageURL string
	switch v := outbox.First.(type) {
	case string:
		firstPageURL = v
	case map[string]interface{}:
		if href, ok := v["href"].(string); ok {
			firstPageURL = href
		} else if id, ok := v["id"].(string); ok {
			firstPageURL = id
		}
	}
	
	// If items are inline in the outbox...
	items := outbox.OrderedItems
	
	if len(items) == 0 && firstPageURL != "" {
		// Fetch first page
		pageReq, _ := http.NewRequestWithContext(ctx, "GET", firstPageURL, nil)
		pageReq.Header.Set("Accept", "application/activity+json")
		pageResp, err := s.httpClient.Do(pageReq)
		if err == nil {
			defer pageResp.Body.Close()
			var page struct {
				OrderedItems []interface{} `json:"orderedItems"`
			}
			json.NewDecoder(pageResp.Body).Decode(&page)
			items = page.OrderedItems
		}
	}
	
	// Ingest up to 20 posts from outbox
	count := 0
	for _, rawItem := range items {
		if count >= 20 {
			break
		}
		
		item, ok := rawItem.(map[string]interface{})
		if !ok {
			continue
		}
		
		// If item is just a string URL (not embedded object), we'd need to fetch it, but usually standard Mastodon 
		// embeds the Create activities in the outbox first page.
		
		itemType, _ := item["type"].(string)
		if itemType == "Create" {
			obj, ok := item["object"].(map[string]interface{})
			if !ok {
				continue
			}
			
			objType, _ := obj["type"].(string)
			if objType == "Note" {
				id, _ := obj["id"].(string)
				content, _ := obj["content"].(string)
				publishedStr, _ := obj["published"].(string)
				published, _ := time.Parse(time.RFC3339, publishedStr)
				
				post := &models.RemotePost{
					RemotePostID:   id,
					OriginInstance: remoteUser.Instance,
					Author:         remoteUser.Username,
					AuthorActorID:  remoteUser.ActorID,
					Content:        content,
					Visibility:     "public",
					CreatedAt:      published,
				}
				s.remotePostRepo.UpsertRemotePost(ctx, post)
				count++
			}
		}
	}
	
	log.Printf("ActivityPub: Ingested %d historical posts from %s's outbox", count, actor.PreferredUsername)
	return nil
}
