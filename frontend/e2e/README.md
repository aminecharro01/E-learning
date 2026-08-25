# E2E tests (Playwright)

These specs drive a real browser against a real backend — they are **not**
run as part of `npm run build`/`npm test` and need a running stack:

1. Postgres + Redis: `docker compose up -d` from the repo root (or ensure
   `iat-postgres` / `iat-redis` are already running).
2. A throwaway backend instance with demo seed data, on an alternate port
   so it never collides with your own `spring-boot:run`:
   ```
   cd backend
   SERVER_PORT=8091 ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
3. From `frontend/`, run the suite — Playwright starts its own dev server
   on port 3000 (via `webServer` in `playwright.config.ts`) pointed at that
   backend:
   ```
   npm run test:e2e
   ```

Port 3000 is the default here (not an alternate port) because the backend's
CORS allow-list defaults to `http://localhost:3000` — a frontend served from
any other port is rejected by the browser's CORS check even though the
request succeeds server-side. If your own `npm run dev` is already using
3000, either stop it first or override both `PLAYWRIGHT_PORT` and the
backend's `CORS_ORIGINS` env var together to a matching alternate pair.

Specs use the demo learner account seeded by `DemoDataSeeder`
(`apprenant@iat-academy.local` / `Apprenant@123`). Don't point these at a
real production database — `quiz.spec.ts` creates a real quiz attempt.
