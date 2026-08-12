# Frontend

React + Vite + TypeScript + Tailwind CSS frontend for Fundsroom CRM.

Quick start (developer):

1. Copy `.env.example` to `.env` and set `VITE_API_URL` to the backend's URL (defaults to `http://localhost:4000` for local dev).
2. Install dependencies: `npm install`.
3. Run dev server: `npm run dev` (defaults to `http://localhost:5173`).

Make sure the backend is running too, with its `FRONTEND_URL` set to match this app's URL (see `backend/README.md`) -- otherwise the browser blocks requests as CORS violations.

## Structure

- `src/api/` -- one axios instance (`client.ts`, handles JWT attachment + 401 redirect) plus one file per backend module with its API calls
- `src/context/AuthContext.tsx` -- who's logged in, backed by localStorage so a refresh doesn't log you out
- `src/routes/ProtectedRoute.tsx` -- redirects to `/login` if not authenticated, or `/` if the role isn't allowed for that route
- `src/components/layout/` -- the sidebar + topbar shell every page renders inside
- `src/components/ui/` -- shared primitives (Button, Field, Card, Badge, loading/error/empty states)
- `src/pages/` -- one file/folder per page

## Design

A deliberate "editorial ledger" look instead of the generic blue-SaaS-dashboard default: a deep teal/forest primary with warm amber accents, a dark ink sidebar, Fraunces (serif) for headings/brand, Inter (sans) for UI text, and JetBrains Mono for numeric/tabular data (SKUs, prices, challan numbers, stock counts) so those columns read cleanly. Tokens live in `src/index.css` under `@theme` (Tailwind v4's CSS-first config).
