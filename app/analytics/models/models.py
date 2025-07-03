import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class Student(Base):
    """Модель для хранения данных о студентах"""
    __tablename__ = 'students'

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, nullable=False, index=True)
    group_name = Column(String, nullable=False)
    student_fio = Column(String, nullable=False)

    # Связь с оценками
    grades = relationship("Grade", back_populates="student")
    predictions = relationship("PredictionResult", back_populates="student")


class Grade(Base):
    """Модель для хранения данных об оценках"""
    __tablename__ = 'grades'

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    subject = Column(String, nullable=False)
    lab_number = Column(Integer, nullable=False)
    grade_value = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Связь со студентом
    student = relationship("Student", back_populates="grades")


class PredictionModel(Base):
    """Модель для хранения информации о моделях прогнозирования"""
    __tablename__ = 'prediction_models'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    model_type = Column(String, nullable=False)  # LSTM, Transformer и т.д.
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    accuracy = Column(Float, nullable=True)
    model_path = Column(String, nullable=False)

    # Связь с результатами прогнозов
    predictions = relationship("PredictionResult", back_populates="model")


class PredictionResult(Base):
    """Модель для хранения результатов прогнозирования"""
    __tablename__ = 'prediction_results'

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    model_id = Column(Integer, ForeignKey('prediction_models.id'), nullable=False)
    subject = Column(String, nullable=False)
    predicted_grade = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Связи
    student = relationship("Student", back_populates="predictions")
    model = relationship("PredictionModel", back_populates="predictions")


def init_db(connection_string):
    """Инициализация базы данных"""
    engine = create_engine(connection_string)
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    """Создание сессии для работы с базой данных"""
    Session = sessionmaker(bind=engine)
    return Session()
