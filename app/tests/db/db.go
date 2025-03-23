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
	)

	if err != nil {
		log.Fatal("Failed to auto-migrate database:", err)
	}

	log.Println("Test database models initialized successfully")
	return DB
}
