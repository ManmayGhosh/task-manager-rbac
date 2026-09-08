# Task Manager API with RBAC (MERN + Python AI microservice)

A full-stack task management app with role-based access control (RBAC) and an
AI-powered assistant that breaks tasks into subtasks, suggests
priority/effort, and generates a daily digest of what's pending.

**[Live demo](https://task-manager-rbac-frontend.onrender.com)**
---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   React     │────▶│  Node/Express API │────▶│  MongoDB            │
│  (Vite)     │     │  (Auth + RBAC)    │     └────────────────────┘
│  :5173      │     │  :5000            │
└─────────────┘     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Python FastAPI  │
                     │  AI microservice │──▶ OpenAI API
                     │  :8000           │
                     └──────────────────┘
```

- **backend/** — Express + MongoDB (Mongoose). Handles auth (JWT), users, tasks,
  and RBAC middleware. Calls the AI service over HTTP for AI features.
- **ai-service/** — FastAPI microservice that calls the OpenAI API to (1) break
  a task down into subtasks + suggest priority/effort, and (2) generate a
  natural-language "daily digest" of a user's pending tasks.
- **frontend/** — React (Vite) SPA: login/register, dashboard, task CRUD, AI
  buttons, and an admin-only user management page.

## Roles & Permissions (RBAC)

| Action                          | admin | manager | member |
|----------------------------------|:---:|:---:|:---:|
| View all tasks                   | ✅  | ✅  | ❌ (own/assigned only) |
| Create task for self              | ✅  | ✅  | ✅  |
| Assign task to others            | ✅  | ✅  | ❌  |
| Update/complete own or assigned task | ✅ | ✅ | ✅ |
| Delete any task                  | ✅  | ✅  | ❌  |
| Run AI breakdown / digest        | ✅  | ✅  | ✅ (own tasks only) |
| Manage users (roles, activate)   | ✅  | ❌  | ❌  |

The **first user who registers becomes `admin`**. Every user
after that registers as `member` by default; an admin can promote/demote
roles from the "Users" page.

## Running everything in Docker

1. Add your OpenAI key:
   ```bash
   # edit ai-service/.env
   OPENAI_API_KEY=sk-...your real key...
   OPENAI_MODEL=gpt-4o-mini   # or any chat-completions capable model
   ```
   (`backend/.env` and `frontend/.env` already have working defaults for
   local Docker use — a JWT secret has already been generated for you.)

2. Build and start everything:
   ```bash
   docker compose up --build
   ```

3. Open the app:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api (health check: http://localhost:5000/health)
   - AI service: http://localhost:8000 (health check: http://localhost:8000/health)
   - MongoDB: localhost:27017 (persisted in the `mongo_data` volume)

To stop: `docker compose down` (add `-v` to also wipe the Mongo volume).


## API Reference (backend, base path `/api`)

### Auth
- `POST /auth/register` — `{ name, email, password }`
- `POST /auth/login` — `{ email, password }`
- `GET /auth/me` — current user (requires `Authorization: Bearer <token>`)

### Tasks (all require auth)
- `GET /tasks` — list tasks (scoped by role); query params `status`, `priority`
- `POST /tasks` — `{ title, description, priority, dueDate, assignedTo }`
- `GET /tasks/:id`
- `PUT /tasks/:id` — update any allowed field; `assignedTo` only for admin/manager
- `DELETE /tasks/:id` — admin/manager only
- `POST /tasks/:id/ai-breakdown` — AI generates subtasks + priority + estimated hours
- `GET /tasks/ai-digest` — AI-generated natural-language summary of pending tasks

### Users (admin only)
- `GET /users`
- `PATCH /users/:id/role` — `{ role: "admin" | "manager" | "member" }`
- `PATCH /users/:id/status` — `{ isActive: boolean }`

## AI Service Reference (`ai-service`, base path `/`)
- `POST /breakdown` — `{ title, description }` → `{ subtasks[], suggested_priority, estimated_hours }`
- `POST /digest` — `{ tasks: [{title, priority, status, dueDate}], user_name }` → `{ summary, top_priority_titles[] }`

## Notes / next steps
- Passwords are hashed with bcrypt; auth uses stateless JWTs (7-day expiry by default).
- The AI service is a separate deployable unit — can be swapped
  by editing `ai-service/services/openai_service.py` without touching the Node backend.


### Task Manager — Full-Stack RBAC Platform with AI Task Assistant
**React (Vite) · Node.js/Express · MongoDB · Python (FastAPI) · Docker**
[Live App](https://task-manager-rbac-frontend.onrender.com) · [GitHub Repo](#)

- Built a full MERN task-management platform with **three-tier role-based access control** (admin/manager/member) enforced at the middleware layer across 13+ REST endpoints — members can only see and act on tasks they created or were assigned, closing off the client-side-only permission checks that make most RBAC demos trivially bypassable
- Designed a **decoupled Python FastAPI microservice** for AI features (task breakdown, priority suggestion, daily digest) communicating over an internal HTTP boundary, so the AI provider can be swapped without touching the Node backend or React frontend
- Diagnosed and fixed a **cross-package version incompatibility** between the `openai` SDK and a newer `httpx` release that silently broke every AI request in production, then re-architected the AI layer with a **deterministic rule-based fallback** so subtask generation and digests keep working even when the LLM provider is rate-limited or unreachable
- Deployed frontend, backend, and AI service as **independently scalable containers** on Render with MongoDB Atlas as the managed database, each service redeployable on its own without rebuilding the others