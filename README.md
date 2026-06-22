# DVORA HQ — Tactical Command & Readiness Network

[![VibeTalent Badge](https://www.vibetalent.work/api/badge/dimaminka)](https://www.vibetalent.work/profile/dimaminka)

> **Ultra-secure, invite-only tactical synchronization platform** integrated natively into the Telegram Mini App ecosystem.  
> Built for field operations — real-time readiness tracking, squad rotation scheduling, and decentralized command visibility.

---

## Overview

Dvora HQ is a full-stack web application consisting of:

- **Telegram Bot** — admin CLI for fighter management, rotation scheduling, and mission time configuration
- **REST API** — Express.js backend on Google Cloud Run with Firestore persistence
- **Mini App** — React frontend served inside Telegram as a Mini App, hosted via Firebase Hosting
- **Landing Page** — `index.html` in the root — an interactive landing page with a live working simulator of the Mini App

The system is designed around three user roles:

| Role                   | Access                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| **Fighter / Operator** | PIN-secured app, readiness checklist, rotation timeline             |
| **Commander**          | Full squad status matrix, alarm control, rotation view              |
| **Admin**              | Telegram Bot only — manages users, squads, rotations, mission times |

---

## Tech Stack

| Layer                | Technology                                                  |
| -------------------- | ----------------------------------------------------------- |
| **Frontend**         | React 18 + Vite, Tailwind CSS                               |
| **Backend**          | Node.js 20 (ESM), Express.js                                |
| **Database**         | Google Cloud Firestore (NoSQL)                              |
| **Auth**             | Telegram `initData` validation + Argon2id PIN hashing + JWT |
| **Bot**              | Grammy (Telegram Bot framework)                             |
| **AI**               | Google Gen AI (`@google/genai`) — avatar generation queue   |
| **Infrastructure**   | Google Cloud Run, Firebase Hosting, Cloud Tasks             |
| **Containerization** | Docker (multi-stage build)                                  |

---

## Project Structure

```
dvora-hq/
├── src/                        # Backend (Node.js)
│   ├── index.js                # Express server entry point
│   ├── bot.js                  # Telegram Bot (Grammy) — all admin commands
│   ├── config.js               # Environment config
│   ├── db.js                   # Firestore connection
│   ├── version.js              # Version string (injected at deploy)
│   ├── middleware/             # Auth middleware (JWT verification)
│   ├── routes/
│   │   ├── auth.js             # POST /api/auth — PIN auth + JWT issuance
│   │   ├── user.js             # GET/POST /api/user — profile & onboarding
│   │   ├── squad.js            # GET /api/squad/:id/members
│   │   └── rotations.js        # GET /api/rotations — current week rotations
│   └── services/
│       └── avatar.js           # AI avatar generation via Cloud Tasks queue
│
├── frontend/                   # React Mini App (Vite)
│   └── src/
│       ├── App.jsx             # Root component — routing, auth state, lang
│       ├── components/
│       │   ├── LockScreen.jsx          # PIN entry screen (5 digits + 1 letter)
│       │   ├── Onboarding.jsx          # First-run loadout & specialization setup
│       │   ├── FighterDashboard.jsx    # Operator view: readiness + rotations tabs
│       │   ├── CommanderDashboard.jsx  # Commander view: squad matrix + rotations
│       │   ├── RotationSchedule.jsx    # Timeline & calendar rotation viewer
│       │   └── ui/
│       │       ├── OperatorCard.jsx        # Single fighter status card
│       │       ├── ChecklistPanel.jsx      # Loadout sub-item checklist
│       │       └── ChecklistToggleGrid.jsx # 2×2 readiness buttons grid
│       ├── hooks/
│       │   ├── useRotations.js         # Fetches and caches rotation data
│       │   ├── useLoadoutItems.js      # Manages readiness state & sub-items
│       │   └── useChecklistPanel.js    # Controls open/close of checklist panel
│       └── constants/
│           └── squadColors.js          # Squad name → HEX color mapping
│
├── shared/                     # Shared utilities (backend + frontend)
├── index.html                  # Landing page with interactive Mini App simulator
├── Dockerfile                  # Multi-stage Docker build for Cloud Run
├── firebase.json               # Firebase Hosting + Cloud Run routing config
├── package.json                # Backend dependencies & scripts
└── .env.example                # Environment variable reference
```

---

## Features

### Telegram Bot Commands

| Command                    | Role  | Description                                                      |
| -------------------------- | ----- | ---------------------------------------------------------------- |
| `/start`                   | Admin | Welcome message and command reference                            |
| `/add_fighter`             | Admin | Register a new fighter (whitelist by username)                   |
| `/list_fighters`           | Admin | List all registered fighters with PIN status                     |
| `/gen_pin`                 | Admin | Generate unique 5-digit+1-letter encrypted PIN for a fighter     |
| `/delete_fighter`          | Admin | Remove a fighter from the system                                 |
| `/create_squad`            | Admin | Create a new squad                                               |
| `/list_squads`             | Admin | List all squads                                                  |
| `/add_to_squad`            | Admin | Assign a fighter to a squad                                      |
| `/add_rotation`            | Admin | Schedule a weekly rotation (Sunday–Saturday cycle)               |
| `/list_rotations`          | Admin | View all scheduled rotations                                     |
| `/remove_rotation`         | Admin | Remove a rotation                                                |
| `/set_mission`             | Admin | Set a mission time (HH:MM) for a specific date within a rotation |
| `/alarm_on` / `/alarm_off` | Admin | Toggle global combat alert state for a squad                     |

### Fighter Mini App

- **PIN Lock Screen** — Unique 5-digit + 1-letter encrypted PIN per fighter. Hard token wipe at T‑120 min before mission.
- **Onboarding** — First-run loadout configuration and tactical specialization input (processed via AI avatar generation queue).
- **Readiness Dashboard (2 tabs)**:
  - **Rotations** — Weekly timeline (Sunday→Saturday) with dimmed past days, today highlighted, and mission time indicators
  - **Readiness** — 4-axis status buttons: `Weapons`, `Transport`, `Comms`, `Medkit`. Each cycles `Pending → Issue (opens sub-checklist) → Ready`. Auto-collapses when all sub-items resolved.
- **Alert Mode** — When alarm is active, app automatically switches to the Readiness tab.

### Commander Dashboard

- Full squad readiness matrix (WPN / MED / GEAR / TRANSPORT) per fighter
- Drill-down on any cell to see which sub-items are faulty
- Force alarm state (globally activates alert for the squad)
- **Rotations tab** — same timeline/calendar view shared with fighters
- **Squad Status tab** — auto-activated during active alerts

### Rotation Scheduler

- Weekly rotations keyed by **Sunday** start date (`YYYY-MM-DD`)
- Three squad slots per rotation: `alert` (on duty), `standby`, and optional `rest`
- **Timeline view** — 7-day list with past days dimmed, today highlighted, squad colors, and mission time display
- **Calendar view** — monthly grid with clickable days showing squad overlay + member list
- Mission times set per-date via `/set_mission` bot command, stored in `meeting_times` field on the rotation document

---

## Authentication Flow

```
Telegram Mini App
      │
      │  Telegram.WebApp.initData
      ▼
POST /api/auth/telegram-login
      │
      │  Validate HMAC signature
      │  Lookup fighter by tg_id
      ▼
      │  If onboarded → issue JWT
      │  If new → trigger onboarding
      ▼
Frontend stores JWT in localStorage
      │
      │  Authorization: Bearer <token>
      ▼
All protected /api/* endpoints
```

PIN authentication is separate — used as a secondary access gate within the Mini App UI itself. PINs are hashed with **Argon2id** and validated client-side via the `/api/auth/verify-pin` endpoint.

---

## Local Development

### Prerequisites

- Node.js 20+
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- A Google Cloud project with Firestore enabled
- Firebase CLI (`npx firebase-tools`)

### Setup

```bash
# 1. Clone and install backend dependencies
git clone https://github.com/DimaMinka/dvora-hq
cd dvora-hq
npm install

# 2. Install frontend dependencies
npm install --prefix frontend

# 3. Configure environment
cp .env.example .env
# Edit .env with your Telegram token, JWT secret, GCP project ID, etc.

# 4. Start backend (with hot reload)
npm run dev

# 5. Start frontend dev server (in a separate terminal)
npm run dev --prefix frontend
```

Backend runs on `http://localhost:8080`  
Frontend runs on `http://localhost:5173`

### Testing the Mini App Locally via Telegram

The Telegram bot always opens the URL configured in @BotFather (production URL). To test local frontend inside Telegram:

1. Run a tunnel: `ngrok http 5173`
2. Update the Web App URL in @BotFather → your bot → Bot Settings → Menu Button
3. Open the bot and launch the Mini App — it will load your local frontend

---

## Environment Variables

| Variable                   | Required | Description                                      |
| -------------------------- | -------- | ------------------------------------------------ |
| `TELEGRAM_BOT_TOKEN`       | ✅       | Bot token from @BotFather                        |
| `JWT_SECRET`               | ✅       | Secret for signing JWT tokens                    |
| `AI_API_KEY`               | ✅       | Google AI API key for avatar generation          |
| `TELEGRAM_ADMIN_USERNAMES` | ✅       | Comma-separated list of admin Telegram usernames |
| `GCP_PROJECT_ID`           | ✅       | Google Cloud project ID                          |
| `GCS_AVATAR_BUCKET`        | ✅       | GCS bucket name for avatar storage               |
| `CLOUDTASKS_QUEUE_NAME`    | ✅       | Cloud Tasks queue for avatar generation jobs     |
| `ALLOWED_ORIGINS`          | ✅       | Comma-separated CORS allowlist                   |
| `PORT`                     | —        | Server port (default: `8080`)                    |
| `NODE_ENV`                 | —        | `development` or `production`                    |
| `GCP_REGION`               | —        | GCP region (default: `europe-west1`)             |

---

## Deployment

The app is deployed on **Google Cloud Run** behind **Firebase Hosting**:

```
Firebase Hosting (dvora-hq.web.app)
      │
      ├── /api/**  → Cloud Run (dvora-backend) [europe-west1]
      ├── /health  → Cloud Run (dvora-backend)
      └── /**      → frontend/dist/index.html (SPA)
```

### Build & Deploy

```bash
# Build frontend
npm run build:frontend

# Deploy to Firebase Hosting (static assets)
npx firebase-tools deploy --only hosting

# Build and push Docker image to Cloud Run
# (typically done via CI/CD pipeline or gcloud CLI)
gcloud run deploy dvora-backend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated
```

### Docker

```bash
# Build
docker build -t dvora-hq .

# Run locally
docker run -p 8080:8080 --env-file .env dvora-hq
```

---

## Squad Color System

Each squad is assigned a persistent color used across the timeline, calendar, and status cards:

| Squad | Color           | Hex       |
| ----- | --------------- | --------- |
| MINKA | Electric Indigo | `#6366f1` |
| ALPHA | Tactical Cyan   | `#00f0ff` |
| BETA  | Amber           | `#f59e0b` |
| GAMMA | Emerald         | `#10b981` |
| DELTA | Rose            | `#f43f5e` |

Colors are defined in [`frontend/src/constants/squadColors.js`](frontend/src/constants/squadColors.js) and adapt automatically for light/dark mode.

---

## Scripts

```bash
# Backend
npm run dev          # Start backend with --watch (hot reload)
npm run start        # Start backend (production)
npm run lint         # ESLint backend
npm run format       # Prettier format entire project

# Frontend (via --prefix frontend)
npm run dev          # Vite dev server
npm run build        # Production build → frontend/dist/
npm run lint         # ESLint frontend

# Combined
npm run lint:all     # Lint backend + frontend
npm run build:frontend  # Production build frontend
```

---

## GCP Infrastructure Scripts

Two shell scripts in [`scripts/`](scripts/) manage the full GCP infrastructure lifecycle.

### `scripts/gcp-up.sh` — Provision Infrastructure

Reads config from `.env` and provisions all required GCP resources in one command:

```bash
bash scripts/gcp-up.sh
```

**What it does (4 steps):**

| Step | Action                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Enables required GCP APIs: Cloud Run, Cloud Tasks, Secret Manager, Cloud Storage, IAM, Firestore |
| 2    | Creates the **GCS bucket** for AI-generated avatar storage (`$GCS_AVATAR_BUCKET`)                |
| 3    | Creates the **Cloud Tasks queue** for async avatar generation (`$CLOUDTASKS_QUEUE_NAME`)         |
| 4    | Creates the **Firestore database** (default, native mode) in `$GCP_REGION`                       |

All steps are idempotent — safe to re-run if resources already exist. Output is logged to `gcp-infra.log`.

---

### `scripts/gcp-down.sh` — Tear Down Infrastructure

Destroys provisioned GCP resources. Requires interactive confirmation before proceeding.

```bash
bash scripts/gcp-down.sh
```

> [!CAUTION]
> This operation is **irreversible**. It will permanently delete the GCS avatar bucket (including all stored avatars) and the Cloud Tasks queue. Firestore data is **not** deleted by this script.

**What it deletes:**

| Step | Action                                                             |
| ---- | ------------------------------------------------------------------ |
| 1    | Empties and deletes the **GCS bucket** (`gs://$GCS_AVATAR_BUCKET`) |
| 2    | Deletes the **Cloud Tasks queue** (`$CLOUDTASKS_QUEUE_NAME`)       |

> [!NOTE]
> GCP enforces a cooldown period before a deleted queue name can be reused. If you re-run `gcp-up.sh` shortly after `gcp-down.sh`, the queue creation may warn about this — the script handles it gracefully and continues.

---

### `scripts/setup-wif-secrets.sh` — Workload Identity Federation

Sets up Workload Identity Federation (WIF) for GitHub Actions CI/CD. Run once when configuring the deployment pipeline.

```bash
bash scripts/setup-wif-secrets.sh
```

---

## Security

- **Telegram initData HMAC** validation on every login request
- **Argon2id** PIN hashing (OWASP-compliant, offline-safe)
- **JWT** tokens with short expiry for session management
- **CORS allowlist** enforced at the Express middleware level
- **Admin-only** bot commands enforced via `TELEGRAM_ADMIN_USERNAMES` env check
- **Firestore security rules** restrict document access by authenticated user ID
- All secrets managed via **GCP Secret Manager** in production

---

## Version

Current version: `v2.1`  
Developer: **Dima Minka**

---

_DVORA HQ — Built for real operations._
