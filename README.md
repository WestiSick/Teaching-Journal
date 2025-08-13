# Teaching Journal 

Teaching Journal - система для ведения школьного журнала с бэкендом на Go и веб-интерфейсом на React. Проект разбит на несколько микросервисов и поставляется с готовой Docker-инфраструктурой.

## Запуск при помощи Docker

1. Установите [Docker](https://docs.docker.com/get-docker/) и [docker-compose](https://docs.docker.com/compose/).
2. Склонируйте репозиторий:
   ```bash
   git clone https://github.com/WestiSick/Teaching-Journal.git
   cd Teaching-Journal
   ```
3. Запустите контейнеры:
   ```bash
   docker-compose up -d --build
   ```
   По умолчанию службы будут подняты на портах, указанных в `docker-compose.yml`.

## Локальная разработка

Для локального окружения предусмотрен файл `docker-compose.local.yml`. Он открывает сервисы на 80‑м порту и не требует сертификатов.

```bash
docker-compose -f docker-compose.local.yml up -d --build
```

### Запуск без Docker

1. Поднимите PostgreSQL и создайте базу данных `teacher`. Параметры подключения можно передать через переменную `DB_CONNECTION_STRING`, например:
   ```bash
   export DB_CONNECTION_STRING="postgres://postgres:password@localhost:5432/teacher?sslmode=disable"
   ```
2. Запустите нужный сервис:
   ```bash
   go run ./app/dashboard/cmd/server   # основной API
   go run ./app/schedule/cmd/server    # сервис расписания
   go run ./app/tickets/cmd/server     # сервис тикетов
   go run ./app/tests/cmd/server       # сервис тестов
   ```

### Frontend

Каждый фронтенд располагается в директории `frontend/*` и использует Vite.

```bash
cd frontend/landing   # или frontend/dashboard
npm install           # установка зависимостей
npm run dev           # запуск в режиме разработки
```

## Структура проекта

- `app/*` – исходный код бэкенд‑сервисов на Go
- `frontend/*` – фронтенд приложения на React
- `docker/` – файлы Docker и конфигурация Nginx
- `docker-compose.yml` – конфигурация контейнеров для продакшена
- `docker-compose.local.yml` – конфигурация для локальной разработки

## Развёртывание на сервере

В репозитории присутствует скрипт `deploy.sh`, который может клонировать проект, обновить контейнеры и скопировать SSL‑сертификаты. Смотрите комментарии внутри скрипта для деталей.