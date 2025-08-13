#!/bin/bash
set -e

# Директория проекта = директория, где лежит этот скрипт
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
LOG_FILE="$PROJECT_DIR/deploy.log"

# Создаём директорию для лога при необходимости (на случай переноса)
mkdir -p "$(dirname "$LOG_FILE")"

echo "====== Начало деплоя: $(date) ======" >> "$LOG_FILE"

cd "$PROJECT_DIR"

# Проверяем, что это git-репозиторий
if [ -d .git ]; then
    echo "Обновление репозитория..." >> "$LOG_FILE"
    git fetch --all
    git reset --hard origin/master
else
    echo "Текущая директория не является git-репозиторием. Клонируйте репозиторий сюда и запустите скрипт снова." >> "$LOG_FILE"
    exit 1
fi

# Определение доступной команды Docker Compose
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
else
    echo "Docker Compose не найден. Установите docker compose plugin или docker-compose." >> "$LOG_FILE"
    exit 1
fi

echo "Перезапуск Docker контейнеров..." >> "$LOG_FILE"
$COMPOSE -f docker-compose.local.yml down || true
$COMPOSE -f docker-compose.local.yml up -d --build

echo "====== Деплой завершен: $(date) ======" >> "$LOG_FILE"

echo "Очистка неиспользуемых Docker образов..." >> "$LOG_FILE"
docker image prune -af || true
docker system prune -f || true

exit 0