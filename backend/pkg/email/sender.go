package email

import (
	"bytes"
	"encoding/json"
	"federated-social/backend/config"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

type EmailSender struct {
	config *config.Config
}

func NewEmailSender() *EmailSender {
	return &EmailSender{
		config: config.AppConfig,
	}
}

// resendPayload represents the JSON payload to send to Resend API
type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

// sendViaResend is a helper method to handle the HTTP request to the Resend API
func (s *EmailSender) sendViaResend(toEmail, subject, htmlBody string, customFrom string) error {
	apikey := s.config.ResendAPIKey
	if apikey == "" {
		return fmt.Errorf("RESEND_API_KEY is not configured")
	}

	fromStr := fmt.Sprintf("Nexus Security <%s>", s.config.SMTPFrom)
	if customFrom != "" {
		fromStr = fmt.Sprintf("Nexus Security <%s>", customFrom)
	}

	payload := resendPayload{
		From:    fromStr,
		To:      []string{toEmail},
		Subject: subject,
		Html:    htmlBody,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal resend payload: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apikey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to send email to %s via Resend API: %v", toEmail, err)
		return fmt.Errorf("failed to send email via HTTP: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Resend API returned error status %d: %s", resp.StatusCode, string(bodyBytes))
		return fmt.Errorf("resend API error: %s", string(bodyBytes))
	}

	log.Printf("Email sent successfully to %s via Resend", toEmail)
	return nil
}

// SendVerificationEmail sends a 2FA or verification code to the user's email.
// It uses a premium HTML template for a professional look.
func (s *EmailSender) SendVerificationEmail(toEmail, code string) error {
	subject := "Your Login Verification Code"

	// Premium Dark Theme Template
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }
        .header { background-color: #18181b; padding: 30px; text-align: center; border-bottom: 1px solid #27272a; }
        .logo { color: #fff; font-size: 24px; font-weight: 700; text-decoration: none; letter-spacing: 1px; }
        .logo span { color: #f5a524; }
        .content { padding: 40px 30px; text-align: center; color: #a1a1aa; }
        .title { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 10px; }
        .code-box { background-color: #27272a; border: 1px solid #3f3f46; border-radius: 12px; font-size: 32px; font-weight: bold; color: #f5a524; letter-spacing: 8px; padding: 20px; margin: 30px 0; display: inline-block; }
        .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
        .warning { font-size: 12px; color: #71717a; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Nexus <span>Protocol</span></div>
        </div>
        <div class="content">
            <h1 class="title">Login Verification</h1>
            <p>Enter the code below to securely sign in to your account.</p>
            
            <div class="code-box">
                %s
            </div>
            
            <p>This code will expire in 10 minutes.</p>
            
        </div>
        <div class="footer">
            &copy; 2026 Nexus Protocol. All rights reserved.<br>
            Secure Federated Social Networking
        </div>
    </div>
</body>
</html>
`, code)

	return s.sendViaResend(toEmail, subject, body, "")
}

func (s *EmailSender) SendAdminRoleNotification(toEmail, username, newRole string) error {
	subject := "Account Permission Update"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }
        .header { background-color: #18181b; padding: 30px; text-align: center; border-bottom: 1px solid #27272a; }
        .logo { color: #fff; font-size: 24px; font-weight: 700; text-decoration: none; letter-spacing: 1px; }
        .logo span { color: #f5a524; }
        .content { padding: 40px 30px; text-align: left; color: #a1a1aa; }
        .title { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
        .badge { background-color: #27272a; border: 1px solid #3f3f46; border-radius: 6px; padding: 4px 10px; color: #f5a524; font-weight: 600; }
        .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
        .button { display: inline-block; background-color: #f5a524; color: #000; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Nexus<span>Protocol</span></div>
        </div>
        <div class="content">
            <h1 class="title">Permission Update</h1>
            <p>Hello @%s,</p>
            <p>Your account permissions have been updated on Nexus Protocol. Your new role is: <span class="badge">%s</span></p>
            
            <p style="margin-top: 20px;"><strong>Important:</strong> To ensure these changes take effect correctly, please log out and log back in to your account.</p>
            
            <p>If you did not expect this change, please contact the system administrator immediately.</p>
        </div>
        <div class="footer">
            &copy; 2026 Nexus Protocol. All rights reserved.<br>
            Secure Federated Social Networking
        </div>
    </div>
</body>
</html>
`, username, newRole)

	return s.sendViaResend(toEmail, subject, body, "")
}
func (s *EmailSender) SendAccountDeactivationNotification(toEmail, username, reason string) error {
	subject := "Account Deactivation Notice"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }
        .header { background-color: #18181b; padding: 30px; text-align: center; border-bottom: 1px solid #27272a; }
        .logo { color: #fff; font-size: 24px; font-weight: 700; text-decoration: none; letter-spacing: 1px; }
        .logo span { color: #dc2626; }
        .content { padding: 40px 30px; text-align: left; color: #a1a1aa; }
        .title { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
        .badge { background-color: #27272a; border: 1px solid #dc2626; border-radius: 6px; padding: 4px 10px; color: #dc2626; font-weight: 600; }
        .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
        .reason-box { background-color: #27272a; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0; font-style: italic; color: #e4e4e7; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Nexus<span>Protocol</span></div>
        </div>
        <div class="content">
            <h1 class="title">Account Deactivated</h1>
            <p>Hello @%s,</p>
            <p>Your account has been deactivated due to a violation of our community guidelines or excessive reports.</p>
            
            <p><strong>Reason for action:</strong></p>
            <div class="reason-box">
                "%s"
            </div>
            
            <p>If you believe this is a mistake, please contact our support team immediately.</p>
        </div>
        <div class="footer">
            &copy; 2026 Nexus Protocol. All rights reserved.<br>
            Secure Federated Social Networking
        </div>
    </div>
</body>
</html>
`, username, reason)

	return s.sendViaResend(toEmail, subject, body, "")
}

// SendPasswordResetEmail sends a password reset code to the user's email.
func (s *EmailSender) SendPasswordResetEmail(toEmail, code string) error {
	subject := "Reset Your Password"

	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background-color: #09090b; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5); }
        .header { background-color: #18181b; padding: 30px; text-align: center; border-bottom: 1px solid #27272a; }
        .logo { color: #fff; font-size: 24px; font-weight: 700; text-decoration: none; letter-spacing: 1px; }
        .logo span { color: #f5a524; }
        .content { padding: 40px 30px; text-align: center; color: #a1a1aa; }
        .title { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 10px; }
        .code-box { background-color: #27272a; border: 1px solid #3f3f46; border-radius: 12px; font-size: 32px; font-weight: bold; color: #f5a524; letter-spacing: 8px; padding: 20px; margin: 30px 0; display: inline-block; }
        .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Nexus <span>Protocol</span></div>
        </div>
        <div class="content">
            <h1 class="title">Reset Your Password</h1>
            <p>You requested to reset your password. Enter the code below to proceed.</p>
            
            <div class="code-box">
                %s
            </div>
            
            <p>If you did not request this change, please ignore this email.</p>
            <p>This code will expire in 10 minutes.</p>
        </div>
        <div class="footer">
            &copy; 2026 Nexus Protocol. All rights reserved.<br>
            Secure Federated Social Networking
        </div>
    </div>
</body>
</html>
`, code)

	return s.sendViaResend(toEmail, subject, body, "")
}
