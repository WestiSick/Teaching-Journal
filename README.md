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

## Автодеплой через GitHub Actions

В репозитории настроен workflow `.github/workflows/deploy.yml`, который при `push` в ветку `master` автоматически деплоит проект на сервер по SSH и выполняет `docker compose up -d --build`.

Что делает workflow:
- Подключается к серверу по SSH.
- Подготавливает директорию деплоя (очищает и пересоздаёт).
- Копирует содержимое репозитория на сервер.
- Запускает `docker compose` в режиме сборки и обновления контейнеров.

Требования к серверу:
- Установлен Docker и Docker Compose v2 (команда `docker compose`). Если установлена утилита `docker-compose`, workflow автоматически использует её.
- Доступ по SSH по ключу для пользователя, от имени которого выполняется деплой.
- Открыт TCP 80 (для Nginx) и необходимые порты БД/сервисов, если вы обращаетесь к ним извне.

Необходимые секреты GitHub (Settings → Secrets and variables → Actions):
- `SSH_HOST` – адрес сервера.
- `SSH_USER` – пользователь на сервере.
- `SSH_KEY` – приватный SSH‑ключ (PEM/OPENSSH), соответствующий публичному ключу, добавленному в `~/.ssh/authorized_keys` на сервере.
- `SSH_PORT` – необязательный порт SSH (по умолчанию 22).
- `DEPLOY_PATH` – путь на сервере, куда раскатывается репозиторий, например `/opt/teaching-journal`.

Примечания:
- Для продакшена убедитесь, что в `docker-compose.yml` подключается корректный конфиг Nginx. Сейчас используется `docker/nginx/conf.d/default.local.conf`. При необходимости замените на `default.conf` и перезапустите деплой.
- Именованные тома `postgres_data` и `attachments` сохраняют данные между перезапусками.

Запуск вручную (если нужно):
- Любой новый `push` в `master` запустит деплой автоматически. Статус смотрите во вкладке Actions в GitHub.
