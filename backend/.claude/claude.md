# Resume Request API

## Project Overview

This is a Spring Boot REST API backend for mannan.is (Mannan's personal website) that enables visitors to request a copy of the resume via email. The application collects user information (first name, last name, and email) through a REST endpoint.

## Tech Stack

- **Framework**: Spring Boot 3.5.6
- **Language**: Java 25
- **Build Tool**: Maven
- **Dependencies**:
  - spring-boot-starter-web (REST API)
  - spring-boot-starter-test (Testing)

## Current Implementation

### Data Model

**Viewer** (`com.example.demo.classes.Viewer`)
- `id`: Integer - Auto-generated unique identifier
- `firstName`: String - Visitor's first name
- `lastName`: String - Visitor's last name
- `email`: String - Visitor's email address for resume delivery

### REST Endpoints

**Base URL**: `http://localhost:8080/viewers/`

1. **GET /viewers/** - Retrieve all viewers
   - Returns: JSON object with `viewerList` array
   - Use case: Admin view of all resume requests

2. **POST /viewers/** - Add new viewer/resume request
   - Request body: `{ "firstName": "string", "lastName": "string", "email": "string" }`
   - Returns: 201 Created with Location header
   - Use case: Website visitors submitting their info to receive resume

### Architecture

- **Controller Layer**: `ViewerController.java` - Handles HTTP requests/responses
- **Data Layer**: `ViewersDAO.java` - Repository for in-memory data storage
- **Model Layer**:
  - `Viewer.java` - Individual viewer entity
  - `Viewers.java` - Collection wrapper for viewer list

### Current Data Storage

Currently using in-memory storage via static collection in `ViewersDAO`. Data is initialized with 3 sample viewers and persists only during application runtime.

## Project Goals

### Phase 1: Data Collection (Current)
- ✅ REST endpoint to collect visitor information
- ✅ Basic validation through Spring Boot
- ✅ In-memory storage for testing

### Phase 2: Email Integration (Planned)
- Add email service (e.g., JavaMailSender, SendGrid, AWS SES)
- Implement resume attachment logic
- Send automated email with resume PDF when POST request received
- Add email template for professional delivery

### Phase 3: Persistence (Future)
- Replace in-memory storage with database (MySQL, PostgreSQL, or H2)
- Add JPA/Hibernate for ORM
- Track request history and analytics

### Phase 4: Enhancements (Future)
- CORS configuration for mannan.is frontend
- Rate limiting to prevent spam
- Email validation
- Error handling and custom responses
- Request logging and monitoring
- Optional: Admin dashboard to view requests

## Running the Application

### Quick Start
```bash
./run.sh
```

### Using Maven Wrapper
```bash
./mvnw spring-boot:run
```

### Build JAR
```bash
./mvnw clean package
java -jar target/demo-0.0.1-SNAPSHOT.jar
```

Application runs on: `http://localhost:8080`

## Testing the API

### Get all viewer requests
```bash
curl http://localhost:8080/viewers/
```

### Submit new resume request
```bash
curl -X POST http://localhost:8080/viewers/ \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }'
```

## Integration with mannan.is

The frontend at https://mannan.is will:
1. Display a form for visitors to enter their name and email
2. Submit POST request to this API endpoint
3. Show confirmation message to user
4. User receives resume via email (once email integration is complete)

## Known Limitations

1. **No Persistence**: Data is lost on application restart
2. **No Email Sending**: Currently only collecting data, not sending resume
3. **No CORS**: May need CORS configuration for production frontend
4. **No Validation**: Missing email format validation, required field checks
5. **No Security**: No rate limiting or spam prevention
6. **ID Generation**: Simple increment-based ID (not production-ready)

## Development Notes

- Package structure: `com.example.demo`
- Main application: `DemoApplication.java`
- Controller path: `/viewers/`
- All data operations are synchronous
- No external dependencies beyond Spring Boot starters

## Next Steps

1. Add email service dependency (spring-boot-starter-mail or cloud provider SDK)
2. Configure SMTP/email service credentials
3. Create resume PDF as application resource
4. Implement email sending in ViewerController POST endpoint
5. Add proper error handling and response messages
6. Configure CORS for production domain
7. Add input validation annotations (@NotNull, @Email, etc.)
8. Consider database integration for production use

## Contact

Website: https://mannan.is
Project: Personal portfolio resume request system
