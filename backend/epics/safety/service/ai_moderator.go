package service

import (
	"context"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/safety/models"
	"fmt"
	"log"
	"strings"

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

	// Disable standard safety limits so the AI actually evaluates profanity instead of silently returning empty/blocked
	model.SafetySettings = []*genai.SafetySetting{
		{
			Category:  genai.HarmCategoryHarassment,
			Threshold: genai.HarmBlockNone,
		},
		{
			Category:  genai.HarmCategoryHateSpeech,
			Threshold: genai.HarmBlockNone,
		},
		{
			Category:  genai.HarmCategorySexuallyExplicit,
			Threshold: genai.HarmBlockNone,
		},
		{
			Category:  genai.HarmCategoryDangerousContent,
			Threshold: genai.HarmBlockNone,
		},
	}

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
	BadWordsFound []string `json:"bad_words_found"`
}

func (s *AIModeratorService) ModerateContent(ctx context.Context, content string, guidelines []models.CommunityGuideline) (*ModerationResult, error) {
	// Construct the system prompt using guidelines
	guidelineText := ""
	for i, g := range guidelines {
		guidelineText += fmt.Sprintf("%d. %s: %s\n", i+1, g.Title, g.Description)
	}

	systemPrompt := fmt.Sprintf(`You are an uncompromising AI moderator for a decentralized social network. 
Evaluate the following content against the provided community guidelines AND for any generally improper, offensive, or bad words.

CRITICAL INSTRUCTIONS:
1. You must be extremely literal and strict. If a guideline prohibits a specific word or topic, or if the content contains ANY recognized bad words, profanity, slurs, or improper language (even in passing or as a test), it IS a violation.
2. If the content matches ANY of the guidelines below OR contains improper words, set is_violation to true.
3. Be impartial and do not allow exceptions.
4. You MUST return ONLY a valid JSON object. Do not include markdown formatting or explanation outside the JSON.

Guidelines:
%s

Return a JSON object with:
- is_violation (boolean)
- reason (string, concise explanation mentioning the bad word found or the guideline breached)
- score (integer 1-10, where 10 is severe)
- breached_rules (array of titles of the breached guidelines, or "Improper Language" if a bad word was used)
- bad_words_found (array of the specific offensive words detected)

Content to evaluate:
"%s"`, guidelineText, content)

	log.Printf("[Moderation] Sending prompt to AI for content: %.50s...", content)
	log.Printf("[Moderation] FULL SYSTEM PROMPT: %s", systemPrompt)
	resp, err := s.model.GenerateContent(ctx, genai.Text(systemPrompt))
	if err != nil {
		log.Printf("[Moderation] AI GenerateContent error: %v", err)
		return nil, err
	}
	log.Printf("[Moderation] AI response received for content: %.50s...", content)
	if resp != nil && len(resp.Candidates) > 0 {
		log.Printf("[Moderation] RAW AI CANDIDATE 0: %+v", resp.Candidates[0])
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty AI response")
	}

	part := resp.Candidates[0].Content.Parts[0]
	text, ok := part.(genai.Text)
	if !ok {
		return nil, fmt.Errorf("unexpected part type from AI")
	}

	rawText := string(text)
	rawText = strings.TrimSpace(rawText)
	rawText = strings.TrimPrefix(rawText, "```json")
	rawText = strings.TrimPrefix(rawText, "```")
	rawText = strings.TrimSuffix(rawText, "```")
	rawText = strings.TrimSpace(rawText)

	var result ModerationResult
	if err := json.Unmarshal([]byte(rawText), &result); err != nil {
		log.Printf("[Moderation] Failed to unmarshal AI response: %v\nRaw: %s", err, rawText)
		return nil, err
	}
	log.Printf("[Moderation] AI Evaluation Result: Violation=%v, Reason=%s", result.IsViolation, result.Reason)

	return &result, nil
}

func (s *AIModeratorService) Close() {
	if s.client != nil {
		s.client.Close()
	}
}
