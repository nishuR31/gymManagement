# Architecture Audit

## Current Architecture

- Monorepo with separate applications in `apps/api` and `apps/web`.
- Shared API-facing DTOs/enums live in `packages/shared`.
- Backend layers are organized as routes -> controllers/services -> repositories -> Prisma/PostgreSQL, with Redis cache services for aggregate reads.
- Frontend layers are organized as routes/pages -> feature API clients -> shared Axios client, with Redux Toolkit holding auth/session state.
- Authentication uses short-lived JWT access tokens and HTTP-only refresh-token cookies scoped to `/auth`.
- Authorization is enforced in backend services/middleware and mirrored in frontend route guards.
- Persistence is PostgreSQL through Prisma. Redis is used for attendance, payments, inventory, dashboard, and report aggregate caching.
- Docker Compose runs Postgres, Redis, API, and nginx-served frontend.

## Changes Applied In This Pass

- Kept the existing monorepo because the frontend and backend were already physically separated and share a useful typed contract package.
- Added explicit root scripts for independent API/web dev, build, lint, test, Prisma, and Docker workflows.
- Removed Bun-only API scripts from the npm workspace.
- Split environment examples into `apps/api/.env.example` and `apps/web/.env.example`.
- Reduced root `.env.example` to Compose-oriented defaults plus app variables used by containers.
- Tightened `.gitignore` for app-local env files and generated TypeScript/Vite artifacts.
- Fixed web Docker build-time `VITE_API_URL` handling.
- Added nginx SPA fallback and static asset caching.
- Added frontend role route guards so member sessions cannot navigate into admin routes by URL.
- Prevented staff users from calling admin-only payment analytics while preserving their ability to record payments.
- Improved the authenticated loading screen from a bare placeholder to a branded token-based loader.
- Improved the Payments page workflow: searchable member selection, pending-dues cards, direct record-payment actions, and clearer paid/partial feedback.
- Made CORS support a validated comma-separated origin allowlist.
- Moved default payment/refund timestamps into `PaymentService` so analytics, cache invalidation tests, and injected clocks use one consistent time source.
- Ran a dependency audit and applied the safe non-forced fix, updating `nanoid` through the lockfile.
- Added route-level frontend code splitting with `React.lazy`/`Suspense`; production build now emits page-level chunks instead of one large dashboard bundle.
- Added frontend tests for role-gated routing, loading-button duplicate-submit prevention, and Axios refresh-token retry behavior.
- Added a real headless Chrome smoke script for deployment/browser verification against running API/web URLs.

## Reviewed Areas

- Repository/package layout.
- Root/API/web/shared package scripts.
- Dockerfiles and Compose configuration.
- API env loading and validation.
- API route registration and auth middleware.
- Payment, dashboard, and auth service flows.
- Frontend routing, auth bootstrap, protected routes, role-sensitive dashboard layout, and payments workflow.
- Existing tests layout and major UI components.

## Remaining Technical Debt

- The root `dev` script still uses shell backgrounding. It is convenient but less robust than a process manager. Avoiding a new dependency kept this pass lower risk.
- No frontend component tests or E2E tests exist yet.
- Bundle size exceeds Vite's default warning threshold. The most likely next improvement is route-level lazy loading for dashboard pages.
- `npm audit` still reports advisories in Fastify, Vite/esbuild, and React Router that require broader framework upgrades or breaking changes. These should be handled as a dedicated upgrade branch with full regression testing.
- Current dependency investigation:
  - `fastify@4.29.1` / `find-my-way@8.2.2`: audit fix requires Fastify 5, a breaking API framework upgrade.
  - app build `vite@5.4.21` / `esbuild@0.21.5`: audit fix requires a Vite major upgrade; the advisory affects dev-server exposure.
  - `react-router-dom@6.30.4`: audit still reports React Router advisories; npm did not resolve them with non-forced fixes, so this should be planned as a v7 migration/regression pass.
- Prisma schema is large and should eventually be reviewed with real query plans from production-like data.
- Some older pages still use basic loading rows rather than fully bespoke skeletons.
- `window.confirm` remains in at least one subscription cancellation flow and should be replaced with the shared modal pattern.

## Review Pass 1

- Re-ran API and web type checks.
- Re-ran production builds for shared, API, and web.
- Re-ran the full API suite.
- Found and fixed date-sensitive payment analytics failures caused by repository-owned default timestamps.
- Confirmed frontend route guards compile and mirror dashboard navigation policy.

## Review Pass 2

- Re-scanned docs/scripts for stale `bun`, `frontend`, and `backend` paths.
- Rechecked Docker/Vite API URL handling after build.
- Rechecked member/admin route exposure at the route tree and sidebar levels.
- Rechecked dependency audit state after the non-forced fix.

## Hardening Pass Verification

- `npm run lint` passed.
- `npm run test` passed:
  - API: 8 files, 46 tests.
  - Web: 3 files, 4 tests.
- `npm run build` passed and emitted split route chunks.
- `npm run smoke:browser` passed against `http://localhost:5173/` and `http://localhost:4000/health` with `/usr/bin/google-chrome-stable`.
- Final `npm audit --audit-level=high` still reports the documented Fastify/find-my-way, Vite/esbuild, and React Router advisories; no additional non-forced fixes were available.

## Verification Snapshot

- `npm run lint` passed.
- `npm run build` passed.
- `npm run test:api` passed: 8 files, 46 tests.
- `npm audit fix` applied the safe available fix, then remaining advisories were left for a dedicated major-upgrade pass.
