# Teacher Journal API Documentation

This document provides detailed documentation for the Teacher Journal REST API. This API allows for managing teacher journals, including lessons, students, groups, attendance, and lab grades.

## Base URL

```
http://localhost:8080/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the `Authorization` header of your request:

```
Authorization: Bearer <your_token>
```

### Authentication Endpoints

#### Register

Creates a new user account.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "fio": "Full Name",
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user_id": 123
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `409 Conflict`

#### Login

Authenticates a user and returns a JWT token.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 123,
        "fio": "Full Name",
        "role": "teacher"
      }
    }
  }
  ```
- **Error Response**: `401 Unauthorized`

#### Refresh Token

Refreshes an existing JWT token.

- **URL**: `/auth/refresh`
- **Method**: `POST`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Token refreshed",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Error Response**: `401 Unauthorized`

## User Endpoints

### Get Current User

Retrieves information about the currently logged-in user.

- **URL**: `/users/me`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User details retrieved",
    "data": {
      "id": 123,
      "fio": "Full Name",
      "email": "user@example.com",
      "role": "teacher"
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Update Current User

Updates information about the currently logged-in user.

- **URL**: `/users/me`
- **Method**: `PUT`
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "fio": "Updated Name",
    "current_password": "current_password",
    "new_password": "new_password"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`

## Dashboard Endpoints

### Get Dashboard Statistics

Retrieves dashboard statistics for the current user.

- **URL**: `/dashboard/stats`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Dashboard stats retrieved",
    "data": {
      "total_lessons": 25,
      "total_hours": 50,
      "subjects": {
        "Math": 10,
        "Physics": 15
      },
      "groups": ["Group A", "Group B"],
      "has_lessons": true
    }
  }
  ```
- **Error Response**: `401 Unauthorized`

## Lesson Endpoints

### Get All Lessons

Retrieves all lessons for the current user, with optional filters.

- **URL**: `/lessons`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `subject`: Filter by subject
  - `group`: Filter by group
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lessons retrieved successfully",
    "data": [
      {
        "id": 1,
        "group_name": "Group A",
        "subject": "Math",
        "topic": "Algebra Basics",
        "hours": 2,
        "date": "2023-10-15",
        "type": "Лекция"
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Lesson

Retrieves a specific lesson by ID.

- **URL**: `/lessons/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lesson retrieved successfully",
    "data": {
      "id": 1,
      "group_name": "Group A",
      "subject": "Math",
      "topic": "Algebra Basics",
      "hours": 2,
      "date": "2023-10-15",
      "type": "Лекция"
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Create Lesson

Creates a new lesson.

- **URL**: `/lessons`
- **Method**: `POST`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "group_name": "Group A",
    "subject": "Math",
    "topic": "Algebra Basics",
    "hours": 2,
    "date": "2023-10-15",
    "type": "Лекция"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Lesson created successfully",
    "data": {
      "id": 1
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

### Update Lesson

Updates an existing lesson.

- **URL**: `/lessons/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "group_name": "Group A",
    "subject": "Math",
    "topic": "Advanced Algebra",
    "hours": 3,
    "date": "2023-10-16",
    "type": "Лекция"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lesson updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Delete Lesson

Deletes a lesson.

- **URL**: `/lessons/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (with subscription)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lesson deleted successfully"
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Get Subjects

Retrieves all subjects for the current user.

- **URL**: `/subjects`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Subjects retrieved successfully",
    "data": ["Math", "Physics", "Chemistry"]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Lessons by Subject

Retrieves all lessons for a specific subject.

- **URL**: `/subjects/{subject}/lessons`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lessons retrieved successfully",
    "data": [
      {
        "id": 1,
        "group_name": "Group A",
        "subject": "Math",
        "topic": "Algebra Basics",
        "hours": 2,
        "date": "2023-10-15",
        "type": "Лекция"
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

## Group Endpoints

### Get All Groups

Retrieves all groups for the current user.

- **URL**: `/groups`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Groups retrieved successfully",
    "data": [
      {
        "name": "Group A",
        "student_count": 25
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Group

Retrieves a specific group by name.

- **URL**: `/groups/{name}`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Group retrieved successfully",
    "data": {
      "name": "Group A",
      "student_count": 25,
      "subjects": ["Math", "Physics"]
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Create Group

Creates a new group.

- **URL**: `/groups`
- **Method**: `POST`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "name": "Group A",
    "students": ["Student 1", "Student 2"]
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Group created successfully",
    "data": {
      "name": "Group A",
      "students_added": 2
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `409 Conflict`

### Update Group

Updates a group.

- **URL**: `/groups/{name}`
- **Method**: `PUT`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "new_name": "Group B"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Group updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

### Delete Group

Deletes a group and all associated data.

- **URL**: `/groups/{name}`
- **Method**: `DELETE`
- **Auth Required**: Yes (with subscription)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Group deleted successfully"
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Get Students in Group

Retrieves all students in a specific group.

- **URL**: `/groups/{name}/students`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Students retrieved successfully",
    "data": [
      {
        "id": 1,
        "fio": "Student 1"
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

## Student Endpoints

### Get All Students

Retrieves all students for the current user, with optional group filter.

- **URL**: `/students`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `group`: Filter by group
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Students retrieved successfully",
    "data": [
      {
        "id": 1,
        "fio": "Student 1",
        "group_name": "Group A"
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Student

Retrieves a specific student by ID.

- **URL**: `/students/{id}`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Student retrieved successfully",
    "data": {
      "id": 1,
      "fio": "Student 1",
      "group_name": "Group A"
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Create Student

Creates a new student.

- **URL**: `/students`
- **Method**: `POST`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "fio": "Student 1",
    "group_name": "Group A"
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Student created successfully",
    "data": {
      "id": 1
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

### Update Student

Updates a student.

- **URL**: `/students/{id}`
- **Method**: `PUT`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "fio": "Updated Student Name",
    "group_name": "Group B"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Student updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Delete Student

Deletes a student.

- **URL**: `/students/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (with subscription)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Student deleted successfully"
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

## Attendance Endpoints

### Get All Attendance

Retrieves all attendance records for the current user, with optional filters.

- **URL**: `/attendance`
- **Method**: `GET`
- **Auth Required**: Yes
- **Query Parameters**:
  - `group`: Filter by group
  - `subject`: Filter by subject
  - `date_from`: Filter by date (from)
  - `date_to`: Filter by date (to)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Attendance records retrieved successfully",
    "data": [
      {
        "lesson_id": 1,
        "date": "15.10.2023",
        "subject": "Math",
        "group_name": "Group A",
        "total_students": 25,
        "attended_students": 20,
        "attendance_rate": 80.0
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Lesson Attendance

Retrieves attendance for a specific lesson.

- **URL**: `/attendance/{lessonId}`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lesson attendance retrieved successfully",
    "data": {
      "lesson": {
        "id": 1,
        "date": "15.10.2023",
        "subject": "Math",
        "group_name": "Group A",
        "topic": "Algebra Basics",
        "type": "Лекция"
      },
      "students": [
        {
          "id": 1,
          "fio": "Student 1",
          "attended": true
        }
      ],
      "total_students": 25,
      "attended_students": 20,
      "attendance_rate": 80.0
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Save Attendance

Saves attendance records for a lesson.

- **URL**: `/attendance/{lessonId}`
- **Method**: `POST`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "attended_student_ids": [1, 2, 3]
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Attendance saved successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Delete Attendance

Deletes attendance records for a lesson.

- **URL**: `/attendance/{lessonId}`
- **Method**: `DELETE`
- **Auth Required**: Yes (with subscription)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Attendance deleted successfully"
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Export Attendance

Exports attendance data to an Excel file.

- **URL**: `/attendance/export`
- **Method**: `GET`
- **Auth Required**: Yes (with subscription)
- **Query Parameters**:
  - `mode`: Export mode (`group` or `lesson`)
- **Success Response**: `200 OK` (Excel file download)
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

## Lab Endpoints

### Get All Labs

Retrieves all lab groups by subject for the current user.

- **URL**: `/labs`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lab groups retrieved successfully",
    "data": [
      {
        "subject": "Math",
        "groups": [
          {
            "name": "Group A",
            "student_count": 25,
            "total_labs": 5,
            "group_average": 4.2
          }
        ]
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Get Lab Grades

Retrieves lab grades for a specific subject and group.

- **URL**: `/labs/{subject}/{group}`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lab grades retrieved successfully",
    "data": {
      "subject": "Math",
      "group_name": "Group A",
      "total_labs": 5,
      "students": [
        {
          "student_id": 1,
          "student_fio": "Student 1",
          "grades": [5, 4, 0, 0, 0],
          "average": 4.5
        }
      ],
      "group_average": 4.2
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

### Update Lab Settings

Updates lab settings for a specific subject and group.

- **URL**: `/labs/{subject}/{group}/settings`
- **Method**: `PUT`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "total_labs": 10
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lab settings updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Update Lab Grades

Updates lab grades for a specific subject and group.

- **URL**: `/labs/{subject}/{group}/grades`
- **Method**: `PUT`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "grades": [
      {
        "student_id": 1,
        "lab_number": 1,
        "grade": 5
      }
    ]
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lab grades updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Export Lab Grades

Exports lab grades to an Excel file.

- **URL**: `/labs/{subject}/{group}/export`
- **Method**: `GET`
- **Auth Required**: Yes (with subscription)
- **Success Response**: `200 OK` (Excel file download)
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Share Lab Grades

Creates a shareable link for lab grades.

- **URL**: `/labs/{subject}/{group}/share`
- **Method**: `POST`
- **Auth Required**: Yes (with subscription)
- **Request Body**:
  ```json
  {
    "expiration_days": 7
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Lab grades shared successfully",
    "data": {
      "share_url": "http://localhost:8080/api/labs/shared/abc123",
      "token": "abc123",
      "expiration": "2023-10-22T15:30:45Z",
      "expires_after": 7
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Get Shared Lab Grades

Retrieves shared lab grades by token.

- **URL**: `/labs/shared/{token}`
- **Method**: `GET`
- **Auth Required**: No
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Shared lab grades retrieved successfully",
    "data": {
      "shared_by": "Teacher Name",
      "subject": "Math",
      "group_name": "Group A",
      "total_labs": 5,
      "students": [
        {
          "student_id": 1,
          "student_fio": "Student 1",
          "grades": [5, 4, 0, 0, 0],
          "average": 4.5
        }
      ],
      "group_average": 4.2,
      "created_at": "2023-10-15T15:30:45Z",
      "expires_at": "2023-10-22T15:30:45Z",
      "access_count": 5
    }
  }
  ```
- **Error Response**: `404 Not Found`, `410 Gone`

### Get Shared Links

Retrieves all shared links created by the current user.

- **URL**: `/labs/links`
- **Method**: `GET`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Shared links retrieved successfully",
    "data": [
      {
        "token": "abc123",
        "subject": "Math",
        "group_name": "Group A",
        "share_url": "http://localhost:8080/api/labs/shared/abc123",
        "created_at": "2023-10-15T15:30:45Z",
        "expires_at": "2023-10-22T15:30:45Z",
        "is_expired": false,
        "access_count": 5
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`

### Delete Shared Link

Deletes a shared link.

- **URL**: `/labs/links/{token}`
- **Method**: `DELETE`
- **Auth Required**: Yes
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Shared link deleted successfully"
  }
  ```
- **Error Response**: `401 Unauthorized`, `404 Not Found`

## Admin Endpoints

### Get All Users

Retrieves all users (admin only).

- **URL**: `/admin/users`
- **Method**: `GET`
- **Auth Required**: Yes (admin only)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Users retrieved successfully",
    "data": [
      {
        "id": 1,
        "fio": "Admin User",
        "login": "admin@example.com",
        "role": "admin"
      },
      {
        "id": 2,
        "fio": "Teacher Name",
        "login": "teacher@example.com",
        "role": "teacher",
        "total_lessons": 25,
        "total_hours": 50,
        "subjects": {
          "Math": 10,
          "Physics": 15
        }
      }
    ]
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`

### Update User Role

Updates a user's role (admin only).

- **URL**: `/admin/users/{id}/role`
- **Method**: `PUT`
- **Auth Required**: Yes (admin only)
- **Request Body**:
  ```json
  {
    "role": "teacher"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User role updated successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Delete User

Deletes a user and all associated data (admin only).

- **URL**: `/admin/users/{id}`
- **Method**: `DELETE`
- **Auth Required**: Yes (admin only)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User deleted successfully"
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Get Logs

Retrieves system logs (admin only).

- **URL**: `/admin/logs`
- **Method**: `GET`
- **Auth Required**: Yes (admin only)
- **Query Parameters**:
  - `user_id`: Filter by user ID
  - `action`: Filter by action
  - `from_date`: Filter by date (from)
  - `to_date`: Filter by date (to)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Logs retrieved successfully",
    "data": {
      "logs": [
        {
          "id": 1,
          "user_id": 2,
          "user_fio": "Teacher Name",
          "action": "Create Lesson",
          "details": "Created Лекция: Math, Group A, Algebra Basics",
          "timestamp": "2023-10-15T15:30:45Z"
        }
      ],
      "pagination": {
        "current_page": 1,
        "total_pages": 5,
        "total_items": 100,
        "limit": 20,
        "has_next": true,
        "has_prev": false
      }
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`

### Get Teacher Groups

Retrieves groups for a specific teacher (admin only).

- **URL**: `/admin/teachers/{id}/groups`
- **Method**: `GET`
- **Auth Required**: Yes (admin only)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Teacher groups retrieved successfully",
    "data": {
      "teacher_id": 2,
      "teacher_name": "Teacher Name",
      "groups": [
        {
          "name": "Group A",
          "student_count": 25,
          "students": [
            {
              "id": 1,
              "fio": "Student 1"
            }
          ]
        }
      ]
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Add Teacher Group

Adds a new group to a teacher (admin only).

- **URL**: `/admin/teachers/{id}/groups`
- **Method**: `POST`
- **Auth Required**: Yes (admin only)
- **Request Body**:
  ```json
  {
    "group_name": "Group A",
    "students": ["Student 1", "Student 2"]
  }
  ```
- **Success Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Group added successfully",
    "data": {
      "group_name": "Group A",
      "students_added": 2
    }
  }
  ```
- **Error Response**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`

### Get Teacher Attendance

Retrieves attendance records for a specific teacher (admin only).

- **URL**: `/admin/teachers/{id}/attendance`
- **Method**: `GET`
- **Auth Required**: Yes (admin only)
- **Query Parameters**:
  - `group`: Filter by group
  - `subject`: Filter by subject
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Teacher attendance retrieved successfully",
    "data": {
      "teacher_id": 2,
      "teacher_name": "Teacher Name",
      "attendance": [
        {
          "lesson_id": 1,
          "date": "15.10.2023",
          "subject": "Math",
          "group_name": "Group A",
          "topic": "Algebra Basics",
          "type": "Лекция",
          "total_students": 25,
          "attended_students": 20,
          "attendance_rate": 80.0
        }
      ],
      "groups": ["Group A", "Group B"],
      "subjects": ["Math", "Physics"]
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

### Get Teacher Labs

Retrieves lab information for a specific teacher (admin only).

- **URL**: `/admin/teachers/{id}/labs`
- **Method**: `GET`
- **Auth Required**: Yes (admin only)
- **Success Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Teacher lab information retrieved successfully",
    "data": {
      "teacher_id": 2,
      "teacher_name": "Teacher Name",
      "subjects": [
        {
          "subject": "Math",
          "groups": [
            {
              "group_name": "Group A",
              "total_labs": 5,
              "group_average": 4.2
            }
          ]
        }
      ]
    }
  }
  ```
- **Error Response**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`
