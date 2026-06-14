# Dvora HQ — Agent Instructions: Development & Code Quality Guidelines

This document outlines key technical decisions, architecture patterns, code quality constraints, and workflows established through the project's development. Any agent working on this repository must strictly adhere to these rules.

---

## 1. Language Constraints

- **User Communication**: The agent MUST always communicate and respond to the USER in **Russian**.
- **Codebase & Documentation**: All files in the repository—including source code, variable/function names, inline comments, JSDoc strings, logs, and markdown files—must be written **STRICTLY in English**. Do not mix languages inside the codebase.

---

## 2. Validation Pipeline & Code Quality

Before completing any task, compiling, or verifying success:

1. **Prettier formatting**: Run `npm run format` (root) to maintain a unified code style across all files.
2. **Lint compliance**: Run `npm run lint:all` (root) to check both backend and frontend. Fix all errors; do not suppress them.
3. **Build compliance**: Run `npm run build --prefix frontend` to verify the React frontend compiles without errors.
4. **Strict Lint & Compiler Compliance**: Do NOT suppress lint errors using `// eslint-disable`, `// @ts-ignore`, `// @ts-nocheck`, or excessive `any` casting. Solve the root cause.
   - **ESLint rule `react-hooks/set-state-in-effect`**: Never call `setState()` synchronously inside a `useEffect` body. Defer it with `Promise.resolve().then(() => setState(...))`, or restructure the effect.
5. **Conventional Commits**: Every commit message must start with a lowercase Conventional Commits prefix matching the change type (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

---

## 3. Project Architecture

### 3.1 Directory Structure

```
dvora-hq/
├── frontend/src/
│   ├── components/
│   │   ├── ui/               # Reusable presentational UI primitives
│   │   ├── FighterDashboard.jsx
│   │   ├── CommanderDashboard.jsx
│   │   ├── Onboarding.jsx
│   │   └── LockScreen.jsx
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Pure helper functions
│   └── App.jsx               # Root state owner
├── src/                      # Node.js backend (Express)
│   ├── routes/               # Route handlers: auth.js, user.js, squad.js
│   ├── services/             # Isolated business logic (e.g., avatar.js)
│   ├── middleware/           # Express middleware (e.g., authenticateToken)
│   ├── bot.js                # Telegram bot
│   ├── config.js
│   ├── db.js
│   └── index.js              # Express app entry point (registers routes only)
└── shared/                   # Isomorphic modules shared between frontend & backend
    ├── loadout-data.js       # Single source of truth for all gear/weapon/spec lists
    └── loadout-utils.js      # Shared parsing/formatting utilities
```

### 3.2 Backend: Separation of Concerns

The backend follows a strict **routes → services** pattern:

- **`src/index.js`** — thin entry point: registers Express middleware, mounts route modules (`/api/auth`, `/api/user`, `/api/squad`), starts the server. Contains NO business logic or inline route handlers.
- **`src/routes/`** — route files (`auth.js`, `user.js`, `squad.js`). Import from `services/` and `middleware/`. Each route file handles one resource.
- **`src/services/`** — isolated business logic (e.g., `avatar.js` for AI avatar generation). Keeps route handlers thin and testable.
- **`src/middleware/`** — Express middleware (e.g., `authenticateToken`).
- **`src/bot.js`** — Telegram bot logic. Repeated code is extracted into reusable helper functions (e.g., `hashPin()`). Remove inline `argon2.hash` calls; use the shared helper.

### 3.3 Shared Loadout Data

All gear, weapon, specialization, optics, accessories, and meds lists live in **`/shared/loadout-data.js`** and are imported wherever needed:

```js
import { specializationsList, gearsList, medsList } from '@shared/loadout-data.js';
```

- **Do NOT re-define these lists inline** in components, routes, or bot.js.
- The `@shared` alias is configured in Vite and must be respected.

### 3.4 Frontend: State & Component Architecture

#### State ownership
- **`App.jsx`** owns all global state: `user`, `role`, `checklist`, `weaponStatus`, `medicalStatus`, `gearStatus`, `alarmActive`, `isLocked`, `squadMembers`, `loadingMembers`.
- **`applyUserData(profile)`** — a `useCallback` helper in `App.jsx` that applies a full user/profile API response to all relevant state slices. Always use it instead of calling `setUser` + `setChecklist` etc. individually.
- Both `FighterDashboard` and `CommanderDashboard` receive status states (`weaponStatus`, `medicalStatus`, `gearStatus`) as **props** from `App.jsx`.

#### Reusable UI components (`frontend/src/components/ui/`)
- **`OperatorCard.jsx`** — displays operator avatar, username, squad, and specialization label (with marquee for long text). Used in both Fighter and Commander dashboards. Do not duplicate this markup.
- **`ChecklistToggleGrid.jsx`** — renders the 2×2 grid of checklist toggle buttons (wpn/med/gear/trsp) with status coloring. Accepts `checklist`, `onToggle`, `items`, `labels`.
- **`ChecklistPanel.jsx`** — collapsible detail panel for a checklist category. Accepts `title`, `lang`, `items`, `statusMap`, `onToggleItem`.

#### Custom hooks (`frontend/src/hooks/`)
- **`useChecklistPanel()`** — manages `activePanel` state (which of wpn/med/gear is open). Returns `{ activePanel, openPanel, closePanel }`. Only one panel is open at a time; panels are mutually exclusive.
- **`useLoadoutItems(user, lang, statusMaps, onToggleChecklist)`** — derives `weaponItems`, `medItems`, `gearItems` from the user object and provides `handleToggleItem(category, itemId)`. Used in both dashboards to avoid logic duplication.

#### Loadout utilities (`frontend/src/utils/loadout.js`)
- **`resolveLabel(id, list, lang)`** — resolves a loadout item ID to its display label.
- **`parseCommaList(str, list, prefix, type, lang)`** — parses a comma-separated loadout string into item objects `{ id, label, type }`.
- **`parseWeaponry(user, lang)`** — parses the full weaponry string (primary; secondary) plus optics and accessories into a flat item array.
- **`formatCommaLabel(str, list, lang)`** — formats a comma-separated ID string as a human-readable label (e.g., for specialization display).
- **`formatWeaponryLabel(wpnStr, lang)`** — formats the weaponry field as a concise display label.
- **`computeChecklistStatus(items, statusMap)`** — returns `true` if any item has a `false` status (i.e., issue exists).

#### Onboarding (`Onboarding.jsx`)
- Uses the reusable `SelectionSection` internal component for every selection group (specs, weapons, optics, etc.).
- Expand/collapse state is managed via a single `expandedSections` object + `toggleExpand(section)` helper — not individual `useState` booleans per section.
- Multi-select toggling via `toggleMultiSelect(setter, id)` — not per-category toggle functions.

---

## 4. Security Patterns

- **CORS**: `src/index.js` restricts allowed origins to `ALLOWED_ORIGINS` env variable (comma-separated). Falls back to `http://localhost:5173` for local dev. Never use `Access-Control-Allow-Origin: *` in production.
- **PIN hashing**: Always use `argon2.hash(pin, { memoryCost: 65536, timeCost: 3, parallelism: 1 })` via the shared `hashPin()` helper in `bot.js`.
- **Known security debt**: Firestore document IDs currently equal the PIN value. This is tracked with a `TODO: [Security]` comment. Do NOT remove this comment; a migration to UUID-based IDs is pending.
- **JWT**: Tokens are short-lived (2h). Revocation is handled via the `revoked_tokens` Firestore collection checked inside `authenticateToken` middleware.

---

## 5. CORS & Environment Configuration

- Backend port: `8080` (from `config.js`).
- Frontend dev server: Vite at port `5173`, proxying `/api` to `localhost:8080`.
- All secrets live in `.env` (never committed). See `.env.example` for required keys.

---

## 6. Collaborative Testing & Interactive Verification

Once development phases are completed:

- Provide interactive verification scripts or testing steps that the developer can easily execute.
- Print clear, formatted diagnostic logs or summaries during tests so the developer can visually confirm that the database, API, and UI state layers function correctly.
- Walk through verification results step-by-step with the developer, explaining exactly how to run, observe, and validate.
