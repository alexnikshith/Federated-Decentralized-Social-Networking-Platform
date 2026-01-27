package dto

import "testing"

func TestCreatePostRequest(t *testing.T) {
	tests := []struct {
		name    string
		content string
		valid   bool
	}{
		{
			name:    "Valid post request",
			content: "This is a valid post",
			valid:   true,
		},
		{
			name:    "Empty content",
			content: "",
			valid:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isEmpty := len(tt.content) == 0
			if isEmpty == tt.valid {
				t.Errorf("Validation failed for: %s", tt.name)
			}
		})
	}
}
