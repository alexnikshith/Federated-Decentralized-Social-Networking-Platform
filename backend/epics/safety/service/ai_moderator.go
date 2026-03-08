package service

import (
	"context"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/safety/models"
	"fmt"
	"log"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type AIModeratorService struct {
	client *genai.Client
	model  *genai.GenerativeModel
}

func NewAIModeratorService(ctx context.Context) (*AIModeratorService, error) {
	apiKey := config.AppConfig.GeminiAPIKey
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not found in config")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}

	// Using the latest Gemini 2.0 Flash model
	const modelName = "gemini-2.0-flash"
	model := client.GenerativeModel(modelName)

	// Configure for structured JSON output
	model.ResponseMIMEType = "application/json"

	log.Printf("[Moderation] AI Moderator initialized with model: %s", modelName)

	return &AIModeratorService{
		client: client,
		model:  model,
	}, nil
}

type ModerationResult struct {
	IsViolation   bool     `json:"is_violation"`
	Reason        string   `json:"reason"`
	Score         int      `json:"score"` // 1-10 toxicity or severity
	BreachedRules []string `json:"breached_rules"`
}

func (s *AIModeratorService) ModerateContent(ctx context.Context, content string, guidelines []models.CommunityGuideline) (*ModerationResult, error) {
	// Construct the system prompt using guidelines
	guidelineText := ""
	for i, g := range guidelines {
		guidelineText += fmt.Sprintf("%d. %s: %s\n", i+1, g.Title, g.Description)
	}

	systemPrompt := fmt.Sprintf(`You are a strict community moderator for a decentralized social network. 
Evaluate the following content against the provided community guidelines. 

CRITICAL INSTRUCTIONS:
1. You must be extremely literal and strict. If a guideline prohibits a specific word or topic, any mention of it (even in passing or as a test) is a violation.
2. If the content matches ANY of the guidelines below, set is_violation to true.
3. Be impartial and do not allow exceptions unless explicitly stated in the guidelines.

Guidelines:
%s

Return a JSON object with:
- is_violation (boolean)
- reason (string, concise explanation in the language of the content, mentioning which specific guideline was breached)
- score (integer 1-10, where 10 is severe)
- breached_rules (array of titles of the breached guidelines)

Content to evaluate:
"%s"`, guidelineText, content)

	resp, err := s.model.GenerateContent(ctx, genai.Text(systemPrompt))
	if err != nil {
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty AI response")
	}

	part := resp.Candidates[0].Content.Parts[0]
	text, ok := part.(genai.Text)
	if !ok {
		return nil, fmt.Errorf("unexpected part type from AI")
	}

	var result ModerationResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		log.Printf("Failed to unmarshal AI response: %v\nRaw: %s", err, text)
		return nil, err
	}

	return &result, nil
}

func (s *AIModeratorService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
