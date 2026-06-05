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

## Run 

From the repo root:

```bash
npm install
npm run dev
```

`npm install` installs dependencies for the root, backend, and frontend (frontend uses `--legacy-peer-deps` automatically because NgRx 21 expects Angular 21 while this project uses Angular 22). `npm run dev` starts **both** servers in one terminal (API on **3000**, UI on **4200**).

Open **http://localhost:4200** when the frontend reports ready.


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
npm install --legacy-peer-deps
npm start
```

## Try the demo

The app ships with **3 pre-seeded students**. Use the **"Viewing as:"** dropdown in the header to switch between them:

| Student | What to expect |
|---------|----------------|
| **Alice Chen** | JS course in progress (~45% on lesson 4) |
| **Bob Martinez** | JS course complete; TS not started |
| **Carol Okonkwo** | TypeScript only; 0% progress |

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


## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm install` fails with `ERESOLVE` on frontend | From `frontend/`, use `npm install --legacy-peer-deps`. From the repo root, `npm install` should handle this via `postinstall` |
| `'ng' is not recognized` | Frontend deps did not install; run `npm install --prefix frontend --legacy-peer-deps` from the repo root, then retry |
| Port 3000 or 4200 already in use | Stop leftover dev servers (`Ctrl+C`). On Windows, run `netstat -ano` and look for `:3000` or `:4200`; kill the PID in the last column with `taskkill /PID 12345 /F` (use your actual PID). Or set `PORT=3001` for the backend and update `frontend/src/app/services/api.service.ts` and `student.service.ts` to match |
| Frontend shows API errors | Confirm Terminal 1 is still running and `curl http://localhost:3000/api/health` returns `"status":"ok"` |
| Stale or corrupted data | Stop the backend, delete `backend/tutorstream.db`, then run `npm run dev` again (re-seeds on startup) |

## Design decisions

Architecture, trade-offs, and API details: [DECISIONS.md](./DECISIONS.md)



