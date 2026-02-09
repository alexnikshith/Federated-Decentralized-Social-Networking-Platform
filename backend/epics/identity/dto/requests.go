package dto

// SignupRequest represents the signup request payload
type SignupRequest struct {
	Username    string `json:"username"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// VerifyOTPRequest represents the OTP verification request payload
type VerifyOTPRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token     string      `json:"token"`
	ExpiresAt string      `json:"expires_at"`
	User      interface{} `json:"user"`
}

// UpdateProfileRequest represents profile update payload
// Fields are pointers to allow partial updates (nil means no change)
type UpdateProfileRequest struct {
	DisplayName       *string `json:"display_name,omitempty"`
	Bio               *string `json:"bio,omitempty"`
	AvatarURL         *string `json:"avatar_url,omitempty"`
	ProfileVisibility *string `json:"profile_visibility,omitempty"`
}

// ChangePasswordRequest represents password change payload
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// Toggle2FARequest represents 2FA toggle payload
type Toggle2FARequest struct {
	Enable bool `json:"enable"`
}

// AddCommunityRequest represents payload for adding a joined community
type AddCommunityRequest struct {
	CommunityID string `json:"community_id"`
}

// ErrorResponse represents standard error response format
type ErrorResponse struct {
	Error   string `json:"error"`   // Short error code or type
	Message string `json:"message"` // Human readable message
}

// SuccessResponse represents standard success response format
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
