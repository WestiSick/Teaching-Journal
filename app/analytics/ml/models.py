import os
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# Определение моделей нейронных сетей
class LSTMModel(nn.Module):
    """LSTM модель для прогнозирования успеваемости студентов"""
    def __init__(self, input_dim, hidden_dim, num_layers, output_dim, dropout=0.2):
        super(LSTMModel, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_dim).to(x.device)

        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])  # берем только последний выход LSTM
        return out


class TransformerModel(nn.Module):
    """Transformer модель для прогнозирования успеваемости студентов"""
    def __init__(self, input_dim, model_dim, num_heads, num_layers, output_dim, dropout=0.1):
        super(TransformerModel, self).__init__()

        self.input_projection = nn.Linear(input_dim, model_dim)
        encoder_layer = nn.TransformerEncoderLayer(d_model=model_dim, nhead=num_heads, dropout=dropout)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.output_projection = nn.Linear(model_dim, output_dim)

    def forward(self, x):
        x = self.input_projection(x)
        x = x.permute(1, 0, 2)  # [seq_len, batch_size, model_dim]
        x = self.transformer_encoder(x)
        x = x[-1]  # берем последний выход Transformer
        x = self.output_projection(x)
        return x


class GradeDataset(Dataset):
    """Датасет для оценок студентов"""
    def __init__(self, X, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.y = torch.tensor(y, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


class StudentPerformancePredictor:
    """Класс для прогнозирования успеваемости студентов"""

    def __init__(self, model_type='lstm', seq_length=5, feature_dim=5):
        """
        Инициализация предиктора.

        Параметры:
        - model_type: тип модели ('lstm' или 'transformer')
        - seq_length: длина последовательности оценок для анализа
        - feature_dim: размерность признаков (оценки, доп. характеристики и т.д.)
        """
        self.model_type = model_type
        self.seq_length = seq_length
        self.feature_dim = feature_dim
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.scaler_X = MinMaxScaler()
        self.scaler_y = MinMaxScaler()

        # Задание параметров моделей
        if model_type == 'lstm':
            self.model = LSTMModel(
                input_dim=feature_dim,
                hidden_dim=64,
                num_layers=2,
                output_dim=1
            ).to(self.device)
        elif model_type == 'transformer':
            self.model = TransformerModel(
                input_dim=feature_dim,
                model_dim=64,
                num_heads=4,
                num_layers=2,
                output_dim=1
            ).to(self.device)
        else:
            raise ValueError(f"Неизвестный тип модели: {model_type}")

    def prepare_data(self, grades_data):
        """
        Подготовка данных для обучения и прогнозирования

        Параметры:
        - grades_data: DataFrame с оценками студентов

        Возвращает:
        - кортеж (X_train, X_test, y_train, y_test)
        """
        # Группировка по студенту и предмету
        sequences = []
        targets = []

        for student_id in grades_data['student_id'].unique():
            for subject in grades_data[grades_data['student_id'] == student_id]['subject'].unique():
                # Получаем оценки по конкретному студенту и предмету
                student_subject_grades = grades_data[
                    (grades_data['student_id'] == student_id) &
                    (grades_data['subject'] == subject)
                ].sort_values('lab_number')

                grade_values = student_subject_grades['grade_value'].values

                if len(grade_values) >= self.seq_length + 1:  # Нужно еще одно значение для целевой переменной
                    for i in range(len(grade_values) - self.seq_length):
                        seq = grade_values[i:i+self.seq_length]
                        target = grade_values[i+self.seq_length]

                        # Добавим дополнительные признаки (пример)
                        features = np.zeros((self.seq_length, self.feature_dim))
                        features[:, 0] = seq  # Первый признак - сами оценки
                        # Можно добавить другие признаки (посещаемость и т.д.)

                        sequences.append(features)
                        targets.append(target)

        if not sequences:
            raise ValueError("Недостаточно данных для создания последовательностей")

        X = np.array(sequences)
        y = np.array(targets).reshape(-1, 1)

        # Нормализуем данные
        X_flat = X.reshape(-1, X.shape[-1])
        X_scaled_flat = self.scaler_X.fit_transform(X_flat)
        X_scaled = X_scaled_flat.reshape(X.shape)

        y_scaled = self.scaler_y.fit_transform(y)

        # Разделяем на обучающую и тестовую выборки
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_scaled, test_size=0.2, random_state=42
        )

        return X_train, X_test, y_train, y_test

    def train(self, X_train, y_train, batch_size=32, epochs=100, learning_rate=0.001):
        """
        Обучение модели

        Параметры:
        - X_train: нормализованные входные последовательности
        - y_train: нормализованные целевые значения
        - batch_size: размер батча
        - epochs: количество эпох обучения
        - learning_rate: скорость обучения

        Возвращает:
        - история потерь
        """
        train_dataset = GradeDataset(X_train, y_train)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

        criterion = nn.MSELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)

        self.model.train()
        losses = []

        for epoch in range(epochs):
            epoch_loss = 0
            for X_batch, y_batch in train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                # Обнуляем градиенты
                optimizer.zero_grad()

                # Прямой проход
                outputs = self.model(X_batch)

                # Вычисляем потерю
                loss = criterion(outputs, y_batch)

                # Обратный проход и оптимизация
                loss.backward()
                optimizer.step()

                epoch_loss += loss.item()

            avg_loss = epoch_loss / len(train_loader)
            losses.append(avg_loss)

            if (epoch + 1) % 10 == 0:
                print(f'Эпоха [{epoch+1}/{epochs}], Потеря: {avg_loss:.4f}')

        return losses

    def evaluate(self, X_test, y_test):
        """
        Оценка модели

        Параметры:
        - X_test: нормализованные тестовые последовательности
        - y_test: нормализованные тестовые целевые значения

        Возвращает:
        - метрики производительности (MSE, R2)
        """
        self.model.eval()

        test_dataset = GradeDataset(X_test, y_test)
        test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)

        all_preds = []
        all_targets = []

        with torch.no_grad():
            for X_batch, y_batch in test_loader:
                X_batch = X_batch.to(self.device)

                outputs = self.model(X_batch)

                all_preds.extend(outputs.cpu().numpy())
                all_targets.extend(y_batch.numpy())

        # Денормализуем предсказания и целевые значения
        all_preds = self.scaler_y.inverse_transform(np.array(all_preds).reshape(-1, 1))
        all_targets = self.scaler_y.inverse_transform(np.array(all_targets).reshape(-1, 1))

        # Вычисляем метрики
        mse = mean_squared_error(all_targets, all_preds)
        r2 = r2_score(all_targets, all_preds)

        return {
            'mse': mse,
            'rmse': np.sqrt(mse),
            'r2': r2
        }

    def predict(self, student_grades):
        """
        Прогнозирование оценки для студента

        Параметры:
        - student_grades: последовательность оценок студента (DataFrame или массив)

        Возвращает:
        - прогнозируемую оценку
        """
        self.model.eval()

        if isinstance(student_grades, pd.DataFrame):
            # Преобразуем DataFrame в массив
            grade_values = student_grades['grade_value'].values[-self.seq_length:]

            if len(grade_values) < self.seq_length:
                raise ValueError(f"Недостаточно данных. Требуется {self.seq_length} оценок.")
        else:
            grade_values = student_grades[-self.seq_length:]

        # Создаем признаки (как при обучении)
        features = np.zeros((1, self.seq_length, self.feature_dim))
        features[0, :, 0] = grade_values  # Первый признак - сами оценки
        # Добавьте другие признаки здесь

        # Нормализуем
        features_flat = features.reshape(-1, features.shape[-1])
        features_scaled_flat = self.scaler_X.transform(features_flat)
        features_scaled = features_scaled_flat.reshape(features.shape)

        # Преобразуем в тензор
        features_tensor = torch.tensor(features_scaled, dtype=torch.float32).to(self.device)

        # Получаем прогноз
        with torch.no_grad():
            output = self.model(features_tensor)

        # Денормализуем результат
        prediction = self.scaler_y.inverse_transform(output.cpu().numpy().reshape(-1, 1))

        return prediction[0][0]

    def save_model(self, path):
        """Сохранение модели"""
        model_info = {
            'model_state_dict': self.model.state_dict(),
            'model_type': self.model_type,
            'seq_length': self.seq_length,
            'feature_dim': self.feature_dim,
            'scaler_X': self.scaler_X,
            'scaler_y': self.scaler_y
        }
        torch.save(model_info, path)

    @classmethod
    def load_model(cls, path):
        """Загрузка сохраненной модели"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Модель не найдена по пути: {path}")

        model_info = torch.load(path, map_location=torch.device('cpu'))

        predictor = cls(
            model_type=model_info['model_type'],
            seq_length=model_info['seq_length'],
            feature_dim=model_info['feature_dim']
        )

        predictor.model.load_state_dict(model_info['model_state_dict'])
        predictor.scaler_X = model_info['scaler_X']
        predictor.scaler_y = model_info['scaler_y']

        return predictor
