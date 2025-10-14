# Mannan Portfolio

Full-stack portfolio with Angular 20 frontend, Spring Boot backend, and real-time cursor tracking.

## Tech Stack

- **Frontend**: Angular 20, NgRx, Signals, Tailwind CSS 4
- **Backend**: Spring Boot 3.5.6, Java 25
- **Features**: WebSocket cursor tracking, Vercel Analytics

## Quick Start

Frontend (http://localhost:4200):
```bash
npm start
```

Backend (http://localhost:8080):
```bash
cd backend && ./mvnw spring-boot:run
```

WebSocket Server:
```bash
npm run ws-server
```

## Project Structure

```
/src                  Angular frontend
/src/app/components   UI components (home, about, contact, header)
/src/app/store        NgRx state management
/src/app/services     Data and navigation services
/backend              Spring Boot REST API
/server               WebSocket cursor server
```

## Available Commands

```bash
npm run build    Production build
npm run watch    Dev build with auto-reload
npm test         Run tests
```

## Deployment

```bash
vercel
```
