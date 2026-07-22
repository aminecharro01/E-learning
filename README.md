# IAT Academy — Plateforme e-learning

Monorepo de la plateforme IAT Academy (formation 2 ans, 36 modules, quiz, attestation PDF).

## Stack

| Couche | Techno |
|--------|--------|
| Frontend | Next.js 15 (TypeScript, Tailwind) |
| Backend | Java 21 / Spring Boot 3.4 |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| Infra | Docker Compose · Hostinger VPS |

## Structure

```
E-learning/
├── backend/          # Spring Boot API
├── frontend/         # Next.js (App Router)
├── deploy/           # Nginx & déploiement
├── data/media/       # Médias locaux (vidéos, PDF…)
├── docker-compose.yml
└── .env.example
```

## Démarrage rapide (dev)

### 1. Prérequis

- Docker Desktop
- Java 21+ (outil Maven Wrapper à installer — voir ci-dessous)
- Node.js 20+

### 2. Variables d'environnement

```bash
cp .env.example .env
```

### 3. Bases de données

```bash
docker compose up -d postgres redis
```

> **Note Windows :** PostgreSQL Docker utilise le port **5433** (pas 5432), pour éviter le conflit avec un PostgreSQL local.

### 4. Backend

```bash
cd backend
# Si Maven n'est pas installé : installer Maven ou utiliser le wrapper (./mvnw)
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

API : http://localhost:8080  
Swagger : http://localhost:8080/swagger-ui.html  
Compte admin seed : `admin@iat-academy.local` / `Admin@123`

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

App : http://localhost:3000

## Auth API (étape 3)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription apprenant |
| POST | `/api/auth/login` | Connexion (+ cookie JWT httpOnly) |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Profil courant |

## Plan d'exécution

1. ✅ Monorepo + Docker Compose (Postgres + Redis)
2. ✅ Entités JPA + Flyway + Spring Security + JWT
3. ✅ Auth (register / login / logout / me)
4. ✅ Modules / leçons / blocs + verrou Redis
5. ✅ Moteur quiz + minuteur Redis + scoring
6. ✅ Progression + attestation PDF
7. ✅ Frontend /app (dashboard, modules, leçons) + auth
8. ✅ Nginx + médias signés + éditeur admin Tiptap + quiz UI
9. ⏳ Tests E2E + docs déploiement production

## API principales (MVP)

| Domaine | Endpoints |
|---------|-----------|
| Auth | `POST /api/auth/register\|login\|logout`, `GET /api/auth/me` |
| Catalogue | `GET /api/formations/{id}`, `GET /api/modules/{id}` (403 si verrouillé) |
| Progression | `GET /api/progress/me`, `POST /api/progress/lessons/{id}` |
| Leçons | `GET/PUT /api/lessons/{id}`, CRUD blocs, `POST/PATCH/DELETE .../lock` |
| Quiz | `POST /api/quiz/{id}/start\|submit`, `GET .../attempts`, create quiz/questions |
| Attestation | `GET /api/certificates/me`, `/me/download`, `/verify/{code}` |

## Guide Master

Document pédagogique **interne** — hors périmètre application.
