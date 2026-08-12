# Deployment Verification

## What Was Verified

- `apps/api` builds independently through `npm run build:api`.
- `apps/web` builds independently through `npm run build:web`.
- The web build embeds `VITE_API_URL` at build time. This was verified by building with `VITE_API_URL=http://localhost:4100` and inspecting the generated production JS. The final full build used the default local value, `http://localhost:4000`.
- The web production artifact emitted lazy-loaded chunks:
  - 67 JS assets.
  - 22 page/layout chunks.
  - Separate `MembersPage-*` and `PaymentsPage-*` chunks.
- Built web artifact served through Vite preview on `http://localhost:4173`.
- Direct navigation/refresh of `/dashboard/members` returned `200 text/html`.
- A generated lazy route chunk returned `200 text/javascript`.
- Real headless Chrome smoke passed against the built web preview and API health endpoint.
- API `start:prod` executed `prisma migrate deploy` before server startup.
- Docker Compose configuration renders successfully when `VITE_API_URL` is supplied, and the web image build now requires that value.

## What Changed

- Added API `start:prod` script: runs `prisma migrate deploy` then starts `dist/server.js`.
- Added root `start:api:prod` and `prisma:deploy`/`db:deploy` scripts.
- Updated API Docker command to use `npm run start:prod --workspace @gym/api`.
- Updated the web Docker build to require an explicit `VITE_API_URL` build argument instead of defaulting to localhost.
- Updated Docker Compose to fail fast when `VITE_API_URL` is missing for the web image build.
- Extended `scripts/browser-smoke.mjs` to check:
  - `/`
  - `/plans`
  - direct nested route `/dashboard/members`
  - optional generated JS/CSS assets when `SMOKE_DIST_DIR` is provided.
- Removed hardcoded owner credential fallback from `scripts/live-smoke.ts`.
- Updated README production deployment instructions.

## Production Deployment Requirements

- Backend environment:
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `REDIS_URL`
  - `JWT_ACCESS_SECRET` with at least 32 characters
  - `CORS_ORIGIN` set to the deployed frontend origin or comma-separated allowlist
  - `COOKIE_SECURE=true` behind HTTPS
- Frontend build environment:
  - `VITE_API_URL` set to the deployed API origin before `npm run build:web`.
- Database:
  - Run `prisma migrate deploy` against a database with Prisma migration history.
  - Existing non-empty databases must be baselined before production deploy.
- Static hosting:
  - Serve `apps/web/dist`.
  - Route unknown paths to `index.html`.
  - Serve `/assets/*` as static files.
- Docker Compose:
  - Set `VITE_API_URL` before building the web service image.

## Could Not Be Verified Here

- Docker image build/deploy could not be verified because the environment denied Docker daemon access: `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`.
- Full API production startup could not be completed against the configured database because `prisma migrate deploy` correctly failed with `P3005`: the database schema is non-empty and not baselined in Prisma migration history.

## Remaining Security And Dependency Risks

- `fastify@4.29.1` and `find-my-way@8.2.2` still have audit advisories. npm reports the fix path as Fastify 5, which is a breaking framework upgrade. Recommended path: dedicated Fastify 5 migration branch, update Fastify plugins for compatibility, then run full API regression tests and live smoke.
- app build `vite@5.4.21` depends on an esbuild line flagged by audit. npm reports the fix as a Vite major upgrade. Recommended path: dedicated Vite upgrade branch, confirm plugin compatibility, rebuild and run browser smoke against generated assets.
- `react-router-dom@6.30.4` still reports React Router advisories. npm did not resolve this with non-forced fixes. Recommended path: migrate to a fixed React Router line, preferably React Router 7, and retest auth redirects, role guards, nested dashboard routes, and direct refresh.

## Exact Verification Commands Used

```sh
VITE_API_URL=http://localhost:4000 docker compose config
VITE_API_URL=http://localhost:4000 docker compose build
VITE_API_URL=http://localhost:4100 npm run build:web
npm run build:api
NODE_ENV=production API_PORT=4100 CORS_ORIGIN=http://localhost:4173 npm run start:prod --workspace @gym/api
npm run preview --workspace @gym/web -- --host 0.0.0.0 --port 4173
SMOKE_WEB_URL=http://localhost:4173/ SMOKE_API_URL=http://localhost:4000 SMOKE_DIST_DIR=apps/web/dist npm run smoke:browser
curl -sS -o /tmp/gym-root.html -w '%{http_code} %{content_type}\n' http://localhost:4173/dashboard/members
curl -sS -o /tmp/gym-chunk.js -w '%{http_code} %{content_type}\n' http://localhost:4173/assets/MembersPage-ZTrxJ2k0.js
npm run lint
npm run test
npm run build
npm audit --audit-level=high
rg "ChangeMe|OWNER_PASSWORD \?\?|console\.log|debugger|VITE_API_URL=http://localhost|COOKIE_SECURE=false|CORS_ORIGIN=\*|JWT_ACCESS_SECRET=.*[A-Za-z0-9]{32,}" apps packages scripts README.md docs docker-compose.yml .env.example -n -g '!dist'
```
