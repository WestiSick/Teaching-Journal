#!/bin/bash
set -e

PROJECT_DIR=~/teacher-journal
LOG_FILE=~/deploy-scripts/deploy.log

echo "====== Начало деплоя: $(date) ======" >> $LOG_FILE

if [ -d "$PROJECT_DIR" ]; then
    cd $PROJECT_DIR
    echo "Обновление существующего репозитория..." >> $LOG_FILE
    git fetch --all
    git reset --hard origin/master
else
    echo "Клонирование репозитория..." >> $LOG_FILE
    git clone https://github.com/WestiSick/Teaching-Journal.git $PROJECT_DIR
    cd $PROJECT_DIR
fi

echo "Перезапуск Docker контейнеров..." >> $LOG_FILE
docker-compose down
docker-compose up -d --build

echo "====== Деплой завершен: $(date) ======" >> $LOG_FILE

echo "Очистка неиспользуемых Docker образов..." >> $LOG_FILE
docker image prune -af
docker system prune -f

exit 0