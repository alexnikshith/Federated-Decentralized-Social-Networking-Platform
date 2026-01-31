package email

import (
	"federated-social/backend/config"
	"fmt"
	"log"
	"net/smtp"
)

type EmailSender struct {
	config *config.Config
}

func NewEmailSender() *EmailSender {
	return &EmailSender{
		config: config.AppConfig,
	}
}

func (s *EmailSender) SendVerificationEmail(toEmail, code string) error {
	// Use the authenticated user as the sender to avoid spoofing issues with Gmail,
	// but add a Display Name "Nexus Security"
	fromEmail := s.config.SMTPUser
	password := s.config.SMTPPassword
	host := s.config.SMTPHost
	port := s.config.SMTPPort
	address := host + ":" + port

	// Email Headers
	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("Nexus Security <%s>", fromEmail)
	headers["To"] = toEmail
	headers["Subject"] = "Your Login Verification Code"
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=\"UTF-8\""

	headerStr := ""
	for k, v := range headers {
		headerStr += fmt.Sprintf("%s: %s\r\n", k, v)
	}

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
            <div class="logo">Nexus<span>Protocol</span></div>
        </div>
        <div class="content">
            <h1 class="title">Login Verification</h1>
            <p>Enter the code below to securely sign in to your account.</p>
            
            <div class="code-box">
                %s
            </div>
            
            <p>This code will expire in 10 minutes.</p>
            <p class="warning">If you requested this code, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            &copy; 2026 Nexus Protocol. All rights reserved.<br>
            Secure Federated Social Networking
        </div>
    </div>
</body>
</html>
`, code)

	msg := []byte(headerStr + "\r\n" + body)

	auth := smtp.PlainAuth("", s.config.SMTPUser, password, host)

	log.Printf("Attempting to send email to %s via %s", toEmail, address)

	// Note: We use s.config.SMTPUser as the 'from' address in SendMail to match authentication
	err := smtp.SendMail(address, auth, s.config.SMTPUser, []string{toEmail}, msg)
	if err != nil {
		log.Printf("Failed to send email: %v", err)
		return fmt.Errorf("failed to send email: %v", err)
	}

	log.Printf("Email sent successfully to %s", toEmail)
	return nil
}
