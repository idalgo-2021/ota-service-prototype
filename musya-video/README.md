# Musya Video (Reels Frontend)

Отдельное клиентское приложение для подбора отелей и впечатлений в формате вертикальных коротких видео (Reels / Stories).

## Особенности
- Автономное приложение на Next.js (Standalone), React 19 и TypeScript;
- Потоковое воспроизведение видео по протоколу HLS (`hls.js`);
- Умная предварительная буферизация 4 роликов для бесшовного свайпа;
- Встроенные модальные окна выбора дат, гостей, фильтров и оформления бронирования;
- Проксирование запросов к бэкенду: `/api/*` → `<BACKEND_URL>/api/v1/*`.

## Локальный запуск

```bash
cd musya-video
npm install
npm run dev
```

Приложение доступно по адресу `http://localhost:3002`.

Если бэкенд запущен на другом порту/хосте:
```bash
BACKEND_URL=http://localhost:8080 npm run dev -- -p 3002
```

## Запуск в Docker Compose
Сервис `musya-video` включён в основной `compose.yaml`:
```bash
docker compose up -d --build musya-video
```
Порт по умолчанию: `3002`.
