# Lessons Export API Documentation

## Export Lessons to Excel

Allows teachers to export their lessons to an Excel file, with the option to filter by group, subject, or date range.

### Endpoint

```
GET /api/lessons/export
```

### Authorization

- Requires JWT authentication
- Requires paid subscription (not available for free users)

### Query Parameters

| Parameter  | Type   | Required | Description                                   |
|------------|--------|----------|-----------------------------------------------|
| group      | string | No       | Filter lessons by group name                  |
| subject    | string | No       | Filter lessons by subject                     |
| from_date  | string | No       | Filter lessons from this date (YYYY-MM-DD)    |
| to_date    | string | No       | Filter lessons until this date (YYYY-MM-DD)   |

### Response

Returns an Excel file with the following characteristics:

**When no group filter is applied (all lessons):**
- Sheet name: "All Lessons"
- Columns: Date, Subject, Group, Topic, Type, Hours
- Summary row with total number of lessons and total hours

**When a group filter is applied:**
- Sheet name: "Group [group_name]"
- Columns: Date, Subject, Topic, Type, Hours
- Summary row with total number of lessons and total hours

### Excel File Format

1. **All Lessons Export:**
   ```
   | Дата       | Предмет      | Группа      | Тема            | Тип             | Часы |
   |------------|--------------|-------------|-----------------|-----------------|------|
   | 15.03.2025 | Математика   | ИС-31       | Интегралы       | Лекция          | 2    |
   | 16.03.2025 | Физика       | ИС-32       | Механика        | Практика        | 4    |
   | ...        | ...          | ...         | ...             | ...             | ...  |
   | Всего:     | 10 занятий   |             |                 |                 | 24   |
   ```

2. **Group-Specific Export:**
   ```
   | Дата       | Предмет      | Тема            | Тип             | Часы |
   |------------|--------------|-----------------|-----------------|------|
   | 15.03.2025 | Математика   | Интегралы       | Лекция          | 2    |
   | 18.03.2025 | Математика   | Производные     | Практика        | 2    |
   | ...        | ...          | ...             | ...             | ...  |
   | Всего:     | 5 занятий    |                 |                 | 12   |
   ```

### Example Requests

1. **Export all lessons:**
   ```
   GET /api/lessons/export
   Authorization: Bearer your_jwt_token
   ```

2. **Export lessons for a specific group:**
   ```
   GET /api/lessons/export?group=ИС-31
   Authorization: Bearer your_jwt_token
   ```

3. **Export lessons with multiple filters:**
   ```
   GET /api/lessons/export?group=ИС-31&subject=Математика&from_date=2025-01-01&to_date=2025-03-31
   Authorization: Bearer your_jwt_token
   ```

### Error Responses

| Status Code | Description           | Response Body                                  |
|-------------|-----------------------|-----------------------------------------------|
| 401         | Unauthorized          | `{"success": false, "error": "Unauthorized"}` |
| 403         | Subscription required | `{"success": false, "error": "Subscription required"}` |
| 500         | Server error          | `{"success": false, "error": "Error message"}` |

### Notes

- The Excel file will be formatted with dates in DD.MM.YYYY format
- A summary row is included at the bottom of each sheet
- The export is limited to lessons created by the authenticated teacher
- This endpoint requires a paid subscription (teacher role)