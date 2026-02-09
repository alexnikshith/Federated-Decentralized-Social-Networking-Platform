package service

import (
	"context"
	"federated-social/backend/epics/federation/models"
	"federated-social/backend/epics/federation/repository"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

const (
	MaxRetries      = 3
	RetryInterval   = 30 * time.Second
	ProcessInterval = 10 * time.Second
)

type ActivityProcessor struct {
	eventRepo  *repository.FederationEventRepository
	fedService *FederationService
	stopChan   chan struct{}
}

func NewActivityProcessor() *ActivityProcessor {
	return &ActivityProcessor{
		eventRepo:  repository.NewFederationEventRepository(),
		fedService: NewFederationService(),
		stopChan:   make(chan struct{}),
	}
}

// Start begins processing federation events in the background
func (p *ActivityProcessor) Start() {
	log.Println("Starting federation activity processor...")
	go p.processLoop()
}

// Stop stops the activity processor
func (p *ActivityProcessor) Stop() {
	close(p.stopChan)
}

// processLoop continuously processes pending and failed events
func (p *ActivityProcessor) processLoop() {
	ticker := time.NewTicker(ProcessInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			p.processPendingEvents()
			p.retryFailedEvents()
		case <-p.stopChan:
			log.Println("Stopping federation activity processor...")
			return
		}
	}
}

// processPendingEvents processes all pending federation events
func (p *ActivityProcessor) processPendingEvents() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	events, err := p.eventRepo.GetPendingEvents(ctx)
	if err != nil {
		log.Printf("Error retrieving pending events: %v", err)
		return
	}

	if len(events) == 0 {
		return
	}

	log.Printf("Processing %d pending federation events", len(events))

	for _, event := range events {
		if err := p.processEvent(ctx, &event); err != nil {
			log.Printf("Error processing event %s: %v", event.ID.Hex(), err)
			p.eventRepo.MarkEventFailed(ctx, event.ID, err.Error())
		} else {
			p.eventRepo.MarkEventSent(ctx, event.ID)
		}
	}
}

// retryFailedEvents retries failed events that haven't exceeded max retries
func (p *ActivityProcessor) retryFailedEvents() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	events, err := p.eventRepo.GetFailedEvents(ctx, MaxRetries)
	if err != nil {
		log.Printf("Error retrieving failed events: %v", err)
		return
	}

	if len(events) == 0 {
		return
	}

	log.Printf("Retrying %d failed federation events", len(events))

	for _, event := range events {
		// Check if enough time has passed since last attempt
		if event.LastAttempt != nil && time.Since(*event.LastAttempt) < RetryInterval {
			continue
		}

		if err := p.processEvent(ctx, &event); err != nil {
			log.Printf("Retry failed for event %s (attempt %d/%d): %v",
				event.ID.Hex(), event.RetryCount+1, MaxRetries, err)
			p.eventRepo.MarkEventFailed(ctx, event.ID, err.Error())
		} else {
			log.Printf("Successfully retried event %s", event.ID.Hex())
			p.eventRepo.MarkEventSent(ctx, event.ID)
		}
	}
}

// processEvent processes a single federation event
func (p *ActivityProcessor) processEvent(ctx context.Context, event *models.FederationEvent) error {
	// Get instance info
	instance, err := p.fedService.instanceRepo.GetInstanceByDomain(ctx, event.TargetInstance)
	if err != nil {
		// Try to discover instance if not found
		instance, err = p.fedService.DiscoverInstance(ctx, event.TargetInstance)
		if err != nil {
			return err
		}
	}

	// Check if instance is blocked
	if instance.TrustLevel == "blocked" {
		log.Printf("Skipping event to blocked instance: %s", event.TargetInstance)
		return nil
	}

	// Convert payload to ActivityEnvelope
	envelope := &models.ActivityEnvelope{}
	envelopeBytes, err := bson.Marshal(event.Payload)
	if err != nil {
		return err
	}
	if err := bson.Unmarshal(envelopeBytes, envelope); err != nil {
		return err
	}

	// Send to instance inbox
	if err := p.fedService.SendHTTPActivity(ctx, instance.InboxURL, envelope); err != nil {
		return err
	}

	log.Printf("Successfully sent %s activity to %s", event.Type, event.TargetInstance)
	return nil
}
