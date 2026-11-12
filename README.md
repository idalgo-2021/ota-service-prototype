# Проект "Рыба" OTA - сервиса

---

## Структура проекта

- [`frontend/`](./frontend) — фронтенд (клиентское веб-приложение на Next.js) — см. [frontend/README.md](frontend/README.md)
- [`musya-video/`](./musya-video) — Reels-фронтенд (клиентское приложение коротких видео на Next.js) — см. [musya-video/README.md](musya-video/README.md)
- [`backend/`](./backend) — OTA-бэкенд на Go (ядро системы, каталог, бронирования, источник правды) — см. [backend/README.md](backend/README.md)
- [`ai-service/`](./ai-service) — ИИ-сервис на Python FastAPI (вспомогательный аналитический сервис и ассистент) — см. [ai-service/README.md](ai-service/README.md)

---

## Сборка и запуск через Docker

В корне репозитория настроен единый `Makefile` и `compose.yaml` для сборки компонентов в Docker и запуска всего проекта.

### Быстрый старт

1. **Создание конфигурационных файлов окружения:**
   ```bash
   make setup
   ```
   Копирует `.env.example` в `backend/.env` и `ai-service/.env`, если они ещё не созданы.

2. **Сборка всех компонентов в Docker:**
   ```bash
   make build
   ```
   (или `make build-all`).

3. **Запуск всех сервисов проекта:**
   ```bash
   make up
   ```
   Запускаются:
   - OTA Backend API: `http://localhost:8080` (Swagger: `http://localhost:8080/swagger/index.html`)
   - Клиентский фронтенд: `http://localhost:3000`
   - Musya Video Reels: `http://localhost:3002`
   - AI Service API: `http://localhost:8090`
   - PostgreSQL (PostGIS) и AI PostgreSQL

4. **Остановка сервисов:**
   ```bash
   make down
   ```

---

## Сборка отдельных компонентов в Docker

Вы можете собирать Docker-образы каждого компонента независимо:

```bash
make build-backend       # Сборка Docker-образа бэкенда (Go)
make build-frontend      # Сборка Docker-образа основного фронтенда (Next.js)
make build-musya-video   # Сборка Docker-образа Musya Video (Next.js Reels)
make build-ai-service    # Сборка Docker-образа AI-сервиса (Python FastAPI)
```

Алиасы:
- `make build-video` — алиас для `make build-musya-video`
- `make build-ai` — алиас для `make build-ai-service`

### Сборка исполняемых файлов (бинарников) внутри Docker

Если требуется скомпилировать бинарники Go (`server`, `migrate`, `maintenance`) под Linux без установки Go на локальный хост:

```bash
make build-binaries
```
Скомпилированные бинарники будут помещены в каталог `backend/bin/`.

---

## Дополнительные команды

| Команда | Описание |
|---|---|
| `make help` | Список всех доступных команд с описанием |
| `make ps` | Статус всех контейнеров |
| `make logs` | Просмотр логов всех сервисов в реальном времени |
| `make logs-backend` | Просмотр логов бэкенда |
| `make logs-frontend` | Просмотр логов фронтенда |
| `make logs-video` | Просмотр логов Musya Video |
| `make logs-ai` | Просмотр логов AI-сервиса |
| `make db-up` / `make db-down` | Запуск / остановка баз данных (PostGIS и AI Postgres) |
| `make backend-up` / `make backend-down` | Запуск / остановка сервиса бэкенда |
| `make frontend-up` / `make frontend-down` | Запуск / остановка сервиса фронтенда |
| `make video-up` / `make video-down` | Запуск / остановка Musya Video (`musya-video-up` / `down`) |
| `make ai-up` / `make ai-down` | Запуск / остановка AI-сервиса (`ai-service-up` / `down`) |
| `make db-shell` | Интерактивная консоль psql к БД бэкенда |
| `make migrate` | Применение миграций БД бэкенда |
| `make seed` | Загрузка демо-данных в БД |
| `make bootstrap` | Полная инициализация БД (запуск БД, миграции, демо-данные, пересчёт метрик) |
| `make clean` | Очистка локальных скомпилированных файлов (`backend/bin`) |
