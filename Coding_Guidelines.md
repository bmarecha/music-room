# Coding Guidelines — Music Room

This document is the technical and architectural contract for the entire project. Every new implementation must follow it rigorously.

---

## Table of Contents

1. [Project Architecture & Lifecycle](#1-project-architecture--lifecycle)
2. [Architectural Rules](#2-architectural-rules)
3. [Backend — FastAPI, Python & SQLAlchemy](#3-backend--fastapi-python--sqlalchemy)
4. [Frontend — Expo, React Native & TypeScript](#4-frontend--expo-react-native--typescript)
5. [UX/UI Rules & State Management](#5-uxui-rules--state-management)
6. [Code Style Conventions](#6-code-style-conventions)
7. [Project Status](#7-project-status)

---

## 1. Project Architecture & Lifecycle

The project is a **containerised monorepo**.

```
.
├── backend/               # FastAPI + SQLAlchemy (Python)
├── frontend/              # Expo / React Native (TypeScript)
├── docker-compose.yml     # Container orchestration
├── Makefile               # Single entry point for all commands
└── refresh_env.sh         # Environment automation script
```

### 1.1. Automation — Makefile is the only entry point

All administration, build, migration, and test commands go through the `Makefile`.

| Command | Purpose |
|---|---|
| `make up` | Build images and start all services (db, backend, frontend) |
| `make down` | Stop all services |
| `make restart` | `down` then `up` |
| `make re` | Full rebuild from scratch, no cache |
| `make logs` | Follow all logs (`SERVICE=backend/db/frontend` to filter) |
| `make test` | Run backend test suite |
| `make migrate` | Apply pending Alembic migrations |
| `make migration m="message"` | Auto-generate a new migration |
| `make psql` | Open a psql shell into the database container |
| `make lint` | Run linters: backend (`ruff`) and frontend (`eslint`) |
| `make format` | Run formatters: backend (`ruff`) and frontend (`prettier`) |
| `make clean` | Stop everything and remove volumes |

> [!IMPORTANT]
> **Never** start local server instances, databases, or package managers directly on the host machine. Everything runs in isolated containers.

---

## 2. Architectural Rules

These rules exist specifically to keep **blast-radius small**: a change in one place should not cascade silently into unrelated parts of the codebase.

### 2.1. Dependency Direction — Imports Flow Inward Only

Dependencies must only flow **inward** through the layers. Never import "upward" (a lower layer importing from a higher one) or "sideways" (one domain importing from another domain's layer).

**Backend:**
```
routes → schemas → models
```
An `events` route file must never import from `users` routes or schemas. Shared types (e.g. `VisibilityLevel`) live in `models/` and are imported by any domain that needs them.

**Frontend:**
```
app/(screens) → components/<domain> → api/auth.ts → api/client.ts
```
A component in `components/events/` must never import from `components/profile/profile.service.ts`. If two domains share a type, it belongs in `api/auth.ts`.

### 2.2. Enum Values Are Database-Level Contracts

Native PostgreSQL enums (`native_enum=True`) are **not** managed by SQLAlchemy schema diffs alone — renaming or removing a value requires raw SQL. The rule:

- Enum **values** (the strings stored in the DB) are frozen once a migration has been applied.
- To add a new value: create a new Alembic migration.
- To rename a value: create a migration with a raw `ALTER TYPE … RENAME VALUE` statement. Never just rename the Python enum member without a migration.

### 2.3. Schema-First Workflow for New Features

When adding a new entity, define the stable contract first — before writing any logic. This creates a clear interface that both backend and frontend can build against independently.

**Required order:**
```
migration → model → Pydantic schema → route → TypeScript type → component
```

Skipping or reversing steps (e.g. writing a route before the schema, or a component before the TS type) tends to produce inconsistent field names and silent data mismatches.

### 2.4. `onSuccess` Pattern is Enforced

Components **never re-fetch data independently**. A component's job ends at calling `onSuccess()` to signal that a mutation completed. The **screen** decides what to refresh in response.

```typescript
// Good — component signals up, screen decides what to reload
const handleMutationSuccess = async () => {
  await refreshUser();      // update global auth context
  await loadProfileData();  // re-sync local screen state
};
<EditBio onSuccess={handleMutationSuccess} />

// Bad — component fetches its own data after saving
const handleSave = async () => {
  await profileService.update(data);
  const fresh = await profileService.fetch(); // ❌ component owns re-fetch
  setProfile(fresh);
};
```

This keeps components portable and prevents hidden network side-effects when a component is moved or reused.

### 2.5. No Silent `catch {}`

Empty catch blocks hide bugs and make debugging painful. Every `catch` must do at least one of:
- Display an error to the user.
- Re-throw the error.
- Log it explicitly.

```typescript
// Bad
try {
  await profileService.update(data);
} catch {}

// Good
try {
  await profileService.update(data);
} catch (err) {
  console.error('[EditBio] update failed:', err);
  // optionally: setError('Failed to save. Please try again.');
}
```

The only accepted exception is the top-level `AuthContext` session restoration, which silently logs out on failure by design.

### 2.6. `AsyncSession` Must Not Escape `get_db`

The `AsyncSession` is a request-scoped resource managed by the `get_db` dependency. It must never be:
- Stored as an attribute on any object.
- Passed to a background task or `asyncio.create_task`.
- Used after the request lifecycle has ended.

Always receive it via `Depends(get_db)` and let FastAPI manage its lifetime.

---

## 3. Backend — FastAPI, Python & SQLAlchemy

### 3.1. Stack & Versions

| Package | Version constraint |
|---|---|
| Python | 3.14 |
| FastAPI | 0.162.x |
| SQLAlchemy | ≥ 2.0 (async) |
| Pydantic | ≥ 2.8 (v2 API only) |
| Alembic | ≥ 1.13 |
| asyncpg | ≥ 0.29 |
| PyJWT | ≥ 2.8 |
| bcrypt | ≥ 4.0 |
| pydantic-settings | ≥ 2.4 |

### 3.2. Module Structure

`backend/app/` is organised by layer, not by domain.

```
backend/app/
├── api/
│   ├── deps.py          # Shared FastAPI dependencies (get_db, get_current_user, …)
│   ├── router.py        # Central router — mounts all sub-routers
│   └── routes/          # One file per domain (auth.py, users.py, events.py, …)
├── core/
│   ├── config.py        # Pydantic-Settings configuration object
│   ├── security.py      # JWT helpers (create_access_token, create_action_token, decode_token)
│   ├── oauth.py         # Third-party OAuth verification (Google)
│   └── logging.py       # Logging configuration
├── db/
│   ├── base.py          # SQLAlchemy DeclarativeBase
│   └── session.py       # Async engine + session factory + get_db()
├── models/              # SQLAlchemy ORM models (one file per domain)
└── schemas/             # Pydantic schemas (one file per domain)
```

**For each new business entity** (e.g. `events`, `playlists`), create exactly:
1. `app/models/<entity>.py` — SQLAlchemy model with async typing.
2. `app/schemas/<entity>.py` — Pydantic v2 request/response schemas.
3. `app/api/routes/<entity>.py` — `APIRouter` with all endpoints, mounted in `router.py`.

### 3.3. Database & Migrations

- **Async sessions only.** All DB interactions use `async with` / `await`. No synchronous DB calls.
- **Eager loading.** Relationships needed outside a session must be loaded explicitly with `selectinload` or `joinedload` — never rely on lazy loading.
- **Migrations via Alembic.** Never alter the schema directly. Use `make migration m="<description>"` then `make migrate`.
- **Migration naming convention:** `NNNN_verb_subject.py` (e.g. `0001_create_users.py`, `0002_add_friendship_visibility.py`).

### 3.4. Pydantic v2 — Schema Rules

- **Enums from models.** Visibility levels, subscription types, and preference types are defined as Python `str` `Enum`s in `app/models/` and imported into schemas. Never redefine them inline.
- **Partial PATCH.** Update schemas use `Optional[T] = None` on every field. Route handlers call `.model_dump(exclude_unset=True)` to touch only fields explicitly sent by the client.
- **Field validation.** Use `Field(min_length=…, max_length=…)` on schemas rather than runtime checks where possible.

```python
# Good — partial update pattern
class ProfileUpdate(BaseModel):
    public_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=2000)
    bio_visibility: VisibilityLevel | None = None

# In the route handler:
updates = payload.model_dump(exclude_unset=True)
for field, value in updates.items():
    setattr(current_user, field, value)
```

### 3.5. Authentication & Security

- **Two token types** (discriminated by the `"type"` JWT claim):
  - `"access"` — issued by `create_access_token(user_id)`, subject is the user's integer ID.
  - Action tokens (`"verify_email"`, `"reset_password"`) — issued by `create_action_token(email, action)`, subject is the user's email.
- **Two dependency tiers:**
  - `get_current_user` → validates Bearer token, returns `User`. Use for authenticated routes.
  - `get_current_verified_user` → additionally enforces `is_email_validated`. Use for sensitive operations.
- **Email dispatch is mocked.** Until a real email service is integrated, tokens are logged at `INFO` level with the prefix `MOCK EMAIL DISPATCH:`. This is a known TODO.

### 3.6. Logging

Use a named logger scoped to the module. The naming convention is `musicroom.<module>`:

```python
import logging
logger = logging.getLogger("musicroom.auth")
logger.info("MOCK EMAIL DISPATCH: verify email for %s -> token: %s", email, token)
```

### 3.7. Route File Conventions

- **Private helpers** (not endpoints) are named with a leading underscore: `_is_friend(...)`, `_profile_preferences(...)`, `_profile_response(...)`.
- Every endpoint must declare an explicit **return type annotation** and a `response_model`.
- Use `status.HTTP_XXX` constants rather than raw integer codes.

---

## 4. Frontend — Expo, React Native & TypeScript

### 4.1. Stack & Versions

| Package | Version |
|---|---|
| React | 19.3.0 |
| React Native | 0.88.0 |
| Expo | ~58.0 |
| Expo Router | ~58.0 (v3 file-based routing) |
| TypeScript | ~6.0 |

### 4.2. Directory Structure

```
frontend/src/
├── api/
│   ├── client.ts        # Core apiFetch<T> helper + token/auth management
│   ├── auth.ts          # All typed API call functions + shared TS types
│   └── config.ts        # API_URL and other environment constants
├── app/                 # Physical routing tree (Expo Router)
│   ├── _layout.tsx      # Root layout — AuthProvider wrapper
│   ├── (auth)/          # Unauthenticated screens (login, register, …)
│   └── (app)/
│       ├── _layout.tsx  # Protected layout — redirects if not authenticated
│       ├── index.tsx    # Home screen
│       └── (pages)/     # All other app screens (profile, events, …)
├── components/
│   └── <domain>/        # One folder per domain
│       ├── *.tsx        # Isolated, atomic UI components
│       └── <domain>.service.ts  # Domain types + API service object
├── context/
│   └── AuthContext.tsx  # Global auth state (user, token, session management)
└── utils/
    ├── storage.ts       # SecureStore token persistence
    └── oauth.ts         # OAuth helpers
```

> [!IMPORTANT]
> The `src/features/` folder **no longer exists**. Domain types and API wrappers live in `src/components/<domain>/<domain>.service.ts`, colocated with the UI components they serve.

### 4.3. API Layer (`src/api/`)

All HTTP calls go through `apiFetch<T>` in `client.ts`. It handles:
- `Content-Type: application/json` header.
- `Authorization: Bearer <token>` header (injected automatically when a token is set).
- Telemetry headers on every request: `X-Platform`, `X-Device`, `X-App-Version`.
- Centralised error parsing (reads `detail` or `message` from the JSON error body).
- Automatic `onUnauthorized` callback triggering on 401 (used by `AuthContext` to logout).

**Never call `fetch` directly in a component or service.** Always use `apiFetch<T>`.

`src/api/auth.ts` is the **single source of truth** for shared TypeScript types (`User`, `Profile`, `TokenResponse`, etc.) and raw API call functions. It exports named functions, not a service object:

```typescript
// Good — raw API functions in auth.ts
export function getMyProfile(): Promise<Profile> {
  return apiFetch<Profile>('/users/me/profile');
}
```

### 4.4. Component & Service Colocation (`src/components/<domain>/`)

Each domain folder contains:
- **Visual components** (`.tsx`): atomic, isolated UI blocks that manage their own local state.
- **`<domain>.service.ts`**: domain-specific TypeScript types + a `domainService` object that wraps the raw `api/auth.ts` functions.

```typescript
// components/profile/profile.service.ts
import { getMyProfile, updateMyProfile } from '../../api/auth';

export type VisibilityLevel = 'public' | 'friends' | 'private';
export interface Profile { /* ... */ }

export const profileService = {
  fetch: () => getMyProfile(),
  update: (data: Partial<Profile>) => updateMyProfile(data),
};
```

Components import types and the service from their sibling `.service.ts`, not from `api/auth.ts` directly:

```typescript
// Good
import { profileService, type Profile } from './profile.service';

// Avoid inside a component folder
import { getMyProfile } from '../../api/auth';
```

### 4.5. Screen Files (`src/app/`)

Screens are **orchestrators only**. They must not contain:
- Complex business logic.
- Inline `StyleSheet` objects beyond the simplest layout containers.
- Direct API calls.

A screen's role:
1. Read navigation params.
2. Call context hooks (`useAuth`) or the domain service.
3. Assemble atomic components from `components/`.
4. Pass `onSuccess` callbacks down to child components to trigger data refresh.

```typescript
// Correct screen pattern
const handleMutationSuccess = async () => {
  await refreshUser();       // update global auth context
  await loadProfileData();   // re-sync local screen state
};
```

### 4.6. Global Auth State (`AuthContext`)

`AuthContext` exposes:

| Value / Method | Purpose |
|---|---|
| `user` | The current `User` object or `null` |
| `isLoading` | True while restoring session from storage on startup |
| `isAuthenticated` | True when both `token` and `user` are set |
| `isEmailPending` | True when authenticated but email not yet verified |
| `establishSession(data)` | Call after login/register; persists token and sets state |
| `logout()` | Clears token from storage and resets state |
| `refreshUser()` | Re-fetches `/users/me` and updates the user in context |

- The `onUnauthorized` callback on the API client is wired to `logout()` inside `AuthContext`'s `useEffect`.
- Use `useAuth()` to consume the context. It throws if called outside `AuthProvider`.

---

## 5. UX/UI Rules & State Management

### 5.1. Atomic Forms & Change Detection

- **One component per editable block.** Do not build a single monolithic form for an entire entity. Each field or logical group (e.g. `EditBio.tsx`, `EditBirthdate.tsx`) encapsulates its own local state.
- **Network economy.** Before firing a `PATCH` call, the component must compare the current value against the initial value. The save button is disabled when `hasChanges` is `false`.
- **Normalisation before comparison.** Apply `.trim()` and remove superfluous whitespace before comparing, to avoid false positives from spacing changes.

```typescript
const hasChanges = bio.trim() !== initialValue.trim() || visibility !== initialVisibility;
```

- For comma-separated list inputs (e.g. music preferences), normalise both values before comparing:

```typescript
const normalizeText = (text: string) =>
  text.split(',').map(v => v.trim()).filter(Boolean).join(', ');

const hasChanges = normalizeText(genres) !== normalizeText(initialGenresText);
```

### 5.2. Native Rendering & Style Declaration

- **Use native OS components** for complex interactions, especially date pickers (`@react-native-community/datetimepicker`).
- **`StyleSheet.create()` at the bottom of every file.** Never use inline style objects.
- **Explicit theme handling.** Do not omit default colours. Properties like `placeholderTextColor` and text colours must always be explicitly set to ensure correct rendering in both light and dark mode on iOS and Android.

### 5.3. Visibility

- All user-facing content fields (`bio`, `birthdate`, `music_preferences`) have an associated `*_visibility` field (`public` | `friends` | `private`).
- The `VisibilityPicker` component is the canonical UI element for editing visibility. Always use it; never build ad-hoc visibility selectors.

---

## 6. Code Style Conventions

### 6.1. Python (Backend)

- **Formatter / Linter:** `ruff` configured in `backend/ruff.toml` (runs via `make lint` / `make format`).
- **Type hints:** Mandatory on all function signatures and class attributes. Use `X | Y` union syntax (Python 3.10+), not `Optional[X]`.
- **String quotes:** Double quotes `"` for strings.
- **Import order:** stdlib → third-party → local app imports, each group separated by a blank line.
- **Docstrings:** One-line docstrings on all public route functions. Use imperative mood: `"""Validate Bearer token and return the authenticated User."""`
- **Private helpers:** Prefix with `_` for module-level helper functions not intended as endpoints.
- **No magic numbers.** Use `status.HTTP_XXX` constants.

```python
# Good
from fastapi import APIRouter, Depends, HTTPException, status

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Register a new user with email and password."""
    ...
```

### 6.2. TypeScript (Frontend)

- **Formatter / Linter:** `eslint` (`eslint.config.js`) and `prettier` (`.prettierrc`) (runs via `make lint` / `make format`).
- **Types over interfaces for unions/primitives; interfaces for object shapes:** Use `type` for union types and simple aliases, `interface` for object shapes that may be extended.
- **No `any`.** Use `unknown` and narrow, or define a proper type.
- **Named exports** for components and service objects. Default exports only for screen files (required by Expo Router).
- **`const` arrow functions** for service methods and helper utilities. Regular `function` declarations for React components and context providers.
- **Path aliases:** Use `@/` as the root alias for `src/` (configured in `tsconfig.json`). Always prefer `@/` over any relative `../` import.
- **`apiFetch<T>` always.** Never call `fetch` directly.
- **`StyleSheet.create()`** at the bottom of every component file, after the component definition.

```typescript
// Good — named export, interface for props, StyleSheet at bottom
interface EditBioProps {
  initialValue: string;
  initialVisibility: VisibilityLevel;
  onSuccess: () => void;
}

export function EditBio({ initialValue, initialVisibility, onSuccess }: EditBioProps) {
  // ...
}

const styles = StyleSheet.create({ ... });
```

### 6.3. File Naming

| Context | Convention | Example |
|---|---|---|
| Python modules | `snake_case.py` | `user_music_preference.py` |
| React components | `PascalCase.tsx` | `EditBirthdate.tsx` |
| Service files | `<domain>.service.ts` | `profile.service.ts` |
| API layer files | `camelCase.ts` | `auth.ts`, `client.ts` |
| Screen layouts | `_layout.tsx` | `_layout.tsx` |
| Alembic migrations | `NNNN_verb_subject.py` | `0002_add_friendship_visibility.py` |

---

## 7. Project Status

### Phase Overview

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Foundations & Infrastructure (Docker, DB, Makefile) | ✅ Done |
| **Phase 2** | Authentication & User/Profile Management | ✅ Done |
| **Phase 3** | Core Logic — Playlists, Voting & Concurrency | 🔄 In Progress (backend stubs exist) |
| **Phase 4** | Security, Logging & Telemetry | 🔄 Partial (telemetry headers done in client.ts; rate-limiting pending) |
| **Phase 5** | Load Testing & Optimisation | ⬜ Not started |
| **Phase 6** | Bonus Features (subscriptions, offline cache) | ⬜ Not started |

### What is implemented (Phase 2 — branch `Auth_and_Profile_UI`)

**Backend:**
- User model with `VisibilityLevel`, `SubscriptionType`, `PreferenceType` enums.
- `Friendship` and `UserMusicPreference` models.
- Full auth flow: register, login, email verification (mocked), password reset (mocked), Google OAuth, Google account linking.
- Profile read/update API with per-field visibility enforcement.
- Music preferences (genres & artists) CRUD with deduplication.
- Two dependency tiers: `get_current_user` and `get_current_verified_user`.

**Frontend:**
- Auth screens: login, register, forgot-password, reset-password, verify-email.
- `AuthContext` with session persistence (`expo-secure-store`), `refreshUser`, automatic logout on 401.
- Profile screen: `EditPublicName`, `EditBio`, `EditBirthdate`, `EditMusicPreferences`, `VisibilityPicker`.
- `profile.service.ts` colocated in `components/profile/`.

### Known TODOs / Pending Work

- **Real email dispatch** — replace `MOCK EMAIL DISPATCH` logs with an actual email service.
- **Events & Playlists** — Phase 3 route stubs exist in `routes/events.py` and `routes/playlists.py`; full implementation pending.
- **Unify Styles** - Remove styles from individual frontend files
- **Clean Frontend/src/api** - currently too much is in auth.ts, it should be split between multiple files