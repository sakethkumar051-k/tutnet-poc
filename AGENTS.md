# AGENTS.md

## Cursor Cloud specific instructions

### Overview

TutNet (Tutor Connect) is a two-package Node.js monorepo (`client/` and `server/`) for a tutoring marketplace platform. No workspace manager (Lerna/Turborepo) is used — each package has its own `package.json` and runs independently.

### Services

| Service | Directory | Port | Command |
|---------|-----------|------|---------|
| Backend API (Express.js) | `server/` | 5001 | `npm run dev` |
| Frontend (Vite + React) | `client/` | 5173 | `npm run dev` |
| MongoDB | system | 27017 | `mongod --dbpath /data/db --logpath /var/log/mongod.log --logappend &` |

### Running services

1. **MongoDB must be started first** — the server connects on startup. Start with:
   ```
   mongod --dbpath /data/db --logpath /var/log/mongod.log --logappend &
   ```
2. **Server** requires a `.env` file — copy from `server/.env.example`. Key vars: `MONGODB_URI`, `JWT_SECRET`, `PORT=5001`.
3. **Client** requires a `.env` file — copy from `client/.env.example`. Set `VITE_API_URL=http://localhost:5001/api`.
4. **Seed data**: Run `npm run seed` in `server/` to populate sample users (admin, students, tutors). Seeded credentials use password `password123`.

### Lint / Build / Test

- **Lint** (client only): `cd client && npm run lint` — ESLint is configured; the codebase has many pre-existing lint warnings/errors.
- **Build** (client only): `cd client && npm run build` — Vite production build.
- **Test**: No automated test suite exists (`server/package.json` test script is a placeholder).

### Gotchas

- The server starts even if MongoDB is unreachable (non-blocking connection), but all data-dependent routes will fail.
- Google OAuth keys are optional; email/password auth works without them. Use placeholder values in `.env`.
- MongoDB in this environment requires `--logappend` flag and the log file must be writable by the current user.
- The Vite dev server binds to all interfaces (`host: true` in `vite.config.js`).
