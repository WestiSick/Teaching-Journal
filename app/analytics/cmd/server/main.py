import os
import sys
import uvicorn

# Добавляем корень проекта в PYTHONPATH
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
sys.path.insert(0, root_dir)

# Импортируем наше приложение FastAPI и конфигурацию
from app.analytics.api.routes import app
from app.analytics.config.config import API_HOST, API_PORT, DEBUG

if __name__ == "__main__":
    # Запускаем сервер
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
        log_level="info" if not DEBUG else "debug",
        reload=DEBUG  # Для разработки, отключить в продакшене
    )
