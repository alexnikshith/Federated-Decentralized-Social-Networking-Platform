package service

// httpsig.go — HTTP Signatures (RSA-SHA256) for ActivityPub
//
// Signs outgoing requests with the local user's private key and verifies
// signatures on incoming requests by fetching the sender's public key.
//
// Reference: https://tools.ietf.org/html/draft-cavage-http-signatures-12
// Mastodon signs: (request-target) host date digest

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// SignRequest adds an HTTP Signature to outgoing ActivityPub requests.
// It signs: (request-target) host date digest
//   - keyID:    the public key URL  (e.g. https://domain/users/alice#main-key)
//   - privKey:  RSA private key of the sending actor
func SignRequest(req *http.Request, keyID string, privKey *rsa.PrivateKey) error {
	// 1. Compute Digest header (SHA-256 of body)
	body := []byte{}
	if req.Body != nil {
		var err error
		body, err = io.ReadAll(req.Body)
		if err != nil {
			return fmt.Errorf("httpsig: failed to read body: %w", err)
		}
		// Restore body so it can be read again
		req.Body = io.NopCloser(strings.NewReader(string(body)))
	}
	bodyHash := sha256.Sum256(body)
	digestValue := "SHA-256=" + base64.StdEncoding.EncodeToString(bodyHash[:])
	req.Header.Set("Digest", digestValue)

	// 2. Set Date header (RFC 1123 format)
	if req.Header.Get("Date") == "" {
		req.Header.Set("Date", time.Now().UTC().Format(http.TimeFormat))
	}

	// 3. Build the signing string
	// Format: "(request-target): post /users/alice/inbox\nhost: mastodon.social\ndate: ...\ndigest: SHA-256=..."
	requestTarget := strings.ToLower(req.Method) + " " + req.URL.RequestURI()
	signingString := strings.Join([]string{
		"(request-target): " + requestTarget,
		"host: " + req.Host,
		"date: " + req.Header.Get("Date"),
		"digest: " + digestValue,
	}, "\n")

	// 4. Sign with RSA-SHA256
	h := crypto.SHA256.New()
	h.Write([]byte(signingString))
	hashed := h.Sum(nil)

	sig, err := rsa.SignPKCS1v15(rand.Reader, privKey, crypto.SHA256, hashed)
	if err != nil {
		return fmt.Errorf("httpsig: failed to sign: %w", err)
	}
	sigB64 := base64.StdEncoding.EncodeToString(sig)

	// 5. Attach Signature header
	signatureHeader := fmt.Sprintf(
		`keyId="%s",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="%s"`,
		keyID, sigB64,
	)
	req.Header.Set("Signature", signatureHeader)
	return nil
}

// VerifyRequest verifies an HTTP Signature on an incoming ActivityPub request.
// fetchPubKey is called with the keyId from the Signature header to retrieve the
// signer's public key (from cache or by fetching the remote actor).
func VerifyRequest(req *http.Request, fetchPubKey func(keyID string) (*rsa.PublicKey, error)) error {
	sigHeader := req.Header.Get("Signature")
	if sigHeader == "" {
		return fmt.Errorf("httpsig: missing Signature header")
	}

	// Parse signature header
	params, err := ParseSignatureHeader(sigHeader)
	if err != nil {
		return fmt.Errorf("httpsig: failed to parse Signature header: %w", err)
	}

	keyID := params["keyId"]
	sigB64 := params["signature"]
	headerList := params["headers"]
	if keyID == "" || sigB64 == "" {
		return fmt.Errorf("httpsig: Signature header missing keyId or signature")
	}

	// Fetch public key
	pubKey, err := fetchPubKey(keyID)
	if err != nil {
		return fmt.Errorf("httpsig: failed to fetch public key for %s: %w", keyID, err)
	}

	// Reconstruct signing string from headers list
	headers := strings.Fields(headerList)
	if len(headers) == 0 {
		headers = []string{"date"} // default per spec
	}

	var signingParts []string
	for _, hdr := range headers {
		switch hdr {
		case "(request-target)":
			signingParts = append(signingParts, "(request-target): "+strings.ToLower(req.Method)+" "+req.URL.RequestURI())
		default:
			val := req.Header.Get(hdr)
			signingParts = append(signingParts, hdr+": "+val)
		}
	}
	signingString := strings.Join(signingParts, "\n")

	// Decode signature
	sig, err := base64.StdEncoding.DecodeString(sigB64)
	if err != nil {
		return fmt.Errorf("httpsig: failed to decode signature: %w", err)
	}

	// Verify
	h := crypto.SHA256.New()
	h.Write([]byte(signingString))
	hashed := h.Sum(nil)

	if err := rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed, sig); err != nil {
		return fmt.Errorf("httpsig: signature verification failed: %w", err)
	}
	return nil
}

// ParseSignatureHeader parses an HTTP Signature header value into a key-value map.
// Example input:  keyId="https://example.com/key",algorithm="rsa-sha256",signature="abc123"
func ParseSignatureHeader(header string) (map[string]string, error) {
	result := make(map[string]string)
	parts := strings.Split(header, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		eqIdx := strings.IndexByte(part, '=')
		if eqIdx < 0 {
			continue
		}
		key := strings.TrimSpace(part[:eqIdx])
		val := strings.TrimSpace(part[eqIdx+1:])
		// Strip surrounding quotes
		if len(val) >= 2 && val[0] == '"' && val[len(val)-1] == '"' {
			val = val[1 : len(val)-1]
		}
		result[key] = val
	}
	return result, nil
}

// ParseRSAPublicKey parses a PEM-encoded RSA public key (PKIX format).
func ParseRSAPublicKey(pemStr string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("httpsig: failed to decode PEM block")
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("httpsig: failed to parse public key: %w", err)
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("httpsig: key is not RSA")
	}
	return rsaPub, nil
}

// ParseRSAPrivateKey parses a PEM-encoded PKCS1 RSA private key.
func ParseRSAPrivateKey(pemStr string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(pemStr))
	if block == nil {
		return nil, fmt.Errorf("httpsig: failed to decode PEM block")
	}
	return x509.ParsePKCS1PrivateKey(block.Bytes)
}
