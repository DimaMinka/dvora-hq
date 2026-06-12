# Dvora HQ Architecture Mindmap

Here is the structured mindmap of the Dvora HQ tactical system architecture. It shows how the compute services, data layer, security protocols, AI avatar generator, and Telegram CLI bot integrate together.

## Interactive Mindmap

```mermaid
mindmap
  root((DVORA HQ))
    Compute & Hosting
      Backend: GCP Cloud Run
        Node.js Express App
        Docker Container
        Auto-scaling (1-20 instances)
      Frontend: Firebase Hosting
        React Client SPA
        Asset optimization
        Proxies "/api" to Cloud Run
    Data Layer
      Cloud SQL (MySQL 8)
        Users Table
        Readiness checklist
        Commander logs
        Revoked JWTs
      Local Access
        Cloud SQL Proxy Tunnel
    Security & Auth
      Tactical Login
        6-char PIN
        Argon2id hashing
      API Protection
        JWT sessions (2h TTL)
        Token revocation list
      CI/CD Security
        Workload Identity Federation (OIDC)
        Zero stored passwords
    Async & AI
      AI Avatars
        Google GenAI SDK
        Imagen 4.0 Model
        Base64 db storage
      Cloud Tasks
        Task queue: avatar-generation
    Integrations
      Telegram Bot CLI
        Grammy Framework
        Active Polling
```

## Architecture Breakdown

### 1. Compute & Hosting

- **GCP Cloud Run**: Hosts the production Node.js Express backend. It's configured to scale automatically based on request load, with a minimum of 1 instance to prevent cold starts during Telegram webhook requests or user interactions.
- **Firebase Hosting**: Serves the static React SPA frontend. A routing proxy redirects all traffic under `/api/**` and `/health` directly to the Cloud Run backend, eliminating CORS issues and keeping the application under a single domain.

### 2. Data Layer

- **Cloud SQL (MySQL 8)**: Manages relational application state. Contains user tactical profiles (including Argon2id PIN hashes), checklist statuses, commander logs, and a token deny-list.
- **Cloud SQL Proxy**: Used locally by developers to tunnel securely to the remote database using IAM authentication.

### 3. Security & Auth

- **Tactical PIN**: Authorized operators log in using a 6-character tactical PIN (5 digits + 1 letter) which is hashed with Argon2id on the backend.
- **JWT & Revocation**: Authenticated sessions issue a JSON Web Token (JWT) with a 2-hour TTL. Revocation is handled via a database deny-list for maximum security.
- **OIDC WIF**: GitHub Actions logs into Google Cloud securely via OIDC token exchange (Workload Identity Federation), avoiding the need to store long-lived JSON service account keys in the repository secrets.

### 4. Async & AI

- **Imagen 4.0**: Generates tactical cyberpunk avatars based on the weapons and specializations selected by operators during onboarding.
- **Cloud Tasks**: Manages background queue operations for avatar rendering and retry logic.
