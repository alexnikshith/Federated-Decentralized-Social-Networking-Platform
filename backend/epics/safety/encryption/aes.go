package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"os"
)

// getEncryptionKey retrieves the 32-byte key from .env
func getEncryptionKey() ([]byte, error) {
	key := os.Getenv("ENCRYPTION_KEY")
	if len(key) != 32 {
		return nil, errors.New("ENCRYPTION_KEY must be exactly 32 bytes")
	}
	return []byte(key), nil
}

// Encrypt encrypts plaintext using AES-256-GCM and returns a base64 encoded string
func Encrypt(plaintext string) (string, error) {
	key, err := getEncryptionKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// For exact match searching in the database, we need deterministic encryption.
	// We generate the nonce from the SHA-256 hash of the plaintext.
	hash := sha256.Sum256([]byte(plaintext))
	nonce := hash[:aesGCM.NonceSize()]

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a base64 encoded AES-256-GCM string back to plaintext
func Decrypt(encryptedBase64 string) (string, error) {
	key, err := getEncryptionKey()
	if err != nil {
		return "", err
	}

	enc, err := base64.StdEncoding.DecodeString(encryptedBase64)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(enc) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := enc[:nonceSize], enc[nonceSize:]
	plaintextBytes, err := aesGCM.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintextBytes), nil
}
