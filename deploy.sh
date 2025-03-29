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

# Create copy-ssl-certs.sh script if it doesn't exist
if [ ! -f ~/copy-ssl-certs.sh ]; then
    echo "Создание скрипта для копирования SSL сертификатов..." >> $LOG_FILE
    cat > ~/copy-ssl-certs.sh << 'EOF'
#!/bin/bash

# This script copies SSL certificates from ~/ssl-certs to the project directory
# Usage: ./copy-ssl-certs.sh /path/to/project

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 /path/to/project"
    exit 1
fi

PROJECT_DIR=$1

# Create sert directory if it doesn't exist
mkdir -p $PROJECT_DIR/sert

# Copy certificate files
cp ~/ssl-certs/vg.vadimbuzdin.ru_2025-03-11-23-17_19.crt $PROJECT_DIR/sert/
cp ~/ssl-certs/vg.vadimbuzdin.ru_2025-03-11-23-17_19.key $PROJECT_DIR/sert/

# Set proper permissions
chmod 600 $PROJECT_DIR/sert/vg.vadimbuzdin.ru_2025-03-11-23-17_19.key

echo "SSL certificates have been copied to $PROJECT_DIR/sert/"
EOF
    chmod +x ~/copy-ssl-certs.sh
fi

# Copy SSL certificates to project directory
echo "Копирование SSL сертификатов..." >> $LOG_FILE
~/copy-ssl-certs.sh $PROJECT_DIR

echo "Перезапуск Docker контейнеров..." >> $LOG_FILE
docker-compose down
docker-compose up -d --build

echo "====== Деплой завершен: $(date) ======" >> $LOG_FILE

echo "Очистка неиспользуемых Docker образов..." >> $LOG_FILE
docker image prune -af
docker system prune -f

exit 0