# Mannan

Full-stack portfolio built with Angular 20 and Spring Boot.

## Stack

**Frontend:** Angular 20, NgRx, Tailwind CSS
**Backend:** Spring Boot, Java REST API

## Development

```bash
npm start
```
Frontend runs at `http://localhost:4200`

```bash
cd backend && ./mvnw spring-boot:run
```
Backend development server

## Scripts

```bash
npm run build      # Production build
npm run watch      # Build with auto-reload
npm test           # Run tests
```

## Structure

```
/src            # Angular frontend
/backend        # Spring Boot API
/src/app/store  # NgRx state
```

## Deploy

```bash
npm i -g vercel
vercel
```
