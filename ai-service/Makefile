PYTHON ?= python3
VENV := .venv
BIN := $(VENV)/bin

.PHONY: help setup install build up down logs db-up db-down db-logs run worker-once worker-import-once worker-summarize-once worker-disappointment-import-once worker-disappointment-detect-once migrate lint

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "%-32s %s\n", $$1, $$2}'

setup: ## Create the local virtual environment and local config
	@test -d $(VENV) || $(PYTHON) -m venv $(VENV)
	@test -f .env || cp .env.example .env
	$(BIN)/python -m pip install --upgrade pip
	$(BIN)/pip install -r requirements-dev.txt
	$(BIN)/pip install -e .

install: ## Install dependencies into the existing virtual environment
	$(BIN)/pip install -r requirements-dev.txt
	$(BIN)/pip install -e .

build: ## Build the AI service Docker image
	docker compose build

up: ## Start the entire AI service in Docker (DB + API)
	docker compose up -d

down: ## Stop all AI service Docker containers (DB and API)
	docker compose down

logs: ## Follow logs of all AI service Docker containers
	docker compose logs -f

db-up: ## Start only the AI PostgreSQL container
	docker compose up -d ai-db

db-down: ## Stop the AI PostgreSQL container
	docker compose stop ai-db

db-logs: ## Follow logs of the AI PostgreSQL container
	docker compose logs -f ai-db

run: ## Run the HTTP API locally
	$(BIN)/uvicorn ai_service.main:app --reload --host 0.0.0.0 --port 8090

worker-once: ## Run one review reconciliation and summary generation pass
	$(BIN)/python -m ai_service.worker --stage all

worker-import-once: ## Import up to 50 newest reviews for each eligible listing
	$(BIN)/python -m ai_service.worker --stage import

worker-summarize-once: ## Summarize imported review samples for eligible listings
	$(BIN)/python -m ai_service.worker --stage summarize

worker-disappointment-import-once: ## Import the current OTA listing snapshot for disappointment analysis
	$(BIN)/python -m ai_service.worker --stage disappointment-import

worker-disappointment-detect-once: ## Analyze imported listing snapshots and generate recommendations
	$(BIN)/python -m ai_service.worker --stage disappointment-detect

migrate: ## Apply AI-service database migrations
	$(BIN)/alembic upgrade head

lint: ## Check formatting and lint the application
	$(BIN)/ruff check src
	$(BIN)/ruff format --check src
