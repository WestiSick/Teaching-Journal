# Teacher Journal REST API Implementation Guide

This guide will help you migrate the Teacher Journal application from a server-side rendered application to a REST API with a React frontend.

## Directory Structure

The new application structure will be organized as follows:

```
TeacherJournal/
├── app/
│   ├── api/               # REST API backend
│   │   ├── auth/          # Authentication related code
│   │   ├── cmd/           # Command line tools and server 
│   │   ├── db/            # Database access and models
│   │   ├── handlers/      # API request handlers
│   │   ├── models/        # Data models
│   │   └── utils/         # Utility functions
│   └── frontend/          # React frontend
│       ├── public/
│       └── src/
├── config/                # Shared configuration
└── attachments/           # File storage
```

## Migration Steps

Follow these steps to migrate the application from server-side rendering to a REST API with React frontend:

### 1. Set Up the REST API

1. Create the API directory structure as shown above.
2. Implement the database models in `app/api/models/models.go`.
3. Implement database connection in `app/api/db/db.go`.
4. Implement utility functions in the `app/api/utils/` directory.
5. Implement JWT-based authentication in `app/api/auth/`.
6. Implement API handlers in the `app/api/handlers/` directory.
7. Set up the main server file in `app/api/cmd/server/main.go`.

### 2. Test the API

1. Test the API endpoints using tools like Postman or curl.
2. Verify authentication and authorization.
3. Test CRUD operations for all resources (lessons, students, groups, etc.).
4. Test specialized endpoints like attendance tracking and lab grades.

### 3. Set Up the React Frontend

1. Create a new React application using Create React App:
   ```bash
   npx create-react-app app/frontend
   ```

2. Set up routing using React Router:
   ```bash
   cd app/frontend
   npm install react-router-dom
   ```

3. Set up state management using Redux or React Context API:
   ```bash
   npm install redux react-redux redux-thunk
   ```

4. Create UI components corresponding to the API endpoints.

### 4. Connect Frontend to API

1. Configure API client using Axios or Fetch API:
   ```bash
   npm install axios
   ```

2. Implement authentication flow in the frontend.
3. Create services for each API resource.
4. Connect UI components to the API services.

## File Replacements

Here's how the old files map to the new structure:

| Old File | New File(s) |
|----------|-------------|
| `app/dashboard/cmd/server/main.go` | `app/api/cmd/server/main.go` |
| `app/dashboard/models/models.go` | `app/api/models/models.go` |
| `app/dashboard/db/db.go` | `app/api/db/db.go` |
| `app/dashboard/db/*.go` | Functionality moved to API handlers |
| `app/dashboard/handlers/*.go` | `app/api/handlers/*.go` |
| `app/dashboard/templates/` | Replaced by React components |
| `app/dashboard/utils/utils.go` | `app/api/utils/*.go` |
| `config/config.go` | Unchanged, but consider adding JWT configuration |

## Key Improvements

The new architecture provides several advantages:

1. **Separation of Concerns**: Clear separation between frontend and backend.
2. **Scalability**: API and frontend can be scaled independently.
3. **Modern User Experience**: React frontend provides a more responsive UI.
4. **Mobile Ready**: The API can serve both web and mobile clients.
5. **Improved Authentication**: JWT-based authentication is more secure and scalable.
6. **Better Error Handling**: Standardized error responses.
7. **API Documentation**: Clear documentation for all endpoints.

## React Frontend Structure

The React frontend should be structured as follows:

```
app/frontend/
├── public/
└── src/
    ├── components/       # Reusable UI components
    │   ├── common/       # Common UI elements
    │   ├── auth/         # Authentication components
    │   ├── dashboard/    # Dashboard components
    │   ├── lessons/      # Lesson management components
    │   ├── groups/       # Group management components
    │   ├── students/     # Student management components
    │   ├── attendance/   # Attendance components
    │   └── labs/         # Lab grades components
    ├── pages/            # Page components
    ├── services/         # API services
    ├── store/            # Redux store and actions
    ├── utils/            # Utility functions
    ├── hooks/            # Custom hooks
    ├── contexts/         # React contexts
    ├── App.js            # Main application component
    └── index.js          # Entry point
```

## Authentication Flow

The authentication flow should work as follows:

1. User logs in with email and password.
2. Backend validates credentials and returns a JWT token.
3. Frontend stores the token in local storage or a secure cookie.
4. Frontend includes the token in the `Authorization` header for all API requests.
5. Backend validates the token for each protected endpoint.
6. Token expiration is handled by implementing a token refresh mechanism.

## Deployment Considerations

1. **API Deployment**:
   - Can be deployed as a standalone service.
   - Consider containerization using Docker.
   - Use environment variables for configuration.

2. **Frontend Deployment**:
   - Build the React app for production:
     ```bash
     npm run build
     ```
   - Deploy the built files to a static file server or CDN.
   - Configure the production API URL.

3. **CORS Configuration**:
   - Ensure the API allows requests from the frontend domain.
   - Set up proper CORS headers in the API.

4. **SSL/TLS**:
   - Enforce HTTPS for both API and frontend.
   - Configure SSL certificates.

5. **Database Backup**:
   - Implement regular database backups.
   - Plan for data migration if needed.

## Next Steps

1. Implement the REST API according to the API documentation.
2. Set up a CI/CD pipeline for automated testing and deployment.
3. Develop the React frontend components.
4. Conduct thorough testing of both API and frontend.
5. Deploy the application to a production environment.
6. Monitor performance and address any issues.

## Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Redux Documentation](https://redux.js.org/introduction/getting-started)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [JWT.io](https://jwt.io/)
- [Go Documentation](https://golang.org/doc/)
- [Gorilla Mux Documentation](https://github.com/gorilla/mux)
- [GORM Documentation](https://gorm.io/docs/)

By following this guide, you'll successfully migrate the Teacher Journal application from a server-side rendered application to a modern React frontend with a REST API backend.
