from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import List, Optional
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime

# Импортируем модели данных и ML-модели
from app.analytics.models.models import (
    Student, Grade, PredictionModel, PredictionResult,
    get_session, init_db
)
from app.analytics.ml.models import StudentPerformancePredictor

app = FastAPI(
    title="Аналитика успеваемости",
    description="API для прогностической аналитики успеваемости студентов",
    version="1.0.0",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Получение строки подключения к БД из конфигурации
import sys
import os
# Добавляем путь к корню проекта для импорта конфигурации
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from app.analytics.config.config import DB_CONNECTION_STRING

# Инициализация подключения к БД
engine = init_db(DB_CONNECTION_STRING)

# Зависимость для получения сессии БД
def get_db():
    db = get_session(engine)
    try:
        yield db
    finally:
        db.close()


# Путь к сохраненным моделям
MODELS_DIR = os.path.join(os.path.dirname(__file__), "../ml/saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Маршруты API
@app.get("/")
def read_root():
    return {"message": "API прогностической аналитики успеваемости"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/sync-students")
async def sync_students(db: Session = Depends(get_db)):
    """Синхронизация данных студентов из основной БД"""
    try:
        # Выполнение запроса к основной БД для получения списка студентов
        result = db.execute(text("""
            SELECT s.id, s.teacher_id, s.group_name, s.student_fio
            FROM students s
        """))

        students_count = 0
        for row in result:
            # Проверяем, существует ли уже студент в нашей БД
            existing_student = db.query(Student).filter_by(id=row.id).first()

            if not existing_student:
                # Создаем нового студента
                new_student = Student(
                    id=row.id,
                    teacher_id=row.teacher_id,
                    group_name=row.group_name,
                    student_fio=row.student_fio
                )
                db.add(new_student)
                students_count += 1

        db.commit()
        return {"message": f"Синхронизировано {students_count} новых студентов"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка синхронизации: {str(e)}")


@app.get("/sync-grades")
async def sync_grades(db: Session = Depends(get_db)):
    """Синхронизация данных об оценках из основной БД"""
    try:
        # Получение оценок лабораторных работ
        result = db.execute(text("""
            SELECT lg.id, lg.student_id, lg.teacher_id, lg.subject, lg.lab_number, lg.grade
            FROM lab_grades lg
        """))

        grades_count = 0
        for row in result:
            # Находим студента по id из основной системы
            student = db.query(Student).filter_by(id=row.student_id).first()
            if not student:
                continue

            # Проверяем, существует ли уже такая оценка в нашей БД
            existing_grade = db.query(Grade).filter_by(
                student_id=student.id,
                subject=row.subject,
                lab_number=row.lab_number
            ).first()

            if not existing_grade:
                # Создаем новую запись об оценке
                new_grade = Grade(
                    student_id=student.id,
                    subject=row.subject,
                    lab_number=row.lab_number,
                    grade_value=row.grade
                )
                db.add(new_grade)
                grades_count += 1

        db.commit()
        return {"message": f"Синхронизировано {grades_count} новых оценок"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка синхронизации оценок: {str(e)}")


@app.post("/train-model")
async def train_model(
    background_tasks: BackgroundTasks,
    model_type: str = Query("lstm", enum=["lstm", "transformer"]),
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Обучение новой модели прогнозирования"""

    # Функция для фонового обучения модели
    def train_model_task(model_type, subject):
        try:
            db_session = get_session(engine)

            # Подготовка данных
            query = db_session.query(Student, Grade).join(Grade)
            if subject:
                query = query.filter(Grade.subject == subject)

            # Преобразуем в pandas DataFrame
            records = []
            for student, grade in query:
                records.append({
                    "student_id": student.id,
                    "group_name": student.group_name,
                    "subject": grade.subject,
                    "lab_number": grade.lab_number,
                    "grade_value": grade.grade_value,
                })

            if not records:
                raise Exception("Недостаточно данных для обучения модели")

            grades_df = pd.DataFrame(records)

            # Создаем и обучаем модель
            predictor = StudentPerformancePredictor(model_type=model_type)
            X_train, X_test, y_train, y_test = predictor.prepare_data(grades_df)

            losses = predictor.train(X_train, y_train, epochs=100)
            metrics = predictor.evaluate(X_test, y_test)

            # Сохраняем обученную модель
            model_name = f"{model_type}_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            if subject:
                model_name += f"_{subject}"
            model_path = os.path.join(MODELS_DIR, f"{model_name}.pt")
            predictor.save_model(model_path)

            # Сохраняем информацию о модели в БД
            model_info = PredictionModel(
                name=model_name,
                description=f"Модель {model_type.upper()} для прогнозирования успеваемости",
                model_type=model_type,
                accuracy=metrics["r2"],
                model_path=model_path
            )
            db_session.add(model_info)
            db_session.commit()

        except Exception as e:
            db_session.rollback()
            print(f"Ошибка при обучении модели: {str(e)}")
        finally:
            db_session.close()

    # Запускаем обучение в фоновом режиме
    background_tasks.add_task(train_model_task, model_type, subject)

    return {
        "message": "Запущен процесс обучения модели",
        "model_type": model_type,
        "subject": subject or "все предметы"
    }


@app.get("/models")
async def list_models(db: Session = Depends(get_db)):
    """Получение списка доступных моделей прогнозирования"""
    models = db.query(PredictionModel).all()
    return [
        {
            "id": model.id,
            "name": model.name,
            "description": model.description,
            "model_type": model.model_type,
            "created_at": model.created_at,
            "accuracy": model.accuracy
        }
        for model in models
    ]


@app.post("/predict/{model_id}/{student_id}")
async def predict_student_performance(
    model_id: int,
    student_id: int,
    subject: str,
    db: Session = Depends(get_db)
):
    """Прогнозирование успеваемости студента по указанной модели"""

    # Проверяем существование модели
    model_info = db.query(PredictionModel).filter_by(id=model_id).first()
    if not model_info:
        raise HTTPException(status_code=404, detail="Модель не найдена")

    # Проверяем существование студента
    student = db.query(Student).filter_by(id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Студент не найден")

    # Получаем оценки студента по предмету
    grades = db.query(Grade).filter_by(
        student_id=student_id,
        subject=subject
    ).order_by(Grade.lab_number).all()

    if len(grades) < 5:  # Минимальное количество оценок для прогноза
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно данных для прогноза. Необходимо минимум 5 оценок, имеется {len(grades)}"
        )

    try:
        # Загружаем модель
        predictor = StudentPerformancePredictor.load_model(model_info.model_path)

        # Подготавливаем данные для прогноза
        grade_values = np.array([g.grade_value for g in grades])

        # Получаем прогноз
        predicted_grade = predictor.predict(grade_values)

        # Сохраняем результат прогноза
        prediction_result = PredictionResult(
            student_id=student_id,
            model_id=model_id,
            subject=subject,
            predicted_grade=float(predicted_grade),
            confidence=0.9  # Для простоты, можно улучшить позже
        )
        db.add(prediction_result)
        db.commit()

        return {
            "student_id": student_id,
            "student_name": student.fio,
            "subject": subject,
            "predicted_grade": float(predicted_grade),
            "confidence": 0.9,
            "prediction_id": prediction_result.id
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка при прогнозировании: {str(e)}")


@app.get("/predictions/student/{student_id}")
async def get_student_predictions(
    student_id: int,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Получение истории прогнозов для студента"""
    query = db.query(PredictionResult).filter_by(student_id=student_id)

    if subject:
        query = query.filter_by(subject=subject)

    predictions = query.order_by(PredictionResult.created_at.desc()).all()

    return [
        {
            "id": pred.id,
            "subject": pred.subject,
            "predicted_grade": pred.predicted_grade,
            "confidence": pred.confidence,
            "created_at": pred.created_at,
            "model_id": pred.model_id,
            "model_type": pred.model.model_type
        }
        for pred in predictions
    ]


@app.get("/analytics/group/{group_name}")
async def group_analytics(
    group_name: str,
    subject: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Аналитика по группе студентов"""
    # Находим студентов группы
    students = db.query(Student).filter_by(group_name=group_name).all()

    if not students:
        raise HTTPException(status_code=404, detail="Группа не найдена или не содержит студентов")

    # Собираем данные по группе
    student_analytics = []

    for student in students:
        query = db.query(Grade).filter_by(student_id=student.id)
        if subject:
            query = query.filter_by(subject=subject)

        grades = query.all()

        # Рассчитываем статистики
        grade_values = [g.grade_value for g in grades]

        # Находим последние прогнозы для студента
        prediction_query = db.query(PredictionResult).filter_by(student_id=student.id)
        if subject:
            prediction_query = prediction_query.filter_by(subject=subject)

        latest_prediction = prediction_query.order_by(PredictionResult.created_at.desc()).first()

        student_analytics.append({
            "student_id": student.id,
            "student_name": student.fio,
            "grades_count": len(grade_values),
            "avg_grade": np.mean(grade_values) if grade_values else None,
            "max_grade": max(grade_values) if grade_values else None,
            "min_grade": min(grade_values) if grade_values else None,
            "predicted_grade": latest_prediction.predicted_grade if latest_prediction else None
        })

    # Рассчитываем общую статистику по группе
    all_grades = []
    for sa in student_analytics:
        if sa["avg_grade"] is not None:
            all_grades.append(sa["avg_grade"])

    return {
        "group_name": group_name,
        "subject": subject,
        "students_count": len(students),
        "group_avg_grade": np.mean(all_grades) if all_grades else None,
        "students": student_analytics
    }
