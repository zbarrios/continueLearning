# TutorStream — Decisions & Rationale

## 1. Assumptions & Product Decisions

### What does "completed" mean for a lesson?

**Decision:** 95%+ watched for video lessons.

- Users often stop at 95-98% (skip credits, end screens). 100% is too strict — penalizes minor skips.

### What about text-only lessons?

**Decision:** Mark complete when the user clicks **Next** or **Complete Course** — no passive tracking.

- Explicit navigation keeps the contract clear: the learner chooses when they are done.

### How is course "percent complete" calculated?

**Decision:** Linear: `completedLessons / totalLessons × 100`

- Considered a **gamified curve** (front-loaded progress so early lessons count more).
- Rejected: confusing when reality does not match the bar — e.g. 3 of 10 lessons done should read ~30%, not 50%.
- Platform-wide levels, streaks, or rewards are a better home for gamification; out of scope for course progress here.

### Multi-device concurrency (phone + laptop simultaneously)

**Decision:** **Max-wins** — stored progress never goes backwards.

**Implementation:**

```sql
UPDATE progress SET
  percent = MAX(progress.percent, excluded.percent),
  completed = MAX(progress.completed, excluded.completed)
```

**Rationale:**

- Networks deliver progress late, out of order, or duplicated.
- If a user reaches 80% on their phone, then replays to 50% on a laptop, we keep 80%.
- Protects the product promise: resume from the furthest point reached.

**UX trade-off (accepted):** Max-wins alone can feel sticky after a finished lesson — reopening always jumps to the last saved position. We address this in the UI, not by weakening server rules:

- Completed videos can be **replayed freely**; playback is never blocked.
- The player **starts from the beginning** on replay; saved percent stays at the max.
- A **green marker** on the scrubber shows the furthest point watched; saved progress is shown as a simple **percentage**.

### Progress reports: late, out-of-order, duplicated

**Decision:** Single atomic upsert with max-wins logic.

**How it handles each case:**

- **Late reports:** Server takes max of current vs incoming — late 80% won't overwrite already-stored 90%
- **Out-of-order:** Same max logic handles this
- **Duplicated:** Idempotent — sending same progress twice is harmless

**No timestamp comparison needed** because max-wins is simpler and handles all cases.

### "Continue Learning" edge cases


| State                                       | Behavior                                                          |
| ------------------------------------------- | ----------------------------------------------------------------- |
| **In progress**                             | **Continue →** opens the most recently accessed incomplete lesson |
| **Not started** (enrolled, no progress yet) | **Continue →** opens a recommendations modal                      |
| **All enrolled lessons complete**           | **Continue →** opens the same modal with a mixed list             |
| **No courses left to suggest**              | Modal shows a friendly empty state                                |


**Recommendations modal (not started / all complete):**

- Prefer **1 enrolled + 2 unenrolled** courses when unenrolled catalog exists.
- If nothing unenrolled remains, show up to **3 enrolled** courses.
- **New Course** → enroll, then open the course page (lesson list).
- **Your Course** → open that course directly (no re-enroll).

**Rationale:** The Continue button is always visible and always leads somewhere obvious. The goal is zero hesitation on open — either resume work or discover the next course. A smarter recommender (popularity, skill graph, completion patterns) would be the next step; this build uses a simple enrollment-based mix.

---

## 2. Architecture Sketch

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend (Port 4200)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │ Course View │  │    Lesson View      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    NgRx Store                        │   │
│  │  ┌──────────┐  ┌────────────────┐  ┌────────────┐   │   │
│  │  │ courses  │  │ currentCourse  │  │  continue  │   │   │
│  │  └──────────┘  └────────────────┘  └────────────┘   │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────▼──────────────────────────┐  │
│  │                    NgRx Effects                       │  │
│  │              (handles API calls)                      │  │
│  └───────────────────────────┬──────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Fastify Backend (Port 3000)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Route Handlers                    │   │
│  │   /courses   /courses/:id   /progress   /continue    │   │
│  └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────▼──────────────────────────┐  │
│  │                   Service Layer                       │  │
│  │      (business logic, max-wins, validation)          │  │
│  └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────▼──────────────────────────┐  │
│  │                    SQLite (sql.js)                    │  │
│  │    students | courses | lessons | enrollments | progress │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Recording Progress

```
User drags slider to 80%
        │
        ▼
Component calls: this.localPercent.set(80)
        │
        ▼
User clicks "Save Progress"
        │
        ▼
Dispatch: recordProgress({ lessonId, percent: 80 })
        │
        ▼
Effect catches action, calls API:
  POST /api/students/student-1/progress
  Body: { lessonId: "lesson-1-4", percent: 80 }
        │
        ▼
Server validates:
  - percent 0-100? ✓
  - student enrolled? ✓
        │
        ▼
Server applies MAX-WINS:
  existing: 45% → incoming: 80% → store: 80%
  (If incoming was 30%, would keep 45%)
        │
        ▼
Server calculates course progress:
  4/5 completed = 80%
        │
        ▼
Response: { lessonProgress: {percent: 80}, courseProgress: {percent: 80} }
        │
        ▼
Effect dispatches: recordProgressSuccess(...)
        │
        ▼
Reducer updates state (immutably)
        │
        ▼
Components re-render with new progress
```

---

## 3. Code Review Analysis

### Original Snippet

```javascript
app.post('/progress', async (req, res) => {
  const { studentId, lessonId, percent } = req.body;
  const progress = await db.findProgress(studentId, lessonId);
  if (progress) {
    progress.percent = percent;
    if (percent > 95) progress.completed = true;
    await db.save(progress);
  } else {
    await db.create({ studentId, lessonId, percent, completed: percent > 95 });
  }
  const all = await db.findAllProgress(studentId);
  const course = await db.findCourseByLesson(lessonId);
  const done = all.filter(p => p.completed && course.lessonIds.includes(p.lessonId));
  course.percentComplete = (done.length / course.lessonIds.length) * 100;
  await db.save(course);
  res.json({ ok: true, coursePercent: course.percentComplete });
});
```

### Issues Identified


| Issue                                     | Severity | Problem                                                                                                        | My Fix                                                                |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Progress goes backwards**               | Critical | If user sends 80% then 50% (out-of-order), it stores 50%. Breaks the product promise.                          | Use `MAX(current, incoming)` in SQL                                   |
| **Race condition**                        | Critical | Two requests read same progress → both modify → one overwrites the other. Multi-device scenario fails.         | Single atomic upsert query — no read-modify-write                     |
| **No input validation**                   | High     | `percent` could be negative, >100, or not a number. No `lessonId` validation.                                  | Validate before processing: `if (percent < 0 || percent > 100) throw` |
| **No authorization**                      | High     | Anyone can submit progress for any `studentId`.                                                                | Check enrollment before recording                                     |
| **Denormalized `course.percentComplete`** | Medium   | Stored on course but calculated from progress records. Can get out of sync. Multiple writers = race condition. | Calculate on-read, don't store                                        |
| **Fetches ALL student progress**          | Medium   | `findAllProgress(studentId)` — could be thousands of records. Only need current course's progress.             | Scope query to current course: `WHERE l.course_id = ?`                |
| **Magic number 95**                       | Low      | Hardcoded, unexplained.                                                                                        | Extract to constant: `const COMPLETION_THRESHOLD = 95`                |
| **No error handling**                     | Medium   | DB failures, missing records → unhandled exceptions → 500 errors with no useful message.                       | try/catch with proper HTTP status codes                               |
| **No transaction**                        | Medium   | Progress save and course save are separate. Crash between them = inconsistent state.                           | Single atomic query eliminates the need                               |


### What I Kept

1. **Upsert pattern** — find-or-create is the right approach
2. **Returning course percent** — useful for UI to update immediately
3. **Separate `percent` and `completed` fields** — allows "95% but not complete" state

### How My Implementation Differs

```typescript
// My approach: atomic upsert with MAX-WINS
execute(`
  INSERT INTO progress (student_id, lesson_id, percent, completed, ...)
  VALUES (?, ?, ?, ?, ...)
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET
    percent = MAX(progress.percent, excluded.percent),
    completed = MAX(progress.completed, excluded.completed),
    ...
`, [studentId, lessonId, percent, ...]);
```

**Key differences:**

1. Single atomic query — no race conditions
2. `MAX()` ensures progress never decreases
3. Course percent calculated on-read, never stored
4. Proper validation and authorization before the query

---

## 4. What I Cut (5h Budget)


| Feature                              | Why Cut                                                                                                                                                                 | How I'd Approach with More Time                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **User authentication**              | Time constraint; hardcoded `student-1`                                                                                                                                  | JWT tokens with refresh, login/signup flow                                                      |
| **Real video player**                | No hosted media in scope; external URLs unreliable in demo                                                                                                              | Video.js or native HTML5 with `timeupdate` events; CDN-hosted lesson assets                     |
| **Simulated video player**           | Shipped instead of real video for the demo                                                                                                                              | Replace with real player once `content_url` exists per lesson in the DB                         |
| **Text lesson time/scroll tracking** | Considered passive completion (time on page, scroll depth). Chose explicit **Next / Complete Course** clicks — clearer for learners, fewer false positives              | `IntersectionObserver` on sections, or complete at 90% scroll with a visible "almost done" hint |
| **Gamified course progress curve**   | Considered front-loaded % (early lessons weigh more). Rejected — 3/10 lessons done should show ~30%, not 50%; gamification fits platform levels/badges, not course bars | Separate XP/levels layer; keep course bar linear                                                |
| **Real-time multi-device sync**      | WebSocket infrastructure                                                                                                                                                | Socket.io with optimistic updates, conflict resolution UI                                       |
| **Proper error UI**                  | Time; focused on happy path                                                                                                                                             | Toast notifications, retry buttons, offline detection                                           |
| **Loading skeletons**                | Polish item                                                                                                                                                             | Skeleton components for perceived performance                                                   |
| **Responsive design**                | Time; desktop-first                                                                                                                                                     | Mobile-first CSS, touch-friendly controls                                                       |
| **Tests**                            | Explicitly cut per time budget                                                                                                                                          | Jest for services, Cypress for E2E, Testing Library for components                              |
| **Lateral lesson nav panel**         | Time; prev/next footer buttons shipped instead                                                                                                                          | Side panel with course outline, circular progress on course icons                               |


---

## 5. Deep Dive: `recordProgress` Function

**Location:** `backend/src/services/progress.service.ts`

This is the most important function in the codebase — it's where the "Continue Learning" magic happens.

### What It Does

```typescript
export function recordProgress(
  studentId: string,
  lessonId: string,
  percent: number,
  positionSeconds?: number
): RecordProgressResponse {
  // 1. VALIDATION
  if (percent < 0 || percent > 100) {
    throw new Error('Invalid percent: must be between 0 and 100');
  }

  // 2. AUTHORIZATION
  if (!isStudentEnrolledForLesson(studentId, lessonId)) {
    throw new Error('Student not enrolled in this course');
  }

  // 3. MAX-WINS LOGIC
  const existing = queryOne<{...}>(
    'SELECT percent, completed FROM progress WHERE student_id = ? AND lesson_id = ?',
    [studentId, lessonId]
  );

  const completed = percent >= COMPLETION_THRESHOLD ? 1 : 0;

  if (existing) {
    const newPercent = Math.max(existing.percent, percent);
    const newCompleted = Math.max(existing.completed, completed);
    // Only update position if we're making forward progress
    const newPosition = percent > existing.percent 
      ? (positionSeconds ?? null) 
      : existing.last_position_seconds;

    execute('UPDATE progress SET percent = ?, ...', [newPercent, ...]);
  } else {
    execute('INSERT INTO progress ...', [...]);
  }

  // 4. CALCULATE (not store) COURSE PROGRESS
  const courseProgress = calculateCourseProgress(studentId, courseId);

  return { lessonProgress, courseProgress };
}
```

### Why It's Written This Way

1. **Validation first** — fail fast, return clear error messages. Original code had none.
2. **Authorization before mutation** — prevents unauthorized data modification. Security 101.
3. **Max-wins with explicit comparison:**
  - `Math.max(existing.percent, percent)` — progress never decreases
  - `Math.max(existing.completed, completed)` — once complete, stays complete
  - Position only updates if percent increases — prevents stale position from overwriting good position
4. **Calculate on read:**
  - Course progress is calculated, not stored
  - Eliminates sync bugs, race conditions on course updates
  - Slightly more work per request, but data is always accurate
5. **Return both lesson and course progress:**
  - UI needs both to update
  - Single request instead of two
  - Response contains the *actual stored values*, which may differ from input (max-wins)

### Why Not Use a Transaction?

The original code had separate `db.save(progress)` and `db.save(course)` calls — crash between them = inconsistent state.

My approach doesn't store course progress at all, so there's only one write. The "upsert" pattern (INSERT ... ON CONFLICT DO UPDATE) is atomic by nature in SQLite.

---

## 6. Scalability: What Breaks at 100,000 Students?

### First Bottleneck: SQLite

**Problem:** SQLite is single-writer, file-based. With 100k concurrent users:

- Write lock contention
- No connection pooling
- No read replicas

**Fix:**

1. Migrate to PostgreSQL
2. Add connection pooling (pg-pool)
3. Read replicas for GET endpoints
4. Indexes on `(student_id, course_id)` and `(student_id, lesson_id)`

### Second Bottleneck: "Continue Learning" Query

**Problem:** The `getContinueLesson` query joins multiple tables and sorts by `updated_at`. At scale:

- Full table scans
- Sort operations on large datasets

**Fix:**

1. Redis cache for "continue lesson" per student (hot path, changes infrequently)
2. Materialized view or denormalized table for "next lesson"
3. Background job to update cache when progress changes

### Third Bottleneck: Progress Recording Writes

**Problem:** Every video playback sends frequent progress updates (every 10 seconds?). 100k students × 1 update/10s = 10k writes/second.

**Fix:**

1. Client-side debouncing (only send on pause, or every 30 seconds)
2. Write-behind cache (batch writes)
3. Separate write-optimized service (event sourcing?)
4. Queue progress events, process asynchronously

