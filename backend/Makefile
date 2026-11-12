.PHONY: help setup build up down restart logs logs-backend db-up db-down db-restart db-ps db-logs db-shell run migrate migrate-rollback seed bootstrap maintenance-expire-orders maintenance-review-drafts maintenance-recalculate-listing-distances maintenance-refresh-listing-ratings maintenance-import-review-summaries maintenance-import-disappointment-analyses maintenance-sync-disappointment-notifications swagger test lint

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "%-45s %s\n", $$1, $$2}'

setup: ## Create local .env configuration if missing
	@test -f .env || cp .env.example .env
	@echo "Local .env file created or already exists. Verify credentials and settings."

build: ## Build the backend Docker image
	docker compose build

up: ## Build and start the entire backend stack in Docker (DB, migrations, API)
	docker compose up -d --build

down: ## Stop all backend Docker containers (DB and API)
	docker compose down

restart: ## Restart backend API container
	docker compose restart backend

logs: ## Follow logs of all backend containers
	docker compose logs -f

logs-backend: ## Follow logs of backend API container
	docker compose logs -f backend

db-up: ## Start only PostgreSQL PostGIS container
	docker compose up -d db

db-down: ## Stop PostgreSQL container
	docker compose stop db

db-restart: ## Restart PostgreSQL container
	docker compose restart db

db-ps: ## Show status of PostgreSQL container
	docker compose ps db

db-logs: ## Follow logs of PostgreSQL container
	docker compose logs -f db

db-shell: ## Open psql shell inside PostgreSQL container
	docker compose exec db sh -c 'exec psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

run: ## Run HTTP API locally with Go
	go run ./cmd/server

migrate: ## Apply database migrations
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/migrate init; \
	else \
		docker compose run --rm migrate; \
	fi

migrate-rollback: ## Rollback the last applied database migration
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/migrate rollback; \
	else \
		docker compose run --rm migrate rollback; \
	fi

seed: ## Load demo seed data (users, listings, articles, products, bookings) into DB
	@set -eu; \
	echo "Preparing demo video media files..."; \
	mkdir -p _media; \
	if [ -d "../musya-video/public/videos/hls" ]; then \
		for id in 01 02 03 04; do \
			if [ -d "../musya-video/public/videos/hls/$$id" ]; then \
				cp -rn "../musya-video/public/videos/hls/$$id" _media/ 2>/dev/null || cp -r "../musya-video/public/videos/hls/$$id" _media/; \
			fi; \
		done; \
	fi; \
	for script in \
		scripts/seed_users.sql \
		scripts/seed_listings.sql \
		scripts/seed_listing_feature_tags.sql \
		scripts/seed_articles.sql \
		scripts/seed_hoteliers.sql \
		scripts/seed_hotelier_messages.sql \
		scripts/seed_currency_rates.sql \
		scripts/seed_bookings.sql \
		scripts/seed_products.sql \
		scripts/seed_orders.sql \
		scripts/seed_reviews.sql \
		scripts/seed_feed_videos.sql; do \
		echo "Applying $$script..."; \
		docker compose exec -T db sh -c 'exec psql -q -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$$script"; \
	done

bootstrap: db-up migrate seed maintenance-recalculate-listing-distances maintenance-refresh-listing-ratings ## Start DB, apply migrations, seed demo data and recalculate metrics

maintenance-expire-orders: ## Expire pending orders older than configured lifetime
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/maintenance expire-orders; \
	else \
		docker compose run --rm maintenance expire-orders; \
	fi

maintenance-review-drafts: ## Create review drafts and close outdated ones
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/maintenance review-drafts; \
	else \
		docker compose run --rm maintenance review-drafts; \
	fi

maintenance-recalculate-listing-distances: ## Recalculate listing distances to location centers
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/maintenance recalculate-listing-distances $(if $(ARGS),$(ARGS),--all); \
	else \
		docker compose run --rm maintenance recalculate-listing-distances $(if $(ARGS),$(ARGS),--all); \
	fi

maintenance-refresh-listing-ratings: ## Recalculate listing ratings based on published reviews
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/maintenance refresh-listing-ratings; \
	else \
		docker compose run --rm maintenance refresh-listing-ratings; \
	fi

maintenance-import-review-summaries: ## Import review summaries from AI service into OTA
	go run ./cmd/maintenance import-review-summaries $(ARGS)

maintenance-import-disappointment-analyses: ## Import disappointment analyses from AI service into OTA
	go run ./cmd/maintenance import-disappointment-analyses $(ARGS)

maintenance-sync-disappointment-notifications: ## Generate or update notifications for hoteliers
	@if command -v go >/dev/null 2>&1; then \
		go run ./cmd/maintenance sync-disappointment-notifications; \
	else \
		docker compose run --rm maintenance sync-disappointment-notifications; \
	fi

swagger: ## Regenerate Swagger/OpenAPI documentation
	swag init -g cmd/server/main.go -o docs

test: ## Run Go tests
	go test -v ./...

lint: ## Run Go vet and static checks
	go vet ./...
