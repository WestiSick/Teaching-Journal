package config

import (
	"fmt"
	"os"
)

// Get DB connection string from environment or use default
var DBConnectionString = getEnv("DB_CONNECTION_STRING", fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
	getEnv("DB_USER", "postgres"),
	getEnv("DB_PASSWORD", "vadimvadimvadim"),
	getEnv("DB_HOST", "localhost"),
	getEnv("DB_PORT", "5432"),
	getEnv("DB_NAME", "teacher")))

// TicketStatusValues defines the valid status values for tickets
var TicketStatusValues = []string{"Новый", "Открытый", "В работе", "Решенный", "Закрыт"}

// TicketPriorityValues defines the valid priority values for tickets
var TicketPriorityValues = []string{"Низкий", "Средний", "Высокий", "Критический"}

// TicketCategoryValues defines the valid category values for tickets
var TicketCategoryValues = []string{"Технический", "Административный", "Аккаунт", "Особенность", "Баги", "Другая"}

// AttachmentStoragePath defines where file attachments are stored
const AttachmentStoragePath = "./attachments"

// MaxFileSize defines the maximum size for uploaded files (5MB)
const MaxFileSize = 5 * 1024 * 1024

// Helper function to get environment variables with defaults
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
