# Viewer Management API

A Spring Boot REST API backend that manages viewer information. The API collects visitor data including name, email, and reason for visiting.

## Prerequisites

- Java 17 or higher
- Maven (included via Maven Wrapper)

## Project Purpose

This REST API provides a backend service for managing viewer information with flexible data collection and retrieval capabilities.

## Project Structure

```
backend/
├── src/
│   └── main/
│       └── java/
│           └── com/example/demo/
│               ├── controller/      # REST Controllers
│               │   └── ViewerController.java
│               ├── classes/         # Models and DAOs
│               │   ├── Viewer.java
│               │   ├── Viewers.java
│               │   └── ViewersDAO.java
│               └── DemoApplication.java
```

## Running the Application

### Option 1: Using the run script (Linux/Mac)
```bash
./run.sh
```

### Option 2: Using Maven Wrapper directly
```bash
# Linux/Mac
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```

### Option 3: Build and run JAR
```bash
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

The application will start on **http://localhost:8080**

## API Endpoints

**Base URL**: `http://localhost:8080/viewers/`

### Get All Viewers
```bash
GET http://localhost:8080/viewers/
```

**Response:**
```json
{
  "viewerList": [
    {
      "id": "uuid-string",
      "name": "Prem Tiwari",
      "email": "prem@gmail.com",
      "reason": "Interest in content"
    }
  ]
}
```

### Get Viewer by Identifier
```bash
GET http://localhost:8080/viewers/{identifier}
```

Supports lookup by:
- UUID (id)
- Email address
- Name
- Reason

### Add New Viewer
```bash
POST http://localhost:8080/viewers/
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "reason": "Portfolio review"
}
```

At least one field (name, email, or reason) is required.

**Response:**
- Status: `201 Created`
- Location header with URI of created resource

### Update Viewer
```bash
PUT http://localhost:8080/viewers/{identifier}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com",
  "reason": "Updated reason"
}
```

Supports lookup by id, email, name, or reason.

## Testing with curl

### Get all viewers:
```bash
curl http://localhost:8080/viewers/
```

### Get viewer by email:
```bash
curl http://localhost:8080/viewers/prem@gmail.com
```

### Add a viewer:
```bash
curl -X POST http://localhost:8080/viewers/ \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","reason":"Interested"}'
```

### Update a viewer:
```bash
curl -X PUT http://localhost:8080/viewers/prem@gmail.com \
  -H "Content-Type: application/json" \
  -d '{"reason":"Updated interest"}'
```

## Building the Project

```bash
./mvnw clean package
```

The built JAR will be available at `target/demo-0.0.1-SNAPSHOT.jar`

## Stopping the Application

Press `Ctrl + C` in the terminal where the application is running.

## Tech Stack

- **Framework**: Spring Boot 3.5.6
- **Language**: Java 25
- **Build Tool**: Maven
- **Current Dependencies**:
  - spring-boot-starter-web (REST API)
  - spring-boot-starter-test (Testing)

## Current Features

- In-memory data storage
- Flexible viewer lookup (by id, email, name, or reason)
- RESTful API design
- UUID-based unique identifiers
- Partial field updates

## Future Enhancements

- Database persistence (H2, PostgreSQL, or MySQL)
- Input validation improvements
- CORS configuration
- Rate limiting
- Enhanced error handling
