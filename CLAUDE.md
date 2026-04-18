# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TutNet is a full-stack tutoring marketplace connecting students with home tutors in West Hyderabad. Monorepo with separate `client/` (React) and `server/` (Express/MongoDB) apps.

## Commands

### Client (`cd client`)
- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test:e2e` — Playwright e2e tests
- `npm run test:visual` — Visual regression snapshots

### Server (`cd server`)
- `npm run dev` — Nodemon watch mode (port 5001)
- `npm run start` — Production server
- `npm run seed` — Populate test data
- `npm run reset-db` — Clear database
- `npm run create-admin` — Create admin user
- `npm run test` — Run tests

## Architecture

### Tech Stack
- **Frontend**: React 18, Vite, React Router 6, Zustand, Tailwind CSS, Radix UI, Axios
- **Backend**: Express 4, MongoDB (Mongoose 8, Atlas-hosted), JWT auth, Passport Google OAuth
- **Payments**: Razorpay integration
- **Background jobs**: node-cron (trial expiry every 10min, session reminders every 30min)

### Two Layout Systems
- **AppLayout** (`client/src/layouts/AppLayout.jsx`): Public pages (landing, find tutors, login, etc.) with `variant="public"` navbar — no user-specific UI (no profile, no notifications). Logged-in users visiting `/` are redirected to their dashboard.
- **DashboardLayout** (`client/src/layouts/DashboardLayout.jsx`): Protected pages with `variant="app"` navbar — shows profile dropdown, notifications, dashboard link. Dashboard pages render their own `Sidebar` component internally.

### Authentication Flow
1. Local: email/password → JWT stored in localStorage
2. Google OAuth: `/api/auth/google` → Passport → one-time code → client exchanges at `/oauth-success` → JWT
3. Axios interceptor (`client/src/utils/api.js`) injects Bearer token on every request, handles 401 redirects
4. Server `protect` middleware verifies JWT, attaches user to `req.user`
5. `ProtectedRoute` component gates dashboard routes by role (student/tutor/admin)

### State Management
Zustand stores in `client/src/stores/`:
- `authStore` — user state, login/logout/register, token expiry check
- `notificationStore` — in-app notifications
- `toastStore` — toast messages
- `authModalStore` — global sign-in modal (triggered by protected actions on public pages like favoriting a tutor)

Legacy React Context wrappers exist in `client/src/context/` — some components use `useAuth()` from context, others use `useAuthStore()` from Zustand directly. Both reference the same underlying state.

### Unified Booking Model
Single `Booking` schema handles all booking types via `bookingCategory` enum: `trial`, `session`, `permanent`, `dedicated`. Status flow: `pending` → `approved`/`rejected` → `completed`/`cancelled`. Category-specific routes (`/api/trial-bookings`, `/api/session-bookings`, etc.) delegate to unified controller logic.

### API Structure
Server routes mount at `/api/`:
- `/auth` — register, login, OAuth, profile, password reset
- `/tutors` — search, profiles, availability
- `/trial-bookings`, `/session-bookings`, `/permanent-bookings`, `/dedicated-bookings` — booking endpoints
- `/bookings` — legacy unified endpoint
- `/admin` — tutor approval, analytics
- `/reviews`, `/favorites`, `/attendance`, `/notifications`, `/messages`, `/payments` + others

### Key Patterns
- Tutor cards on public pages use `authModalStore.openLogin()` to prompt sign-in for protected actions (favorite, book, trial) — no redirect, modal overlay
- Dashboard pages are tab-based: URL param `?tab=sessions` controls active view, `Sidebar` drives tab changes
- Trial bookings auto-expire after 48h via cron job
- Attendance marking has a 12-hour window rule
- CORS allows localhost:5173 and `*.vercel.app` domains

### Environment Variables
- **Client** `.env`: `VITE_API_URL` (default `http://localhost:5001/api`)
- **Server** `.env`: `PORT`, `MONGODB_URI`, `JWT_SECRET`, `ADMIN_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Razorpay keys

## Development Guidelines (from .cursor/rules)
- Validate/sanitize inputs on server; return consistent error shapes with correct HTTP status
- Check permissions on every sensitive action; refresh user state after profile updates
- Use loading states for async actions; show success/error toasts; disable submit buttons while saving
- Use transactions for multi-document write consistency
