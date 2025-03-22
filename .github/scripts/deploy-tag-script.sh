#!/bin/bash
# Скрипт для деплоя конкретного сервиса по тегу
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

# Обновляем код из репозитория
echo "Fetching latest code..."
git fetch --all

# Определяем основную ветку
MAIN_BRANCH="main"
if git show-ref --verify --quiet refs/remotes/origin/master; then
  MAIN_BRANCH="master"
fi

# Проверяем, есть ли локальная ветка
if ! git rev-parse --verify $MAIN_BRANCH >/dev/null 2>&1; then
  echo "Creating local branch: $MAIN_BRANCH"
  git checkout -b $MAIN_BRANCH origin/$MAIN_BRANCH
else
  echo "Checking out local branch: $MAIN_BRANCH"
  git checkout $MAIN_BRANCH
fi

# Обновляем код
echo "Updating code..."
git pull origin $MAIN_BRANCH

# Переходим на нужный коммит
echo "Checking out commit: ${{ github.sha }}"
git checkout ${{ github.sha }}

# Функция безопасного перезапуска сервиса
safe_restart_service() {
  local service=$1
  echo "Safely restarting service: $service"

  # Проверяем существование контейнера
  if docker-compose ps -q $service > /dev/null 2>&1; then
    echo "Stopping and removing existing container..."
    # Останавливаем и удаляем контейнер, игнорируя ошибки
    docker-compose stop $service || true
    docker-compose rm -f $service || true
  fi

  # Принудительно удаляем контейнер, если он все еще существует
  CONTAINER_NAME="teacher_journal_${service}"
  if docker ps -a -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    echo "Forcing removal of container $CONTAINER_NAME..."
    docker rm -f $CONTAINER_NAME || true
  fi

  # Очищаем неиспользуемые образы и кэш сборки
  echo "Cleaning up Docker resources..."
  docker system prune -f || true

  # Пересоздаем контейнер
  echo "Rebuilding and starting container..."
  docker-compose up -d --build $service

  # Проверяем статус
  if [ $? -eq 0 ]; then
    echo "✅ Service $service successfully restarted"
  else
    echo "❌ Failed to restart service $service"
    # Дополнительная отладочная информация
    echo "Showing Docker Compose logs for service $service:"
    docker-compose logs --tail=50 $service
    return 1
  fi
}

# Перезапускаем указанный сервис
echo "Rebuilding and restarting ${{ steps.extract-service.outputs.SERVICE }}"
safe_restart_service ${{ steps.extract-service.outputs.SERVICE }}

echo "Service ${{ steps.extract-service.outputs.SERVICE }} has been updated successfully!"