# Akciski Plan Web App

Multi-user Next.js application for school action plans and student progress records.

## What is included

- Next.js App Router + TypeScript
- Prisma + PostgreSQL
- Auth.js credentials login
- Roles: `admin`, `editor`, `viewer`
- Student CRUD
- Action plan CRUD with version history and optimistic locking
- JSON import/export
- Printable HTML/PDF route
- Docker setup for local or school-hosted deployment

## Local setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:push` or `npm run db:migrate`.
5. Run `npm run bootstrap:admin`.
6. Start the app with `npm run dev`.

## Docker

Use `docker compose up --build` after creating `.env`.

## Verification

The project currently verifies with:

- `npm run db:generate`
- `npx tsc --noEmit`
- `npm test`

On this Windows workspace, `next build` hit a host-specific App Router route scanning issue. For real deployment and CI, Linux is recommended.

## Default bootstrap

The bootstrap script reads:

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_NAME`

If the user already exists, the script keeps it and exits successfully.

## GitHub upload

1. Create a new empty GitHub repository.
2. Initialize git locally if needed:

```powershell
git init
git branch -M main
```

3. Add and commit:

```powershell
git add .
git commit -m "Initial akciski plan app"
```

4. Connect the remote and push:

```powershell
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

## GitHub CI

A GitHub Actions workflow is included at `.github/workflows/ci.yml`.

It runs:

- `npm ci`
- `npm run db:generate`
- `npx tsc --noEmit`
- `npm test`

## Do not commit

- `.env`
- real student data
- database dumps
- local backups
