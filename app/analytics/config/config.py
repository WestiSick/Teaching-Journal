import os
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла (если есть)
load_dotenv()

# Параметры подключения к базе данных
DB_HOST = os.getenv("DB_HOST", "database")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "teaching_journal")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Строка подключения к БД для SQLAlchemy
DB_CONNECTION_STRING = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Настройки для микросервиса
API_HOST = "0.0.0.0"
API_PORT = 8085  # Изменен порт с 8081 на 8085
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# Настройки путей
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../ml/saved_models")
