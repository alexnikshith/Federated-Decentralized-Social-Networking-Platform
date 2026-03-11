package service

import (
	"bytes"
	"context"
	"encoding/json"
	"federated-social/backend/config"
	"federated-social/backend/epics/safety/models"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

const groqAPIURL = "https://api.groq.com/openai/v1/chat/completions"
const groqModel = "llama-3.3-70b-versatile"

type AIModeratorService struct {
	apiKey     string
	httpClient *http.Client
}

func NewAIModeratorService(ctx context.Context) (*AIModeratorService, error) {
	apiKey := config.AppConfig.GroqAPIKey
	if apiKey == "" {
		return nil, fmt.Errorf("GROQ_API_KEY not found in config")
	}

	log.Printf("[Moderation] AI Moderator initialized with Groq model: %s", groqModel)

	return &AIModeratorService{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}, nil
}

type ModerationResult struct {
	IsViolation   bool     `json:"is_violation"`
	Reason        string   `json:"reason"`
	Score         int      `json:"score"` // 1-10 toxicity or severity
	BreachedRules []string `json:"breached_rules"`
	BadWordsFound []string `json:"bad_words_found"`
}

// groqRequest matches the OpenAI-compatible chat completions request body
type groqRequest struct {
	Model    string        `json:"model"`
	Messages []groqMessage `json:"messages"`
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// groqResponse is the subset of the OpenAI-compatible response we need
type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (s *AIModeratorService) ModerateContent(ctx context.Context, content string, guidelines []models.CommunityGuideline) (*ModerationResult, error) {
	// Construct the system prompt using guidelines
	guidelineText := ""
	for i, g := range guidelines {
		guidelineText += fmt.Sprintf("%d. %s: %s\n", i+1, g.Title, g.Description)
	}

	systemPrompt := fmt.Sprintf(`You are an uncompromising AI moderator for a decentralized social network. 
Evaluate the following content against the provided community guidelines AND for any generally improper, offensive, bad words, hate speech, racism, or glorification of atrocities.

CRITICAL INSTRUCTIONS:
1. You must be extremely literal and strict. If a guideline prohibits a specific word or topic, or if the content contains ANY recognized bad words, profanity, racial slurs (such as the N-word or its variants), hate speech, or improper language (even in passing, as a joke, or as a test), it IS a violation.
2. Absolutely ZERO TOLERANCE for praise, endorsement, or glorification of notorious historical figures associated with hate, genocide, or atrocities (e.g., Hitler, Nazis). Such content IS a violation.
3. If the content matches ANY of the guidelines below, OR contains improper words, slurs, or violates the rules above, set is_violation to true.
4. Be impartial and do not allow exceptions. Context does not matter if a grave slur or hate speech is used.
5. You MUST return ONLY a valid JSON object. Do not include markdown formatting or explanation outside the JSON.

Guidelines:
%s

Return a JSON object with:
- is_violation (boolean)
- reason (string, concise explanation mentioning the bad word, hate speech, or the guideline breached)
- score (integer 1-10, where 10 is severe)
- breached_rules (array of titles of the breached guidelines, or "Hate Speech" / "Improper Language")
- bad_words_found (array of the specific offensive words or slurs detected)

Content to evaluate:
"%s"`, guidelineText, content)

	reqBody := groqRequest{
		Model: groqModel,
		Messages: []groqMessage{
			{Role: "user", Content: systemPrompt},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal groq request: %w", err)
	}

	log.Printf("[Moderation] Sending prompt to Groq AI for content: %.50s...", content)

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, groqAPIURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		log.Printf("[Moderation] Groq HTTP error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read groq response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("groq API returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var groqResp groqResponse
	if err := json.Unmarshal(respBytes, &groqResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal groq response: %w", err)
	}

	if len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("empty AI response from Groq")
	}

	rawText := groqResp.Choices[0].Message.Content
	log.Printf("[Moderation] Groq AI response received for content: %.50s...", content)
	log.Printf("[Moderation] RAW Groq RESPONSE: %s", rawText)

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
	// No persistent connection to close for HTTP client
}
