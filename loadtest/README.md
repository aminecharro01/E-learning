# Load & stress tests

Plain Node scripts (global `fetch`, no dependencies to install) exercising the
backend under concurrency. Not part of `mvn test` or `npm test` — these hit a
real running backend and are meant to be run manually or from a perf-focused
CI job, not on every commit.

## Prerequisites

1. Postgres + Redis running (`docker compose up -d` from the repo root, or the
   `iat-postgres`/`iat-redis` containers already up).
2. A backend instance with demo seed data:
   ```
   cd backend
   SERVER_PORT=8091 ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
   ```
3. From the repo root:
   ```
   node loadtest/quiz-start-concurrency.js
   node loadtest/read-throughput.js
   node loadtest/login-rate-limit.js   # run this one last — see note below
   ```

Override the target with `LOADTEST_API_URL` (default `http://localhost:8091`).

## What each script checks

- **`quiz-start-concurrency.js`** — fires 20 genuinely concurrent `/start`
  calls for the same user+quiz and asserts they all succeed and return the
  *same* attemptId. This is a real race, not the sequential double-call the
  unit/integration tests use — it's the strongest check available that the
  resume-on-start fix (see git history: "Resume an already-open quiz attempt
  instead of blocking with a false error") is actually safe under concurrency,
  not just when called twice in a row. Cleans up the attempt it creates.

- **`read-throughput.js`** — baseline req/s and latency percentiles (p50/p95/p99)
  for a typical authenticated read (`GET /api/auth/me`), at moderate
  concurrency. Re-run after a change to compare against this baseline rather
  than guessing whether something got slower.

- **`login-rate-limit.js`** — fires 15 bad-password login attempts and expects
  the abuse protection (`RateLimitService`, 10 attempts / 15 min per IP) to
  kick in with 429s rather than letting every attempt reach bcrypt/DB.
  **Run this one last**: it deliberately exhausts the login rate limit for
  your own IP, which then blocks *your* real logins (including the other two
  scripts above, and manual testing in the browser) for up to 15 minutes. Clear
  it early if you need to log in again immediately:
  ```
  docker exec iat-redis redis-cli DEL "rate:login:127.0.0.1" "rate:login:0:0:0:0:0:0:0:1"
  ```
