#!/bin/bash
#
# Скрипт для ручного деплоя проекта и перезапуска сервисов
# Использование:
#   ./deploy.sh           - обновить весь проект
#   ./deploy.sh api       - обновить только api сервис
#   ./deploy.sh dashboard - обновить только frontend dashboard

set -e

# Перейти в директорию проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

# Определить, какой сервис перезапускать
SERVICE="$1"

# Сохранить текущий коммит
git fetch origin
CURRENT_COMMIT=$(git rev-parse HEAD || echo "initial")

# Обновить код с репозитория
echo "Pulling latest changes from git repository..."
git pull origin master

# Если коммит не изменился, выйти
NEW_COMMIT=$(git rev-parse HEAD)
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ] && [ -n "$SERVICE" ]; then
    echo "No new changes to deploy for $SERVICE."
    exit 0
fi

# Функция безопасного перезапуска сервиса
safe_restart_service() {
  local service=$1
  echo "Safely restarting service: $service"

  # Проверяем существование контейнера
  if docker-compose ps -q "$service" > /dev/null 2>&1; then
    echo "Stopping and removing existing container..."
    # Останавливаем и удаляем контейнер, игнорируя ошибки
    docker-compose stop "$service" || true
    docker-compose rm -f "$service" || true
  fi

  # Принудительно удаляем контейнер, если он все еще существует
  CONTAINER_NAME="teacher_journal_${service}"
  if docker ps -a -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    echo "Forcing removal of container $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" || true
  fi

  # Пересоздаем контейнер
  echo "Rebuilding and starting container..."
  docker-compose up -d --build "$service"

  # Проверяем статус
  if [ $? -eq 0 ]; then
    echo "✅ Service $service successfully restarted"
  else
    echo "❌ Failed to restart service $service"
    # Дополнительная отладочная информация
    echo "Showing Docker Compose logs for service $service:"
    docker-compose logs --tail=50 "$service"
    return 1
  fi
}

# Если указан конкретный сервис, перезапустить только его
if [ -n "$SERVICE" ]; then
    echo "Rebuilding and restarting $SERVICE service..."
    safe_restart_service "$SERVICE"
    echo "Service $SERVICE has been updated and restarted."
    exit 0
fi

# Проверяем изменения в конфигурации Docker
CHANGED_FILES=$(git diff --name-only $CURRENT_COMMIT $NEW_COMMIT)
if echo "$CHANGED_FILES" | grep -q -E "docker/|docker-compose.yml"; then
    echo "Docker configuration changed, rebuilding all services..."

    # Останавливаем все контейнеры
    docker-compose down --remove-orphans

    # Удаляем неиспользуемые образы и объемы, чтобы очистить систему
    docker system prune -f

    # Перезапускаем все с чистого листа
    docker-compose up -d --build

    echo "All services have been rebuilt and restarted."
    exit 0
fi

# Функция для проверки, изменились ли файлы в определенном пути
check_path_changed() {
    local path=$1
    echo "$CHANGED_FILES" | grep -q "$path"
    return $?
}

# Определяем, какие сервисы перезапускать
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

    # Перезапускаем каждый сервис отдельно
    for service in $SERVICES_TO_RESTART; do
      safe_restart_service "$service"
    done

    echo "Changed services have been rebuilt and restarted."
else
    echo "No services need to be restarted."
fi

echo "Deployment completed successfully!"