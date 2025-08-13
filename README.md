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
- Синхронизирует код Git (clone/pull) в `DEPLOY_PATH`.
- Запускает `docker compose` в режиме сборки и обновления контейнеров.

Требования к серверу:
- Установлен Docker и Docker Compose v2 (или `docker-compose`).
- Доступ по SSH по ключу для пользователя, от имени которого выполняется деплой.
- Пользователь должен иметь доступ к Docker:
  - Рекомендуемо: добавить пользователя в группу `docker` и перелогиниться:
    ```bash
    sudo usermod -aG docker $USER
    newgrp docker
    ```
  - Альтернатива: добавить секрет `SUDO_PASSWORD` и разрешить запуск Docker через `sudo`.

Необходимые секреты GitHub (Settings → Secrets and variables → Actions):
- `SSH_HOST` – адрес сервера.
- `SSH_USER` – пользователь на сервере.
- `SSH_KEY` – приватный SSH‑ключ (PEM/OPENSSH).
- `DEPLOY_PATH` – путь на сервере для выкладки, например `/opt/teaching-journal`.
- `GIT_AUTH_TOKEN` – (опционально) токен для приватного репозитория.
- `REPO_URL` – (опционально) кастомный URL репозитория.
- `SUDO_PASSWORD` – (опционально) пароль пользователя для `sudo`, если он не в группе `docker` и `sudo` требует пароль.

Примечания:
- Предупреждение Docker Compose об устаревшем ключе `version` устранено: ключ удалён из `docker-compose*.yml`.
- Именованные тома `postgres_data` и `attachments` сохраняют данные между перезапусками.

Запуск вручную (если нужно):
- Любой новый `push` в `master` запустит деплой автоматически. Статус — во вкладке Actions.
