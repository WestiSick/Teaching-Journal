#!/bin/bash

# deploy.sh - скрипт для ручного деплоя и перезапуска сервисов
# Использование: ./deploy.sh [service_name]
# Примеры:
#   ./deploy.sh           - обновить весь проект
#   ./deploy.sh api       - обновить только api сервис
#   ./deploy.sh dashboard - обновить только frontend dashboard

set -e

# Перейти в директорию проекта
cd "$(dirname "$0")"

# Определить, какой сервис перезапускать
SERVICE="$1"

# Сохранить текущий коммит
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD)

# Обновить код с репозитория
echo "Pulling latest changes from git repository..."
git pull origin master

# Если коммит не изменился, выйти
NEW_COMMIT=$(git rev-parse HEAD)
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ] && [ -n "$SERVICE" ]; then
    echo "No new changes to deploy for $SERVICE."
    exit 0
fi

# Проверить, какие файлы изменились
CHANGED_FILES=$(git diff --name-only $CURRENT_COMMIT $NEW_COMMIT)

# Функция для проверки, изменились ли файлы в определенном пути
check_path_changed() {
    local path=$1
    echo "$CHANGED_FILES" | grep -q "$path"
    return $?
}

# Если указан конкретный сервис, перезапустить только его
if [ -n "$SERVICE" ]; then
    echo "Rebuilding and restarting $SERVICE service..."
    docker-compose up -d --build "$SERVICE"
    echo "Service $SERVICE has been updated and restarted."
    exit 0
fi

# Иначе определить, какие сервисы перезапускать на основе измененных файлов
echo "Detecting changed services..."

# Проверяем изменения в конфигурации Docker
if check_path_changed "docker/" || check_path_changed "docker-compose.yml"; then
    echo "Docker configuration changed, rebuilding all services..."
    docker-compose down
    docker-compose up -d --build
    echo "All services have been rebuilt and restarted."
    exit 0
fi

# Иначе определяем, какие конкретные сервисы перезапускать
SERVICES_TO_RESTART=""

# Проверяем изменения в backend сервисах
if check_path_changed "app/dashboard/" || check_path_changed "go.mod" || check_path_changed "go.sum"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART api"
fi

if check_path_changed "app/schedule/"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART schedule_api"
fi

if check_path_changed "app/tickets/"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART ticket_api"
fi

# Проверяем изменения во frontend
if check_path_changed "frontend/dashboard/"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART dashboard"
fi

if check_path_changed "frontend/landing/"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART landing"
fi

# Проверяем изменения в Nginx
if check_path_changed "docker/nginx/"; then
    SERVICES_TO_RESTART="$SERVICES_TO_RESTART nginx"
fi

# Перезапускаем только изменившиеся сервисы
if [ -n "$SERVICES_TO_RESTART" ]; then
    echo "Restarting changed services: $SERVICES_TO_RESTART"
    docker-compose up -d --build $SERVICES_TO_RESTART
    echo "Changed services have been rebuilt and restarted."
else
    echo "No services need to be restarted."
fi

echo "Deployment completed successfully!"