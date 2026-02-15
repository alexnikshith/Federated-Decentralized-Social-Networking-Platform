package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// TestEvent represents a single line of JSON output from go test -json
type TestEvent struct {
	Time    string  `json:"Time"`
	Action  string  `json:"Action"`
	Package string  `json:"Package"`
	Test    string  `json:"Test"`
	Output  string  `json:"Output"`
	Elapsed float64 `json:"Elapsed"`
}

// UserStoryMap maps test names to User Stories
var UserStoryMap = map[string]string{
	"TestHeartbeat":                "User Story: Track User Activity (Heartbeat)",
	"TestRecordActivity":           "User Story: Track User Activity (Service)",
	"TestGetReport":                "User Story: View Activity Reports",
	"TestGetUserActivityReport":    "User Story: View Activity Reports",
	"TestSubmitUserReport":         "User Story: Submit User Report",
	"TestGetAdminReports":          "User Story: Admin Review Reports",
	"TestGetInteractionReport":     "User Story: View Interaction Stats (Received)",
	"TestGetInteractionMadeReport": "User Story: View Interaction Stats (Made)",
	"TestGetFederationStats":       "User Story: View Federation Stats",
	"TestGetFederationReports":     "User Story: View Federation Stats", // Service method
	"TestGetInteractionsMade":      "User Story: View Interaction Stats (Made)",
	"TestGetInteractionsReceived":  "User Story: View Interaction Stats (Received)",
	"TestCountReports":             "User Story: Admin Review Reports",
	"TestDeactivateUser":           "User Story: Admin Moderation",
}

type StoryStats struct {
	Name   string
	Passed int
	Failed int
}

func main() {
	fmt.Println("Running Backend Unit Tests for Reports Epic...")

	// 1. Run go test with -json flag
	// Adjusted path to run from backend directory
	cmd := exec.Command("go", "test", "./epics/reports/...", "-json")
	cmd.Dir = "backend" // Ensure we run from the module root
	cmd.Stderr = os.Stderr

	// Create pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Printf("Error creating stdout pipe: %v\n", err)
		os.Exit(1)
	}

	if err := cmd.Start(); err != nil {
		fmt.Printf("Error starting go test: %v\n", err)
		os.Exit(1)
	}

	// 2. Parse JSON output
	stats := make(map[string]*StoryStats)
	scanner := bufio.NewScanner(stdout)

	// Initialize stats for known stories
	for _, story := range UserStoryMap {
		if _, exists := stats[story]; !exists {
			stats[story] = &StoryStats{Name: story}
		}
	}
	// Add a catch-all for others
	stats["Other/Utility"] = &StoryStats{Name: "Other/Utility"}

	for scanner.Scan() {
		line := scanner.Bytes()
		var event TestEvent
		if err := json.Unmarshal(line, &event); err != nil {
			continue // Skip non-JSON lines
		}

		if event.Test != "" && (event.Action == "pass" || event.Action == "fail") {
			// Determine User Story
			storyName := "Other/Utility"

			// Exact match or prefix match (for table-driven subtests)
			// e.g. TestHeartbeat/Success -> maps to TestHeartbeat
			parentTest := strings.Split(event.Test, "/")[0]
			if val, ok := UserStoryMap[parentTest]; ok {
				storyName = val
			}

			if _, exists := stats[storyName]; !exists {
				stats[storyName] = &StoryStats{Name: storyName}
			}

			if event.Action == "pass" {
				stats[storyName].Passed++
			} else {
				stats[storyName].Failed++
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		// go test returns non-zero if tests fail, which is expected.
		// We define our own exit code based on parsing.
	}

	// 3. Generate Tabular Report
	fmt.Println("\n--- Backend Test Report ---")
	// Header
	fmt.Printf("%-40s %-30s %-30s\n", "User Stories Tested", "Number of Test Cases Passed", "Number of Test Cases Failed")
	fmt.Println("---------------------------------------- ------------------------------ ------------------------------")

	totalPassed := 0
	totalFailed := 0

	for _, story := range stats {
		if story.Passed == 0 && story.Failed == 0 {
			continue
		}
		fmt.Printf("%-40s %-30d %-30d\n", story.Name, story.Passed, story.Failed)
		totalPassed += story.Passed
		totalFailed += story.Failed
	}

	fmt.Println("---------------------------------------- ------------------------------ ------------------------------")
	fmt.Printf("%-40s %-30d %-30d\n", "TOTAL", totalPassed, totalFailed)

	if totalFailed > 0 {
		os.Exit(1)
	}
}
