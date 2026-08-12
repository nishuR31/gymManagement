# ValorFitness Gym Management

Single-tenant gym management system for one gym. The repository is a monorepo with independently runnable frontend and backend applications plus a shared TypeScript contract package.

## Structure

- `apps/api` - Fastify API, Prisma/PostgreSQL persistence, Redis-backed aggregate caches, JWT auth, RBAC, background jobs.
- `apps/web` - React/Vite frontend, React Router, Redux Toolkit auth state, Tailwind UI, Axios API client.
- `packages/shared` - DTOs, enums, and shared API-facing TypeScript types.
- `docs` - phase notes and architecture audit material.
- `docker-compose.yml` - local/production-style composition for API, web, Postgres, and Redis.

The frontend and backend are built, started, tested, and configured independently. Backend secrets must stay in `apps/api/.env`; the frontend only receives public `VITE_*` variables.

## Environment

Copy examples before running locally:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

For Docker Compose, copy the root example:

```sh
cp .env.example .env
```

Important variables:

- API: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`, `COOKIE_SECURE`.
- Web: `VITE_API_URL`.
- Compose: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `API_PORT`, `WEB_PORT`, `VITE_API_URL`.

`CORS_ORIGIN` accepts a single URL or a comma-separated allowlist.

## Development

Install dependencies:

```sh
npm install
```

Generate Prisma client and sync/seed local DB:

```sh
npm run db
```

Run apps separately:

```sh
npm run dev:api
npm run dev:web
```

Or run both from the root:

```sh
npm run dev
```

## Production Commands

Build each application independently:

```sh
npm run build:api
VITE_API_URL=https://api.example.com npm run build:web
```

Start the compiled API and apply existing Prisma migrations:

```sh
npm run start:api:prod
```

Serve `apps/web/dist` with any static host that supports SPA fallback to `index.html`. The included nginx Docker image already does this.

## Verification

```sh
npm run lint
npm run test
npm run build
npm run smoke:browser
```

Useful targeted scripts:

```sh
npm run lint:api
npm run lint:web
npm run test:api
npm run test:web
npm run build:api
npm run build:web
```

`smoke:browser` expects the API and web app to already be running. Override targets with `SMOKE_API_URL`, `SMOKE_WEB_URL`, or `CHROME_BIN`.

## Docker

```sh
VITE_API_URL=http://localhost:4000 npm run docker:up
npm run docker:logs
npm run docker:down
```

The web image requires `VITE_API_URL` as a build argument because Vite embeds public env values at build time. Set it to the browser-reachable API origin before building the image; the build intentionally fails instead of silently baking localhost into a production bundle. The nginx container serves the SPA with history fallback, so refreshing dashboard routes works.

For an existing non-empty production database, baseline Prisma migrations before using `migrate deploy`; otherwise Prisma correctly fails with `P3005`.

## Auth And Roles

Backend authorization is authoritative. Frontend route guards mirror the intended UX:

- `MEMBER`: member dashboard, profile, member payments, member membership, member orders, product shelf.
- `STAFF` and above: operational admin surfaces.
- `ADMIN`, `GYM_OWNER`, `SUPER_ADMIN`: admin-only analytics/management surfaces such as inquiries and payment analytics.

Refresh tokens rotate; reuse of a rotated token revokes the session lineage.
