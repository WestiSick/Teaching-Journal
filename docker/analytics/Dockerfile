FROM python:3.10-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Копируем файлы зависимостей
COPY app/analytics/requirements.txt .

# Предустанавливаем тяжелые пакеты отдельно для лучшего кэширования
RUN pip install --no-cache-dir numpy pandas scikit-learn
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir psycopg2-binary

# Устанавливаем остальные зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY app/analytics /app/analytics
COPY config /app/config

# Создаем директорию для сохраненных моделей
RUN mkdir -p /app/analytics/ml/saved_models

# Указываем порт
EXPOSE 8085

# Запускаем сервис
CMD ["python", "/app/analytics/cmd/server/main.py"]
