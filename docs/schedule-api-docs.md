# Teacher Journal Schedule API Documentation

This document provides detailed information about the Schedule API endpoints, request formats, and response structures to help you integrate with a React frontend.

## Authentication

All API requests require authentication using JWT Bearer token.

**Headers for all requests:**
```
Authorization: Bearer <jwt_token>
```

## Base URL

All endpoints are relative to the base API URL: `/api/schedule`

## Endpoints

### 1. Get Schedule

Retrieves the schedule for a specific teacher and date or date range.

- **URL:** `/api/schedule`
- **Method:** `GET`
- **URL Parameters:**
  - `teacher` (required): Name of the teacher
  - `date` (optional): Start date in YYYY-MM-DD format (defaults to current date if not provided)
  - `endDate` (optional): End date in YYYY-MM-DD format for date range

#### Sample Request

```javascript
// Example with fetch
const fetchSchedule = async (teacher, date, endDate = null) => {
  const token = localStorage.getItem('token');
  
  let url = `/api/schedule?teacher=${encodeURIComponent(teacher)}&date=${date}`;
  if (endDate) {
    url += `&endDate=${endDate}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch schedule');
  }
  
  return await response.json();
};

// Example with axios
const fetchSchedule = async (teacher, date, endDate = null) => {
  const token = localStorage.getItem('token');
  
  let params = { teacher, date };
  if (endDate) {
    params.endDate = endDate;
  }
  
  const response = await axios.get('/api/schedule', {
    params,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Schedule retrieved successfully",
  "data": {
    "scheduleItems": [
      {
        "id": "lesson_0",
        "date": "2023-09-15",
        "time": "09:00-10:30",
        "classType": "Лекция",
        "subject": "Информационные технологии",
        "group": "ИС1-231-ОТ",
        "subgroup": "Поток",
        "inSystem": false
      },
      {
        "id": "lesson_1",
        "date": "2023-09-15",
        "time": "10:40-12:10",
        "classType": "Практика",
        "subject": "Программирование",
        "group": "ИС1-231-ОТ",
        "subgroup": "1 п.г.",
        "inSystem": true
      }
    ],
    "responseSize": 15428,
    "itemCount": 2,
    "debugInfo": "Fetching URL: https://apivgltu2.ru/schedule?teacher=Иванов%20И.И.&date=2023-09-15\nResponse status: 200 OK\nResponse length: 15428 bytes\n..."
  }
}
```

### 2. Start Asynchronous Fetch

Initiates asynchronous loading of schedule for a large date range. Use this for performance when fetching data for more than a few days.

- **URL:** `/api/schedule/async`
- **Method:** `POST`
- **Request Body:**
  - `teacher` (required): Name of the teacher
  - `startDate` (required): Start date in YYYY-MM-DD format
  - `endDate` (required): End date in YYYY-MM-DD format

#### Sample Request

```javascript
const startAsyncFetch = async (teacher, startDate, endDate) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/schedule/async', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      teacher,
      startDate,
      endDate
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to start async fetch');
  }
  
  return await response.json();
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Async fetch started",
  "data": {
    "jobID": "job_1631234567890"
  }
}
```

### 3. Get Progress

Retrieves the progress of an asynchronous fetch operation.

- **URL:** `/api/schedule/progress/{jobID}`
- **Method:** `GET`
- **URL Parameters:**
  - `jobID` (required): The job ID returned from the async fetch start

#### Sample Request

```javascript
const getProgress = async (jobID) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/schedule/progress/${jobID}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get progress');
  }
  
  return await response.json();
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Progress retrieved",
  "data": {
    "jobID": "job_1631234567890",
    "progress": 45,
    "status": "Loading period 2 of 4",
    "totalPeriods": 4,
    "completed": 1,
    "itemCount": 15,
    "finished": false
  }
}
```

### 4. Get Results

Retrieves the results of a completed asynchronous fetch operation.

- **URL:** `/api/schedule/results/{jobID}`
- **Method:** `GET`
- **URL Parameters:**
  - `jobID` (required): The job ID returned from the async fetch start

#### Sample Request

```javascript
const getResults = async (jobID) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/schedule/results/${jobID}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get results');
  }
  
  return await response.json();
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Results retrieved successfully",
  "data": {
    "jobID": "job_1631234567890",
    "teacherName": "Иванов И.И.",
    "startDate": "2023-09-01",
    "endDate": "2023-09-30",
    "scheduleItems": [
      {
        "id": "lesson_0",
        "date": "2023-09-15",
        "time": "09:00-10:30",
        "classType": "Лекция",
        "subject": "Информационные технологии",
        "group": "ИС1-231-ОТ",
        "subgroup": "Поток",
        "inSystem": false
      },
      // More schedule items...
    ],
    "responseSize": 48255,
    "itemCount": 45,
    "debugInfo": "...",
    "completionTime": "2023-09-15 14:23:45",
    "status": "completed"
  }
}
```

### 5. Add Single Lesson

Adds a single lesson from the schedule to the system.

- **URL:** `/api/schedule/lesson`
- **Method:** `POST`
- **Request Body:** Schedule item object

#### Sample Request

```javascript
const addLesson = async (scheduleItem) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/schedule/lesson', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(scheduleItem)
  });
  
  if (!response.ok) {
    throw new Error('Failed to add lesson');
  }
  
  return await response.json();
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Lesson added successfully",
  "data": {
    "lessonID": 123
  }
}
```

### 6. Add Multiple Lessons

Adds multiple lessons from the schedule to the system.

- **URL:** `/api/schedule/lessons`
- **Method:** `POST`
- **Request Body:**
  - `scheduleItems` (required): Array of schedule items

#### Sample Request

```javascript
const addAllLessons = async (scheduleItems) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/schedule/lessons', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      scheduleItems
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to add lessons');
  }
  
  return await response.json();
};
```

#### Sample Response

```json
{
  "success": true,
  "message": "Lessons added successfully",
  "data": {
    "added": 12,
    "failed": 0,
    "duplicatesSkipped": 3
  }
}
```

## React Integration Example

Here's a more complete example of how to integrate with the API in a React component, including handling asynchronous operations:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScheduleViewer = () => {
  const [teacher, setTeacher] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobID, setJobID] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  
  // Function to fetch schedule directly
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      let url = `/api/schedule?teacher=${encodeURIComponent(teacher)}&date=${startDate}`;
      if (endDate && endDate !== startDate) {
        url += `&endDate=${endDate}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setScheduleItems(response.data.data.scheduleItems);
    } catch (err) {
      setError(err.response?.data?.error || 'Error fetching schedule');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to start async fetch for date ranges
  const startAsyncFetch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/schedule/async', {
        teacher,
        startDate,
        endDate
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setJobID(response.data.data.jobID);
      setProgress(0);
      setProgressStatus('Starting...');
      
      // Start polling for progress
      pollProgressInterval();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Error starting async fetch');
    }
  };
  
  // Function to poll progress
  const pollProgressInterval = () => {
    const intervalId = setInterval(async () => {
      if (!jobID) return;
      
      try {
        const token = localStorage.getItem('token');
        
        const response = await axios.get(`/api/schedule/progress/${jobID}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const progressData = response.data.data;
        setProgress(progressData.progress);
        setProgressStatus(progressData.status);
        
        // If finished, get results and stop polling
        if (progressData.finished) {
          clearInterval(intervalId);
          getAsyncResults();
        }
      } catch (err) {
        clearInterval(intervalId);
        setLoading(false);
        setError('Error checking progress');
      }
    }, 1000); // Poll every second
    
    // Clean up on component unmount
    return () => clearInterval(intervalId);
  };
  
  // Function to get async results
  const getAsyncResults = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`/api/schedule/results/${jobID}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setScheduleItems(response.data.data.scheduleItems);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Error getting results');
    }
  };
  
  // Function to handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if we need to use async fetch (for date ranges)
    if (endDate && endDate !== startDate) {
      startAsyncFetch();
    } else {
      fetchSchedule();
    }
  };
  
  // Function to add a lesson to the system
  const addLessonToSystem = async (item) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post('/api/schedule/lesson', item, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update the item in state
      setScheduleItems(prev => 
        prev.map(scheduleItem => 
          scheduleItem.id === item.id 
            ? { ...scheduleItem, inSystem: true } 
            : scheduleItem
        )
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding lesson');
    }
  };
  
  // Function to add all lessons to the system
  const addAllLessonsToSystem = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Filter only items that are not in the system
      const itemsToAdd = scheduleItems.filter(item => !item.inSystem);
      
      if (itemsToAdd.length === 0) {
        alert('All lessons are already in the system');
        return;
      }
      
      const response = await axios.post('/api/schedule/lessons', {
        scheduleItems: itemsToAdd
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update all items in state
      setScheduleItems(prev => 
        prev.map(item => ({ ...item, inSystem: true }))
      );
      
      // Show success message
      alert(`Successfully added ${response.data.data.added} lessons, skipped ${response.data.data.duplicatesSkipped} duplicates`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding all lessons');
    }
  };
  
  return (
    <div className="schedule-container">
      <h1>Schedule Viewer</h1>
      
      <form onSubmit={handleSubmit} className="schedule-form">
        <div className="form-group">
          <label htmlFor="teacher">Teacher:</label>
          <input 
            id="teacher"
            type="text" 
            value={teacher} 
            onChange={e => setTeacher(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input 
            id="startDate"
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="endDate">End Date (optional):</label>
          <input 
            id="endDate"
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Schedule'}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading && jobID && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-status">{progressStatus} ({progress}%)</div>
        </div>
      )}
      
      {scheduleItems.length > 0 && (
        <div className="schedule-controls">
          <h2>Found {scheduleItems.length} items</h2>
          <button onClick={addAllLessonsToSystem}>Add All Lessons</button>
        </div>
      )}
      
      <div className="schedule-items">
        {scheduleItems.map(item => (
          <div key={item.id} className={`schedule-item ${item.inSystem ? 'in-system' : ''}`}>
            <div className="schedule-item-header">
              <span>{formatDate(item.date)}</span>
              <span>{item.time}</span>
            </div>
            
            <div className="schedule-item-details">
              <h3>{item.subject}</h3>
              <div className="tags">
                <span className="tag">{item.classType}</span>
                <span className="tag">{item.group}</span>
                <span className="tag">{item.subgroup}</span>
              </div>
            </div>
            
            <div className="schedule-item-actions">
              <button 
                onClick={() => addLessonToSystem(item)} 
                disabled={item.inSystem}
              >
                {item.inSystem ? 'Already in system' : 'Add to system'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format date from YYYY-MM-DD to DD.MM.YYYY
const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};

export default ScheduleViewer;
```

## Error Codes and Handling

Common error codes:

- **400 Bad Request**: Invalid parameters or request body
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Valid token but insufficient privileges (e.g., free user)
- **404 Not Found**: Resource not found
- **412 Precondition Failed**: Job is still in progress (when getting results)
- **409 Conflict**: Resource already exists (e.g., lesson already in system)
- **500 Internal Server Error**: Server-side error

Error response format:

```json
{
  "success": false,
  "error": "Error message describing the issue"
}
```

## Testing the API with Postman

You can test the API using Postman:

1. Set the request URL to one of the endpoints (e.g., `http://localhost:8091/api/schedule`)
2. Add the Authorization header: `Bearer <your_jwt_token>`
3. For GET requests, add query parameters
4. For POST requests, set body to raw JSON
5. Send the request and check the response
