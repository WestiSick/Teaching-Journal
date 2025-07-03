import axios from 'axios';

// Базовый URL для API аналитики
const API_URL = '/api/analytics';

/**
 * Сервис для работы с API аналитики
 */
export default {
  /**
   * Получение списка доступных моделей прогнозирования
   */
  async getModels() {
    try {
      const response = await axios.get(`${API_URL}/models`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении списка моделей:', error);
      throw error;
    }
  },

  /**
   * Синхронизация данных студентов из основной БД
   */
  async syncStudents() {
    try {
      const response = await axios.get(`${API_URL}/sync-students`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при синхронизации студентов:', error);
      throw error;
    }
  },

  /**
   * Синхронизация данных об оценках из основной БД
   */
  async syncGrades() {
    try {
      const response = await axios.get(`${API_URL}/sync-grades`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при синхронизации оценок:', error);
      throw error;
    }
  },

  /**
   * Запуск обучения новой модели прогнозирования
   * @param {string} modelType - Тип модели ('lstm' или 'transformer')
   * @param {string|null} subject - Предмет для прогнозирования (или null для всех предметов)
   */
  async trainModel(modelType = 'lstm', subject = null) {
    try {
      let url = `${API_URL}/train-model?model_type=${modelType}`;
      if (subject) {
        url += `&subject=${encodeURIComponent(subject)}`;
      }

      const response = await axios.post(url);
      return response.data;
    } catch (error) {
      console.error('Ошибка при запуске обучения модели:', error);
      throw error;
    }
  },

  /**
   * Получение прогноза успеваемости для студента
   * @param {number} modelId - ID модели прогнозирования
   * @param {number} studentId - ID студента
   * @param {string} subject - Предмет
   */
  async getStudentPrediction(modelId, studentId, subject) {
    try {
      const response = await axios.post(
        `${API_URL}/predict/${modelId}/${studentId}?subject=${encodeURIComponent(subject)}`
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении прогноза:', error);
      throw error;
    }
  },

  /**
   * Получение истории прогнозов для студента
   * @param {number} studentId - ID студента
   * @param {string|null} subject - Предмет (или null для всех предметов)
   */
  async getStudentPredictions(studentId, subject = null) {
    try {
      let url = `${API_URL}/predictions/student/${studentId}`;
      if (subject) {
        url += `?subject=${encodeURIComponent(subject)}`;
      }

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении истории прогнозов:', error);
      throw error;
    }
  },

  /**
   * Получение аналитики по группе
   * @param {string} groupName - Название группы
   * @param {string|null} subject - Предмет (или null для всех предметов)
   */
  async getGroupAnalytics(groupName, subject = null) {
    try {
      let url = `${API_URL}/analytics/group/${encodeURIComponent(groupName)}`;
      if (subject) {
        url += `?subject=${encodeURIComponent(subject)}`;
      }

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении аналитики группы:', error);
      throw error;
    }
  },

  /**
   * Проверка состояния сервера
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${API_URL}/health`);
      return response.data;
    } catch (error) {
      console.error('Ошибка при проверке состояния сервера:', error);
      throw error;
    }
  }
};
