# Performance Optimization Plan — LMS for 600 Concurrent Users

## Scope
All phases EXCEPT PostgreSQL migration. SQLite remains the database.
PostgreSQL will be added later when deploying to production.

---

## Phase 1: Database Hardening (SQLite)

### 1.1 Add PRAGMA busy_timeout
**File:** `backend/app/database/database.py`
Add `PRAGMA busy_timeout=5000` in the `set_sqlite_pragma` event listener (line 21).
This makes SQLite wait 5 seconds before returning `SQLITE_BUSY` instead of failing immediately.

### 1.2 Add Database Indexes
**File:** `backend/app/models/models.py`
Add `index=True` to these columns:
- `StudentProfile.roll_number` (line 77)
- `Assignment.teacher_id` (line 116)
- `Review.is_approved` (line 329)
- `OTPVerification.created_at` (line 232)

### 1.3 Fix SQLite Backup
**File:** `backend/app/routers/backup.py`
Replace `shutil.copy2(db_path, backup_path)` (line 112) with:
```python
import sqlite3
conn = sqlite3.connect(db_path)
conn.execute(f"VACUUM INTO '{backup_path}'")
conn.close()
```
This creates a consistent backup even under concurrent writes.

### 1.4 Add Cache-Control Headers
**File:** `backend/app/main.py`
Add `Cache-Control` headers in `SecurityHeadersMiddleware`:
- `/api/courses/` → `private, max-age=60`
- `/api/reviews/public` → `public, max-age=300`
- `/api/files/` → `public, max-age=3600`
- Everything else → `no-store`

---

## Phase 2: Eliminate N+1 Query Storms

### Pattern: Batch prefetch with `IN` clause instead of per-item queries

### 2.1 `_material_out` batch (materials.py)
**File:** `backend/app/routers/materials.py`
Replace `_material_out` per-item queries (lines 20-35) with batch prefetch:
```python
def _material_out(m: StudyMaterial, courses: dict, users: dict) -> dict:
    course = courses.get(m.course_id)
    uploader = users.get(m.uploaded_by)
    return { ... }

# In list_materials:
course_ids = list({m.course_id for m in materials})
uploader_ids = list({m.uploaded_by for m in materials})
courses = {c.id: c for c in db.query(Course).filter(Course.id.in_(course_ids)).all()}
users = {u.id: u for u in db.query(User).filter(User.id.in_(uploader_ids)).all()}
return [_material_out(m, courses, users) for m in materials]
```
**2N queries → 3 queries**

### 2.2 `_result_out` batch (results.py)
**File:** `backend/app/routers/results.py`
Same pattern as materials. Replace lines 29-49.
**2N → 3**

### 2.3 `_review_out` batch (reviews.py)
**File:** `backend/app/routers/reviews.py`
Same pattern. Replace lines 16-31.
**2N → 3**

### 2.4 Quiz attempts batch (quizzes.py)
**File:** `backend/app/routers/quizzes.py`
In `get_all_attempts` (line 306-318): prefetch all students with `IN` clause.
In `get_attempt_detail` (line 266-276): prefetch all questions with `IN` clause.
**2N → 3**

### 2.5 Submissions listing batch (assignments.py)
**File:** `backend/app/routers/assignments.py`
In `list_submissions` (line 271-279): prefetch students and profiles.
**2N → 3**

### 2.6 Attendance matrix batch (attendance.py)
**File:** `backend/app/routers/attendance.py`
In `get_course_attendance_matrix` (line 193-223): prefetch all student users in one query.
**2N → 3**

### 2.7 Promotion history batch (users.py)
**File:** `backend/app/routers/users.py`
In `get_promotion_history` (line 767-769): prefetch student and admin users.
**2N → 3**

### 2.8 Reusable courses counts batch (courses.py)
**File:** `backend/app/routers/courses.py`
In reusable courses list (line 124-127): single grouped query for counts.
**3N → 1**

### 2.9 Semester students batch (users.py)
**File:** `backend/app/routers/users.py`
In `get_semester_students` (line 669-670): prefetch all users with `IN` clause.
**N → 2**

### 2.10 Attendance mark batch (attendance.py)
**File:** `backend/app/routers/attendance.py`
In `mark_attendance` (line 111): prefetch all student users + existing records.
**2N → 3**

---

## Phase 3: Pagination

### Add `skip`/`limit` params to endpoints that lack them

| Endpoint | File | Change |
|----------|------|--------|
| `GET /courses/` | `courses.py` | Add `skip: int = 0, limit: int = 100` |
| `GET /assignments/` | `assignments.py` | Add `skip: int = 0, limit: int = 100` |
| `GET /reviews/all` | `reviews.py` | Add `skip: int = 0, limit: int = 50` |
| `GET /attendance/sessions` | `attendance.py` | Add `skip: int = 0, limit: int = 100` |
| `GET /quizzes/` | `quizzes.py` | Add `skip: int = 0, limit: int = 100` |

---

## Phase 4: Background Tasks

### Move slow I/O to FastAPI BackgroundTasks

| Task | File | Change |
|------|------|--------|
| SMS sending | `otp_service.py:43` | Use `BackgroundTasks.add_task(send_otp_sms, ...)` |
| Email sending | `users.py:475` | Use `BackgroundTasks.add_task(send_credentials_email, ...)` |
| Backup creation | `backup.py:183` | Use `BackgroundTasks.add_task(_do_backup, ...)` |

Import `BackgroundTasks` from `fastapi` in each router.

---

## Phase 5: Frontend Code Splitting

### 5.1 React.lazy + Suspense
**File:** `frontend/src/App.jsx`
Replace eager imports (lines 5-33) with lazy imports:
```jsx
import { lazy, Suspense } from 'react'
import LoadingSpinner from './components/LoadingSpinner'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
// ... all 24 page components
```
Wrap routes in `<Suspense fallback={<LoadingSpinner />}>`.

---

## Phase 6: Frontend Memoization

### Add React.memo to high-frequency re-render components

| Component | File | Change |
|-----------|------|--------|
| `CourseCard` | `StudentDashboard.jsx` | `React.memo(CourseCard)` |
| `CourseCard` | `TeacherDashboard.jsx` | `React.memo(CourseCard)` |
| `Chip` | `Assessments.jsx` | `React.memo(Chip)` |
| `SemesterGrid` | `Assessments.jsx` | `React.memo(SemesterGrid)` |
| `CourseGrid` | `Assessments.jsx` | `React.memo(CourseGrid)` |
| `EmptyState` | `Submissions.jsx` | `React.memo(EmptyState)` |
| `AssignmentList` | `Submissions.jsx` | `React.memo(AssignmentList)` |
| `SubmissionsTable` | `Submissions.jsx` | `React.memo(SubmissionsTable)` |
| `stats` arrays | `ManageUsers.jsx`, `ManageCourses.jsx` | `useMemo` |

### Fix TiltCard
**File:** `frontend/src/components/TiltCard.jsx`
Replace `useState` for `transform`/`glare` with `useRef` + direct DOM manipulation.

---

## Phase 7: Frontend API Optimization

### Parallelize N+1 API calls

| Component | File | Change |
|-----------|------|--------|
| `TeacherDashboard` | `teacher/TeacherDashboard.jsx` | `Promise.all` for submissions, students, sessions |
| `StudentDashboard` | `student/StudentDashboard.jsx` | `Promise.all` for attendance percentages |
| `Assessments` | `teacher/Assessments.jsx` | `Promise.all` for submission counts |
| `Submissions` | `teacher/Submissions.jsx` | `Promise.all` for submission + attempt counts |

### AdminDashboard recent users
**File:** `frontend/src/admin/AdminDashboard.jsx`
Add `?limit=4` to `usersAPI.list()` call instead of fetching all users.

---

## Phase 8: CSS & Bundle Optimization

### 8.1 Vite manual chunks
**File:** `frontend/vite.config.js`
```js
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        lucide: ['lucide-react'],
      }
    }
  }
}
```

### 8.2 Google Fonts preload
**File:** `frontend/src/index.css`
Remove `@import url(...)` (line 1).
**File:** `frontend/index.html`
Add `<link rel="preload" href="..." as="style">` in `<head>`.

### 8.3 Extract shared utilities
**File:** `frontend/src/utils/format.js` (already exists)
Add `parseDate`, `shortDate`, `MONTHS` exports.
Update 6 dashboard files to import from `utils/format.js`.

### 8.4 Lazy images
**File:** `frontend/src/pages/LandingPage.jsx`
Add `loading="lazy"` to below-fold images (faculty photos, CTA background).

### 8.5 ErrorBoundary
**File:** `frontend/src/components/ErrorBoundary.jsx` (new)
Add class component with `componentDidCatch`.
**File:** `frontend/src/App.jsx`
Wrap `<Routes>` in `<ErrorBoundary>`.

---

## Implementation Order

1. **Phase 1** — Database hardening (15 min)
2. **Phase 2** — N+1 query fixes (2-3 hours) ← biggest impact
3. **Phase 5** — Code splitting (15 min)
4. **Phase 6** — Memoization (30 min)
5. **Phase 3** — Pagination (30 min)
6. **Phase 7** — API optimization (30 min)
7. **Phase 4** — Background tasks (15 min)
8. **Phase 8** — CSS/Bundle (30 min)

**Total: ~5-6 hours**

---

## Verification

After each phase:
- `cd backend && python -c "import app.main"` — no import errors
- `cd frontend && npm run build` — build succeeds
- Spot-check key endpoints for correct responses
