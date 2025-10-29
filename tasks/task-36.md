### Task 36: Create LLM Form Validation Backend Endpoint
- [ ] Create Spring Boot REST endpoint for LLM-based form validation
- [ ] Integrate LLM API (OpenAI/Anthropic) for input parsing
- [ ] Extract name, email, and reason from user input text
- [ ] Generate contextual reasonResponse based on detected intent
- [ ] Add recruiter-specific response: "Welcome! I'm open for job placement conversations Mon-Fri 11am-4pm ET"
- [ ] Add multiple example reason responses for different visitor types
- [ ] Return structured JSON response with extracted fields and reasonResponse
- [ ] Handle async processing with appropriate HTTP status codes
- Location: `backend/src/main/java/com/mannan/controllers/`, create new LLM service
