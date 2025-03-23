package db

import (
	dashboardModels "TeacherJournal/app/dashboard/models"
	"TeacherJournal/app/tests/models"
	"TeacherJournal/config"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB is the global database instance
var DB *gorm.DB

// InitDB initializes the database connection and migrates the models
func InitDB() *gorm.DB {
	var err error

	// Create a new GORM DB connection
	DB, err = gorm.Open(postgres.Open(config.DBConnectionString), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Get underlying SQL DB to set connection pool settings
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get SQL DB:", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	// Add the email field to the Student table if it doesn't exist
	if !DB.Migrator().HasColumn(&dashboardModels.Student{}, "email") {
		log.Println("Adding email field to Student table...")
		err = DB.Exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(255)").Error
		if err != nil {
			log.Fatal("Failed to add email column to Student table:", err)
		}
		log.Println("Email field added successfully to Student table")
	}

	// Auto-migrate the test models
	err = DB.AutoMigrate(
		&models.Test{},
		&models.Question{},
		&models.Answer{},
		&models.TestAttempt{},
		&models.StudentResponse{},
		&models.TestGroup{}, // Добавляем новую модель для миграции
	)

	if err != nil {
		log.Fatal("Failed to auto-migrate database:", err)
	}

	// Проверка существования таблицы test_groups
	var count int64
	DB.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'test_groups'").Count(&count)

	if count == 0 {
		log.Println("Создание таблицы test_groups...")

		// Создаем таблицу вручную, если автомиграция не сработала
		err = DB.Exec(`
			CREATE TABLE IF NOT EXISTS test_groups (
				id SERIAL PRIMARY KEY,
				test_id INT NOT NULL,
				group_name VARCHAR(255) NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
				UNIQUE(test_id, group_name)
			);
		`).Error

		if err != nil {
			log.Fatal("Failed to create test_groups table:", err)
		}

		// Создаем индексы
		DB.Exec("CREATE INDEX IF NOT EXISTS idx_test_groups_test_id ON test_groups(test_id)")
		DB.Exec("CREATE INDEX IF NOT EXISTS idx_test_groups_group_name ON test_groups(group_name)")

		// Заполняем таблицу начальными данными
		DB.Exec(`
			INSERT INTO test_groups (test_id, group_name, created_at)
			SELECT t.id, s.group_name, NOW()
			FROM tests t
			CROSS JOIN (SELECT DISTINCT group_name FROM students) s
			ON CONFLICT (test_id, group_name) DO NOTHING;
		`)

		log.Println("Таблица test_groups создана и заполнена начальными данными")
	}

	log.Println("Test database models initialized successfully")
	return DB
}
