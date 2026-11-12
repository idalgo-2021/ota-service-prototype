package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/pgx"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"

	"github.com/idalgo-2021/product-catalog-backend/internal/config"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run cmd/migrate/main.go <command>")
		fmt.Println("Commands: up, down, rollback, init, force <version>")
		os.Exit(1)
	}

	command := os.Args[1]

	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatalf("load environment file: %v", err)
	}

	databaseURL, err := config.BuildDatabaseURL()
	if err != nil {
		log.Fatal(err)
	}

	switch command {
	case "up":
		if err := migrateUp(databaseURL); err != nil {
			log.Fatal(err)
		}
	case "down":
		if err := migrateDown(databaseURL); err != nil {
			log.Fatal(err)
		}
	case "rollback":
		if err := migrateRollback(databaseURL); err != nil {
			log.Fatal(err)
		}
	case "init":
		if err := initDatabase(databaseURL); err != nil {
			log.Fatal(err)
		}
	case "force":
		if len(os.Args) < 3 {
			log.Fatal("Usage: go run cmd/migrate/main.go force <version>")
		}
		var version int
		if _, err := fmt.Sscanf(os.Args[2], "%d", &version); err != nil {
			log.Fatalf("invalid version: %v", err)
		}
		if err := migrateForce(databaseURL, version); err != nil {
			log.Fatal(err)
		}
	default:
		fmt.Printf("Unknown command: %s\n", command)
		fmt.Println("Commands: up, down, rollback, init, force <version>")
		os.Exit(1)
	}
}

func migrateUp(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return fmt.Errorf("failed to create driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	log.Println("Migrations applied successfully")
	return nil
}

func migrateDown(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return fmt.Errorf("failed to create driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to rollback migrations: %w", err)
	}

	log.Println("Migrations rolled back successfully")
	return nil
}

func migrateRollback(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return fmt.Errorf("failed to create driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Steps(-1); err != nil {
		return fmt.Errorf("failed to roll back the latest migration: %w", err)
	}

	log.Println("Latest migration rolled back successfully")
	return nil
}

func initDatabase(databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	driver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return fmt.Errorf("failed to create driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		// The dirty version identifies the migration that failed. Mark the
		// preceding version as current so Up retries the failed migration.
		previousVersion := int(version) - 1
		if previousVersion < 0 {
			previousVersion = -1 // golang-migrate uses -1 for a database with no applied migrations.
		}
		log.Printf("Warning: database is dirty at version %d; retrying from version %d", version, previousVersion)
		if err := m.Force(previousVersion); err != nil {
			return fmt.Errorf("failed to force version: %w", err)
		}
	} else if version == 0 {
		// Version 0 is not a migration in this project. Older recovery logic
		// could leave this value behind instead of restoring the nil version.
		log.Println("Warning: resetting empty migration version 0 to nil version")
		if err := m.Force(-1); err != nil {
			return fmt.Errorf("failed to reset nil migration version: %w", err)
		}
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	log.Println("Database initialized successfully")
	return nil
}

func migrateForce(databaseURL string, version int) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return fmt.Errorf("failed to create driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"pgx",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Force(version); err != nil {
		return fmt.Errorf("failed to force version %d: %w", version, err)
	}

	log.Printf("Migration version forced to %d successfully\n", version)
	return nil
}
