# TutorStream — Continue Learning

Run the app locally in two terminals. No `.env` file, no manual database setup — the backend seeds demo data on first start.

## Prerequisites

- **Node.js 18+** (tested with v24.16.0)
- **npm 9+** (tested with v11.13.0)

Check versions:

```bash
node -v
npm -v
```

## Run (one command)

From the repo root:

```bash
npm install
npm run dev
```

First command installs dependencies for the root, backend, and frontend. Second command starts **both** servers in one terminal (API on **3000**, UI on **4200**).

Open **http://localhost:4200** when the frontend reports ready.

Verify the API (optional, separate terminal):

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok","timestamp":"..."}
```

Press `Ctrl+C` once to stop both servers.

## Run (two terminals)

Use this if you prefer separate logs for backend and frontend.

**Terminal 1 — Backend:**

```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm install
npm start
```

## Try the demo

The app ships with **3 pre-seeded students**. Use the **"Viewing as:"** dropdown in the header to switch between them:

| Student | What to expect |
|---------|----------------|
| **Alice Chen** | JS course in progress (~45% on lesson 4) |
| **Bob Martinez** | JS course complete; TS not started |
| **Carol Okonkwo** | TypeScript only; 0% progress |

Click **Continue →** on the dashboard to resume or get course recommendations.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port 3000 or 4200 already in use | Stop the other process, or set `PORT=3001` for the backend and update `frontend/src/app/services/api.service.ts` and `student.service.ts` to match |
| Frontend shows API errors | Confirm Terminal 1 is still running and `curl http://localhost:3000/api/health` returns `"status":"ok"` |
| Stale or corrupted data | Stop the backend, delete `backend/tutorstream.db`, then run `npm run dev` again (re-seeds on startup) |

## Design decisions

Architecture, trade-offs, and API details: [DECISIONS.md](./DECISIONS.md)


###  Use the App
The app is pre-seeded with **3 demo students**, each with different progress:
| Student | Enrollments | Progress | Continue Target |
|---------|-------------|----------|-----------------|
| **Alice Chen** | Both courses | JS lessons 1-3 done, lesson 4 at 45% | Lesson 1-4 (Async/Await) |
| **Bob Martinez** | Both courses | JS 100% complete, TS not started | Lesson 2-1 (Generics) |
| **Carol Okonkwo** | TypeScript only | 0% progress | Lesson 2-1 (Generics) |
**To switch students:** Use the "Viewing as:" dropdown in the dashboard header.
The selected student persists in `localStorage` (`tutorstream-student-id`) across page refreshes.
## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/students` | GET | List all students (demo feature) |
| `/api/students/:id/courses` | GET | List enrolled courses with progress |
| `/api/students/:id/courses/:courseId` | GET | Single course with lessons |
| `/api/students/:id/progress` | POST | Record progress on a lesson |
| `/api/students/:id/continue` | GET | Get next lesson to resume |
> **Note:** The `/api/students` endpoint and client-controlled `studentId` in URLs are intentional for this demo. In a real app, authentication would determine the current user.

