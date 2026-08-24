## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Project Overview

IAT Academy — e-learning platform for aviation/tourism training (French UI, navy/gold branding).

- **Backend:** Spring Boot 3.4.5 (Java 21+), PostgreSQL (Flyway-migrated), Redis (rate limiting), JWT auth via httpOnly cookies, Docker Compose for local Postgres/Redis.
- **Frontend:** Next.js 15 (App Router, Turbopack), TypeScript strict, Tailwind v4, axios-based API client.
- **Two shells:** `(admin)/admin/**` for staff (Formateur/Admin/Super Admin — role hierarchy `ROLE_SUPER_ADMIN > ROLE_ADMIN`), `app/**` for learners (Étudiant). Each shell's `layout.tsx` provides auth guarding + chrome (sidebar/header) for free — a new page dropped under either tree needs no extra wiring.

## Build, Lint & Test Commands

Backend (run from `backend/`):
```
./mvnw -q compile                                          # compile only
./mvnw -q test                                              # full JUnit5 + Mockito suite
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev        # local run (needs Postgres+Redis up)
```

Frontend (run from `frontend/`):
```
npx tsc --noEmit                     # type-check
npx eslint . --ext .ts,.tsx
npm run build                        # production build (also type-checks + lints)
npm run dev                          # dev server (Turbopack)
```

**After every change, backend or frontend:** run the relevant compile/test and tsc/eslint/build commands above before considering the change done. Both must be clean before committing.

**Verifying against a live backend:** never start `npm run dev` or `spring-boot:run` on the default ports (3000/8080) if the user's own dev servers might already be running there — use an alternate `SERVER_PORT` (8091+) for a throwaway backend instance, curl it with real demo credentials, then kill the process. Always `rm -rf frontend/.next` after any `npm run build` you run yourself — it writes to the same directory the user's `npm run dev` uses and can corrupt their dev session's cache (this has happened before and caused a hydration-mismatch bug).

## Coding Standards & Conventions

**Backend**
- `@RestController` → `@Service` → `@Repository` layering is deliberate and consistently thin at the controller level: controllers only do path mapping, `@PreAuthorize`, request/response translation, and delegate to exactly one service call. Business logic belongs in services — don't let it leak into controllers.
- DTOs are Java records under `dto/<feature>/`, one file per request/response shape.
- New AI-integration services follow the `QuestionGenerationService` / `CourseAssistantService` pattern: `AiProviderProperties` for Gemini (primary) / Grok (fallback) config (a provider is "configured" once its API key is non-blank, no separate enabled flag), and package-private (not private) `callGemini`/`callGrok` methods so tests can `Mockito.spy()` and stub the network call without hitting a real API.
- Rate-limit anything that calls an external paid API or is easy to spam — add a method to `RateLimitService` (Redis-backed) rather than inventing a new mechanism.
- Every endpoint touching a specific user's data needs either a role check (`@PreAuthorize`) or an explicit ownership check inside the service (see `MessagingService#assertAccess`, `NotificationService#markRead`). Self-scoped endpoints (a user acting on their own profile/messages/notes) intentionally carry no role restriction beyond `authenticated()` — but the service MUST scope every query to the authenticated principal's own ID, never a client-supplied one.

**Frontend**
- Shared UI class helpers live in `lib/ui.ts` (`btn.*`, `inputClass`) — don't hardcode Tailwind button/input classes inline.
- Reusable branded components: `Loader`/`PageLoader` (`components/ui/Loader.tsx`) for any waiting state, `Skeleton` for content-shaped loading placeholders. Both are theme-aware via CSS custom properties (`--primary`, `--gold-*`, `--navy`, `--surface*`) — never hardcode hex colors in a component; use the existing tokens (see `globals.css`) so dark mode / theme variants keep working for free.
- Component-extraction pattern for logic shared between the learner and staff shells: extract the stateful "core" component with no page chrome, then each role-specific page renders it wrapped in its own header/layout (see `MessagingConsole`, `AccountSettingsPanel`).
- React Strict Mode double-invokes effects in dev — any effect with an async side-effect (poll, fetch) needs a `let cancelled = false` guard checked after each `await`, with `cancelled = true` set in the cleanup function.
- Never add a `Co-Authored-By: Claude` (or any AI) trailer to commits in this repo — the project is reviewed by the user's academic supervisor.

## Directory Conventions

- `backend/src/main/java/ma/iatacademy/api/{controller,service,repository,domain/entity,domain/enums,dto/<feature>,config,exception,security}`
- `backend/src/main/resources/db/migration/V<N>__description.sql` — sequential Flyway migrations. Never edit a migration once it has been merged/deployed; add a new one instead.
- `frontend/src/app/(admin)/admin/**` — staff pages.
- `frontend/src/app/app/**` — learner pages.
- `frontend/src/components/{admin,learner,ui,auth,brand,messaging,account}/` — grouped by which shell/domain owns them; `ui/` holds shell-agnostic shared primitives.
- `frontend/src/lib/api.ts` — single file with every typed API client function. Add new ones here rather than scattering ad-hoc `axios`/`fetch` calls through pages.

## Safety Constraints (Non-Negotiable)

1. Never rewrite working business logic or change an existing API response shape unless the task explicitly calls for it (bug fix, requested refactor, or a named vulnerability).
2. Run the backend test suite and frontend tsc/eslint/build after every change — a change isn't done until both are clean.
3. Never run a destructive git operation (force-push without `--force-with-lease`, `reset --hard`, branch deletion, history rewrite) without explicit confirmation. This repo's history is reviewed by the user's supervisor — treat any history-altering operation as high-risk by default.
4. Any new endpoint touching user-specific data must be scoped to the authenticated principal or explicitly role-gated (`@PreAuthorize`) — never trust a client-supplied user ID for anything beyond intentionally public or staff-only actions.
5. `backend/data/` is untracked on purpose (local media storage) — never `git add` it.
