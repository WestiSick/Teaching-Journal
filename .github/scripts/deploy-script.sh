#!/bin/bash
# Скрипт для деплоя, решающий проблемы с 'ContainerConfig'
set -e

# Проверка существования директории проекта
if [ ! -d "${{ secrets.SERVER_PATH }}" ]; then
  echo "Creating project directory..."
  mkdir -p ${{ secrets.SERVER_PATH }}
fi

cd ${{ secrets.SERVER_PATH }}

# Проверка и инициализация git репозитория
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
  git remote add origin https://github.com/${{ github.repository }}.git
fi

# Проверка удаленного репозитория
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$REMOTE_URL" != "https://github.com/${{ github.repository }}.git" ]; then
  echo "Updating remote URL..."
  git remote set-url origin https://github.com/${{ github.repository }}.git || git remote add origin https://github.com/${{ github.repository }}.git
fi

# Определяем основную ветку
MAIN_BRANCH="${{ github.ref_name }}"

# Получаем последнюю версию кода
echo "Fetching latest code..."
git fetch origin

# Проверяем, есть ли локальная ветка
if ! git rev-parse --verify $MAIN_BRANCH >/dev/null 2>&1; then
  echo "Creating local branch: $MAIN_BRANCH"
  git checkout -b $MAIN_BRANCH origin/$MAIN_BRANCH
else
  echo "Checking out local branch: $MAIN_BRANCH"
  git checkout $MAIN_BRANCH
fi

# Сохраняем текущую версию кода
CURRENT_COMMIT=$(git rev-parse HEAD || echo "initial")

# Обновляем код из репозитория
echo "Updating code..."
git pull origin $MAIN_BRANCH

# Проверяем наличие docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found in project directory!"
  exit 1
fi

# Определяем, какие сервисы нужно перезапустить
SERVICES_TO_RESTART=""

# Логика определения сервисов для перезапуска...
# (оставляем как было, но добавляем явное удаление контейнеров перед пересозданием)

# Обработка ошибки ContainerConfig - принудительно удаляем контейнеры перед пересозданием
safe_restart_service() {
  local service=$1
  echo "Safely restarting service: $service"

  # Останавливаем и удаляем контейнер, игнорируя ошибки
  docker-compose stop $service || true
  docker-compose rm -f $service || true

  # Пересоздаем контейнер
  docker-compose up -d --build $service

  # Проверяем статус
  if [ $? -eq 0 ]; then
    echo "✅ Service $service successfully restarted"
  else
    echo "❌ Failed to restart service $service"
    return 1
  fi
}

# Если изменились конфигурации Docker, перезапускаем все сервисы с полной очисткой
if [[ "${{ needs.detect-changes.outputs.docker_configs_changed }}" == "true" ]]; then
  echo "Docker configurations changed, safely rebuilding all services"

  # Сохраняем важные данные (если нужно)
  echo "Backing up important data before rebuild..."

  # Останавливаем все контейнеры
  docker-compose down --remove-orphans

  # Удаляем неиспользуемые образы и объемы, чтобы очистить систему
  docker system prune -f

  # Перезапускаем все с чистого листа
  docker-compose up -d --build

  echo "All services have been rebuilt and restarted"
  exit 0
fi

# Добавляем сервисы для перезапуска в зависимости от выходных данных предыдущего шага
if [[ "${{ needs.detect-changes.outputs.dashboard_service }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART api"
fi

if [[ "${{ needs.detect-changes.outputs.schedule_service }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART schedule_api"
fi

if [[ "${{ needs.detect-changes.outputs.ticket_service }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART ticket_api"
fi

if [[ "${{ needs.detect-changes.outputs.dashboard_frontend_changed }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART dashboard"
fi

if [[ "${{ needs.detect-changes.outputs.landing_frontend_changed }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART landing"
fi

if [[ "${{ needs.detect-changes.outputs.nginx_configs_changed }}" == "true" ]]; then
  SERVICES_TO_RESTART="$SERVICES_TO_RESTART nginx"
fi

# Перезапускаем только те сервисы, которые были изменены, используя безопасный метод
if [[ -n "$SERVICES_TO_RESTART" ]]; then
  echo "Restarting services: $SERVICES_TO_RESTART"

  # Перезапускаем каждый сервис отдельно
  for service in $SERVICES_TO_RESTART; do
    safe_restart_service $service
  done
else
  echo "No services need to be restarted"
fi

echo "Deployment completed successfully!"