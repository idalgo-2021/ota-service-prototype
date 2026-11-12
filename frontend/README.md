# Фронтенд OTA

Клиентское приложение для поиска и бронирования жилья, заказов продуктов и общения с ИИ-ассистентом.

**Фронтенд получает данные и выполняет действия через OTA backend. К AI API браузер напрямую не обращается.**

## Особенности

- приложение построено на Next.js, React и TypeScript;
- запросы `/api/*` проксируются через Next.js в OTA backend;
- backend проверяет JWT и передаёт запросы ассистента в AI-сервис;
- для локальной работы чата AI-сервис должен быть доступен backend по адресу `AI_SERVICE_BASE_URL` из `backend/.env`.

----

*Технические детали реализации фронтенда:*

- маршруты приложения находятся в `src/app`;
- страницы и пользовательские сценарии собраны в `src/views`;
- запросы к backend проксируются правилом из `next.config.ts`:
  `/api/:path*` → `${BACKEND_URL}/api/v1/:path*`;
- по умолчанию `BACKEND_URL` равен `http://localhost:8080`;
- внутри Docker Compose фронтенд собирается с `BACKEND_URL=http://backend:8080`.

## Локальный запуск

Требуются Node.js 20.9+ и npm 10+. Из корня репозитория выполните:

```bash
cd frontend
npm ci
npm run dev
```

Приложение будет доступно на `http://localhost:3000`. Если backend запущен на другом адресе, задайте `BACKEND_URL`:

```bash
BACKEND_URL=http://localhost:8081 npm run dev
```

## Запуск через Docker Compose

Из корня репозитория выполните:

```bash
make up
```

Команда запускает фронтенд вместе с backend и AI-сервисом. Сайт доступен на `http://localhost:3000`. Чтобы изменить порт на хосте:

```bash
FRONTEND_PORT=3001 make up
```

## Полезные команды

- `npm run dev` — запустить сервер разработки;
- `npm run build` — собрать production-версию;
- `npm run start` — запустить production-сборку;
- `npm run lint` — проверить код ESLint;
- `npm run format` — отформатировать файлы Prettier;
- `npm run format:check` — проверить форматирование без изменения файлов.
