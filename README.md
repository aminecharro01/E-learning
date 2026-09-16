# IAT Academy — E-Learning Platform

IAT Academy is a full-stack e-learning platform for a 2-year training program: 36 modules, interactive quizzes with timed attempts, learner progression tracking, and PDF certificate generation with verification. Monorepo with a Spring Boot API and a Next.js frontend.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

## Key Features

- **Authentication** — register/login/logout with httpOnly JWT cookies (`/api/auth/*`)
- **Course catalogue** — formations, modules, and lessons with sequential locking (403 until prerequisites are met)
- **Lesson editor** — block-based lesson content with a Tiptap rich-text admin editor, and Redis-backed edit locks to prevent concurrent edits
- **Quiz engine** — timed quiz attempts backed by Redis, automatic scoring, retry delays
- **Progression tracking** — per-learner progress across modules/lessons/UF (unités de formation)
- **Certificates** — PDF certificate generation, download, and public verification by code
- **AI-assisted content** — question generation via Gemini (primary) with Grok/xAI fallback
- **Video delivery** — local disk by default, or Bunny Stream CDN when enabled
- **Messaging & badges** — learner messaging, achievement badges, job board (bourse d'emploi)
- **Admin tooling** — user/tenant administration, audit, stage (internship) dossier validation

## Project Structure

```
E-learning/
├── backend/                    # Spring Boot 3 REST API (Java 21)
│   └── src/main/java/ma/iatacademy/api/
│       ├── config/             # Security, AI providers, app platform config
│       ├── controller/         # REST endpoints
│       ├── domain/             # JPA entities
│       ├── dto/
│       ├── repository/
│       ├── security/           # JWT filters, RBAC
│       └── service/
├── frontend/                   # Next.js 15 (App Router, TypeScript, Tailwind)
│   └── src/
│       ├── app/                # Routes: (auth), (admin), app/, achievements/, verify/, ...
│       ├── components/         # learner/, admin/, auth/, messaging/, stage/, ui/
│       ├── context/ hooks/ lib/
├── deploy/                     # Nginx config & deployment scripts
├── diagrammes_v2/              # UML source diagrams (PlantUML) + rendered images
├── rapport_latex/              # LaTeX academic report (main.pdf tracked; build artifacts ignored)
├── docker-compose.yml
└── .env.example
```

## Getting Started

### Prerequisites

- Docker Desktop
- Java 21+ (Maven Wrapper included — no global Maven required)
- Node.js 20+

### Environment Variables

```bash
cp .env.example .env
```

Key variables (see `.env.example` for the full list): `DB_URL`/`DB_USER`/`DB_PASSWORD`, `REDIS_HOST`/`PORT`, `JWT_SECRET` (≥32 chars, required), `MEDIA_ROOT`, and optional `BUNNY_STREAM_*` / `GEMINI_*` / `GROK_*` keys for video CDN and AI features.

### Database & Cache

```bash
docker compose up -d postgres redis
```

> On Windows, the Dockerized PostgreSQL uses host port **5433** (not 5432) to avoid conflicting with a local install.

### Backend

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

- API: http://localhost:8080
- Swagger: http://localhost:8080/swagger-ui.html
- Seeded admin (local/dev only): `admin@iat-academy.local` / `Admin@123`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## API Overview

| Domain | Endpoints |
|---|---|
| Auth | `POST /api/auth/register\|login\|logout`, `GET /api/auth/me` |
| Catalogue | `GET /api/formations/{id}`, `GET /api/modules/{id}` (403 if locked) |
| Progression | `GET /api/progress/me`, `POST /api/progress/lessons/{id}` |
| Lessons | `GET/PUT /api/lessons/{id}`, block CRUD, `POST/PATCH/DELETE .../lock` |
| Quiz | `POST /api/quiz/{id}/start\|submit`, `GET .../attempts` |
| Certificates | `GET /api/certificates/me`, `/me/download`, `/verify/{code}` |

Full documentation available via Swagger UI when the backend is running.

## Testing

```bash
cd backend && ./mvnw test
cd frontend && npm run build   # type-checks and builds
```

## Deployment

Docker Compose + Nginx on a VPS — see `deploy/` for Nginx config and deployment scripts.
