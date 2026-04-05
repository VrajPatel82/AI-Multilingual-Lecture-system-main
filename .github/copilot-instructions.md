# Copilot Instructions — AI-Based Multilingual Lecture System

## Architecture Overview

Monorepo with two independent packages sharing no code:

- **`backend/`** — Express.js REST API (CommonJS, `require`), MongoDB via Mongoose, optional Redis cache
- **`frontend/`** — React 18 SPA (ES modules, Vite), React Router v6, Tailwind CSS, Axios

The frontend proxies `/api` and `/uploads` to `localhost:5000` via Vite dev server config (`vite.config.js`). No shared types or generated client — the API contract is manually mirrored in `frontend/src/services/api.js`.

### Data hierarchy (multi-tenant)

`Institution → Department → Course → Lecture/Quiz/Assignment`

Users belong to an institution and optionally a department. The five roles form a strict hierarchy:
`super_admin > inst_admin > dept_admin > professor > student`

## Dev Workflow

```bash
# Backend (from backend/)
cp .env.example .env        # set MONGODB_URI, JWT_SECRET
npm install && npm run dev   # nodemon on :5000

# Frontend (from frontend/)
npm install && npm run dev   # Vite on :5173, proxies /api→:5000

# Seed demo data (clears all collections first!)
cd backend && npm run seed   # creates Demo University, departments, courses, users
# Seed credentials: admin@demo.com/admin123, professor@demo.com/prof123, student@demo.com/student123
```

Redis is **optional** — the app runs without it (`initRedis` fails gracefully). Only needed when testing caching via `services/cache.js`.

## Backend Conventions

### Route → Controller → Model pattern

Every feature follows: `routes/<feature>.js` → `controllers/<feature>Controller.js` → `models/<Model>.js`

- **Routes** define Express Router with `express-validator` inline validation, then call controller functions
- **Controllers** use `try/catch` → `next(error)` for error propagation to the central `middleware/errorHandler.js`
- **Auth**: `middleware/auth.js` extracts JWT from `Authorization: Bearer <token>`, attaches `req.user`
- **RBAC**: `middleware/roleCheck.js` is a factory — usage: `roleCheck('professor', 'dept_admin', 'inst_admin')` as route middleware

```js
// Pattern: routes/lectures.js
router.post('/', auth, roleCheck('professor', 'dept_admin'), upload.single('file'), createLecture);
```

### Key patterns

- **Pagination**: Use `utils/pagination.js` — `paginate(Model, filter, { page, limit, sort }, populateArray)` returns `{ data, pagination }` 
- **File uploads**: `middleware/upload.js` uses Multer with disk storage to `backend/uploads/`. Max 100MB. Static-served at `/uploads`
- **Validation errors**: Controllers check `validationResult(req)` first, return `{ message, errors }` on 400
- **Mongoose indexes**: Models define text indexes (`name: 'text'`) for search and compound indexes for query performance — check existing indexes before adding new ones

### Environment variables (backend/.env)

`PORT`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `FRONTEND_URL`, `REDIS_URL`

## Frontend Conventions

### Routing & layouts

`App.jsx` defines all routes. Each role has a dedicated layout component:

| Role | Layout | Route prefix | Nav config |
|------|--------|-------------|-----------|
| student | `StudentLayout` | `/student/*` | Hardcoded in component |
| professor | `ProfessorLayout` | `/professor/*` | Hardcoded in component |
| dept_admin, inst_admin, super_admin | `AdminLayout` | `/dept-admin/*`, `/inst-admin/*`, `/super-admin/*` | Passed as `navItems` prop from App.jsx |

`PrivateRoute` in App.jsx checks auth + role; redirects to role-specific default path via `getRoleDefaultPath()`.

### API layer (`services/api.js`)

All API calls go through a central Axios instance with:
- Request interceptor: attaches JWT from `localStorage.getItem('token')`
- Response interceptor: auto-redirects to `/signin` on 401

Named exports per domain: `authAPI`, `lecturesAPI`, `quizzesAPI`, `usersAPI`, `adminAPI`, `coursesAPI`, etc.

### State management

- **Auth**: `context/AuthContext.jsx` — `useAuth()` hook provides `user`, `login()`, `register()`, `logout()`, role-check helpers (`isAdmin()`, `isProfessor()`, `isStudent()`)
- **No global state library** — pages manage their own data via `useState`/`useEffect`
- Toast notifications via `react-hot-toast` (configured in `main.jsx`)

### Styling — Tailwind CSS

The project uses Tailwind CSS v3 (configured in `tailwind.config.js` with PostCSS). When writing components:

- Use **Tailwind utility classes directly in JSX** — no separate CSS files per component
- The color scheme: blue-600 primary (`#2563eb`), slate grays for text, green-500/amber-500 for status
- Fonts: Inter (primary), Arimo (secondary) configured in `tailwind.config.js`
- Custom animations available: `animate-fade-in`, `animate-slide-up`
- Use `@apply` in `index.css` `@layer components` only for highly-reused patterns (buttons, badges)
- Never use inline `style={{}}` except for truly dynamic values (e.g., progress bar widths)

### Component file structure

```
src/pages/<role>/<PageName>.jsx   — page components (one per route)
src/components/layouts/           — sidebar+header shells with <Outlet/>
src/components/shared/            — reusable components (Icons.jsx exports named icon components)
```

Pages are flat files — no sub-components. Keep page components self-contained.

## Important Gotchas

- **No test framework** is set up — no unit or integration tests exist
- **`styles.css` (6900+ lines)** is a legacy monolithic CSS file being replaced by Tailwind utilities — do NOT add new CSS classes to it
- The `seed.js` script **deletes all data** before seeding — never run in production
- `User.password` has `select: false` — must use `.select('+password')` when verifying credentials
- Frontend `VITE_API_BASE_URL` env var needs a `.env` file in `frontend/` (or relies on Vite proxy in dev)
- Admin routes apply `auth` + `roleCheck` at router level (`router.use()`), not per-route
