DOCKER ?= docker
COMPOSE_ENV_FILE := $(shell test -f backend/.env && echo "--env-file backend/.env")
COMPOSE ?= docker compose $(COMPOSE_ENV_FILE)

IMAGE_PREFIX ?= ota
IMAGE_TAG ?= latest
BACKEND_URL ?= http://backend:8080

.PHONY: help setup \
	build build-all build-backend build-frontend build-musya-video build-video build-ai-service build-ai \
	build-binaries build-backend-bin compose-build \
	up down restart ps logs logs-backend logs-frontend logs-video logs-musya-video logs-ai \
	backend-up backend-down frontend-up frontend-down \
	musya-video-up musya-video-down video-up video-down \
	ai-service-up ai-service-down ai-up ai-down \
	db-up db-down db-shell migrate seed bootstrap maintenance-recalculate-listing-distances maintenance-refresh-listing-ratings clean

.DEFAULT_GOAL := help

help: ## Показать доступные команды
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'

setup: ## Создать локальные файлы окружения .env (если отсутствуют)
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f ai-service/.env || cp ai-service/.env.example ai-service/.env
	@echo "Файлы окружения проверены/созданы (backend/.env, ai-service/.env)."

# ==============================================================================
# Сборка компонентов в Docker контейнерах
# ==============================================================================

build: build-all ## Собрать Docker-образы всех компонентов проекта

build-all: build-backend build-frontend build-musya-video build-ai-service ## Собрать Docker-образы всех компонентов (backend, frontend, musya-video, ai-service)

build-backend: ## Собрать Docker-образ бэкенда (Go)
	@echo "==> Сборка Docker-образа бэкенда ($(IMAGE_PREFIX)-backend:$(IMAGE_TAG))..."
	$(DOCKER) build -t $(IMAGE_PREFIX)-backend:$(IMAGE_TAG) -f backend/Dockerfile backend

build-frontend: ## Собрать Docker-образ фронтенда (Next.js)
	@echo "==> Сборка Docker-образа фронтенда ($(IMAGE_PREFIX)-frontend:$(IMAGE_TAG))..."
	$(DOCKER) build -t $(IMAGE_PREFIX)-frontend:$(IMAGE_TAG) --build-arg BACKEND_URL=$(BACKEND_URL) -f frontend/Dockerfile frontend

build-musya-video: ## Собрать Docker-образ Musya Video (Next.js Reels)
	@echo "==> Сборка Docker-образа Musya Video ($(IMAGE_PREFIX)-musya-video:$(IMAGE_TAG))..."
	$(DOCKER) build -t $(IMAGE_PREFIX)-musya-video:$(IMAGE_TAG) --build-arg BACKEND_URL=$(BACKEND_URL) -f musya-video/Dockerfile musya-video

build-video: build-musya-video ## Алиас для сборки musya-video

build-ai-service: ## Собрать Docker-образ AI-сервиса (Python FastAPI)
	@echo "==> Сборка Docker-образа AI-сервиса ($(IMAGE_PREFIX)-ai-service:$(IMAGE_TAG))..."
	$(DOCKER) build -t $(IMAGE_PREFIX)-ai-service:$(IMAGE_TAG) -f ai-service/Dockerfile ai-service

build-ai: build-ai-service ## Алиас для сборки ai-service

build-binaries: ## Скомпилировать бинарники бэкенда в Docker-контейнере (без локального Go)
	@echo "==> Компиляция бинарников Go бэкенда внутри контейнера golang:1.25-alpine..."
	@mkdir -p backend/bin
	$(DOCKER) run --rm \
		-u $$(id -u):$$(id -g) \
		-e CGO_ENABLED=0 \
		-e GOOS=linux \
		-e GOCACHE=/tmp/gocache \
		-e GOPATH=/tmp/gopath \
		-v "$$(pwd)/backend:/app" \
		-w /app \
		golang:1.25-alpine \
		sh -c "go build -ldflags='-s -w' -o bin/server ./cmd/server && \
		       go build -ldflags='-s -w' -o bin/migrate ./cmd/migrate && \
		       go build -ldflags='-s -w' -o bin/maintenance ./cmd/maintenance"
	@echo "==> Бинарники успешно собраны в каталоге backend/bin/ (server, migrate, maintenance)."

build-backend-bin: build-binaries ## Алиас для сборки бинарников бэкенда

compose-build: ## Собрать все образы через Docker Compose
	$(COMPOSE) build

# ==============================================================================
# Управление запуском через Docker Compose
# ==============================================================================

up: ## Собрать и запустить все сервисы в Docker Compose
	$(COMPOSE) up -d --build

down: ## Остановить и удалить все контейнеры проекта
	$(COMPOSE) down

restart: ## Перезапустить все сервисы проекта
	$(COMPOSE) restart

ps: ## Показать статус контейнеров
	$(COMPOSE) ps

logs: ## Просмотр логов всех сервисов (в реальном времени)
	$(COMPOSE) logs -f

logs-backend: ## Просмотр логов бэкенда
	$(COMPOSE) logs -f backend

logs-frontend: ## Просмотр логов фронтенда
	$(COMPOSE) logs -f frontend

logs-video: ## Просмотр логов Musya Video
	$(COMPOSE) logs -f musya-video

logs-musya-video: logs-video ## Алиас для логов Musya Video

logs-ai: ## Просмотр логов AI-сервиса
	$(COMPOSE) logs -f ai-service

# ==============================================================================
# Управление отдельными сервисами (включение / выключение)
# ==============================================================================

backend-up: ## Запустить сервис бэкенда (с зависимостями: БД и миграции)
	$(COMPOSE) up -d backend

backend-down: ## Остановить сервис бэкенда
	$(COMPOSE) stop backend

frontend-up: ## Запустить сервис фронтенда
	$(COMPOSE) up -d frontend

frontend-down: ## Остановить сервис фронтенда
	$(COMPOSE) stop frontend

musya-video-up: ## Запустить сервис Musya Video (Reels)
	$(COMPOSE) up -d musya-video

musya-video-down: ## Остановить сервис Musya Video (Reels)
	$(COMPOSE) stop musya-video

video-up: musya-video-up ## Алиас для запуска musya-video

video-down: musya-video-down ## Алиас для остановки musya-video

ai-service-up: ## Запустить AI-сервис (с зависимостью: AI БД)
	$(COMPOSE) up -d ai-service

ai-service-down: ## Остановить AI-сервис
	$(COMPOSE) stop ai-service

ai-up: ai-service-up ## Алиас для запуска ai-service

ai-down: ai-service-down ## Алиас для остановки ai-service

# ==============================================================================
# База данных и утилиты
# ==============================================================================

db-up: ## Запустить только базы данных (PostGIS и AI Postgres)
	$(COMPOSE) up -d db ai-db

db-down: ## Остановить базы данных
	$(COMPOSE) stop db ai-db

db-shell: ## Открыть psql-консоль к БД бэкенда в контейнере
	$(COMPOSE) exec db sh -c 'exec psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

migrate: ## Применить миграции БД бэкенда через контейнер
	$(COMPOSE) run --rm migrate

seed: migrate ## Загрузить демонстрационные данные в БД бэкенда
	@set -eu; \
	echo "Подготовка медиафайлов демонстрационных видео..."; \
	mkdir -p backend/_media; \
	if [ -d "musya-video/public/videos/hls" ]; then \
		for id in 01 02 03 04; do \
			if [ -d "musya-video/public/videos/hls/$$id" ]; then \
				cp -rn "musya-video/public/videos/hls/$$id" backend/_media/ 2>/dev/null || cp -r "musya-video/public/videos/hls/$$id" backend/_media/; \
			fi; \
		done; \
	fi; \
	for script in \
		backend/scripts/seed_users.sql \
		backend/scripts/seed_listings.sql \
		backend/scripts/seed_listing_feature_tags.sql \
		backend/scripts/seed_articles.sql \
		backend/scripts/seed_hoteliers.sql \
		backend/scripts/seed_hotelier_messages.sql \
		backend/scripts/seed_currency_rates.sql \
		backend/scripts/seed_bookings.sql \
		backend/scripts/seed_products.sql \
		backend/scripts/seed_orders.sql \
		backend/scripts/seed_reviews.sql \
		backend/scripts/seed_feed_videos.sql; do \
		echo "Применение $$script..."; \
		$(COMPOSE) exec -T db sh -c 'exec psql -q -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$$script"; \
	done

bootstrap: db-up migrate seed maintenance-recalculate-listing-distances maintenance-refresh-listing-ratings ## Инициализировать БД: запуск БД, миграции, сиды и пересчет метрик

maintenance-recalculate-listing-distances: ## Пересчитать расстояния объектов до центров локаций
	$(COMPOSE) run --rm maintenance recalculate-listing-distances $(if $(ARGS),$(ARGS),--all)

maintenance-refresh-listing-ratings: ## Пересчитать рейтинги объектов по опубликованным отзывам
	$(COMPOSE) run --rm maintenance refresh-listing-ratings

clean: ## Удалить собранные локальные бинарники и временные файлы
	@rm -rf backend/bin
	@echo "Локальные артефакты сборки очищены."
