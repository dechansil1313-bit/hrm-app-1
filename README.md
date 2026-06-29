# HRM Cloud

A full-stack **Human Resource Management** web app built with **Next.js 16 (App Router)**, **React 19**, **Prisma 7**, **NextAuth v5** and **PostgreSQL**.

It gives HR admins a live analytics dashboard, self-service employee profiles, biometric-grade credential flows (email/password + GitHub OAuth), and admin tooling to onboard, link, and off-board staff.

> Default landing page → `/` shows a marketing hero. Authenticated workspace lives under `/dashboard`.

---

## ✨ Features

- **Live HR analytics dashboard** — total headcount, active/inactive staff, department breakdown, recent hires, and a 3-month growth chart (refresh-on-click, abort-aware).
- **Quick Add employee** (admin only) — create an Employee row and atomically mint a `User` with a temporary password (`password123`) so the new hire can sign in immediately.
- **Admin user management** — paginated user list with role toggle (Admin ↔ User), search, and a modal to link/unlink employees to user accounts.
- **Self-service profile pages** at `/dashboard/employees/[id]` — employment info, contact details, photo, and a **Portal Security Sync** card.
- **Self-only Change Password modal** — server-side guard (`employee.userId === session.user.id`) ensures users can only ever change their *own* password, never someone else's.
- **Photo upload** — base64-stored in Postgres (`DataURL`, ≤ 2 MB, validated as `data:image/...`), admin-or-self only.
- **NextAuth v5 with Credentials + GitHub providers** — JWT session strategy, role + employeeId hydrated into the session via the `jwt` callback.
- **Atomic employee↔user linking** — `prisma.$transaction` ensures the Quick Add flow never leaves a dangling FK in either direction.
- **Proxy middleware** — `proxy.ts` enforces auth on `/dashboard/employees/*` routes.
- **Idempotent backfill script** — `npm run seed:employee-users` mints logins for legacy employees without one.

---

## 🧱 Tech Stack

| Layer            | Tooling                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| Framework        | Next.js 16.2.9 (App Router, React Server Components)                   |
| UI               | React 19.2.4, Tailwind CSS 4, lucide-react, recharts, shadcn primitives |
| Language         | TypeScript 5                                                           |
| ORM              | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`)                      |
| Database         | PostgreSQL                                                            |
| Auth             | next-auth v5 beta (`@auth/prisma-adapter`), Credentials + GitHub      |
| Password hashing | bcryptjs (cost factor 12)                                             |
| Linting          | ESLint 9                                                               |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (Next.js 16 requirement)
- **PostgreSQL** instance (local or hosted, e.g. Neon / Supabase / RDS)
- `npm` (or `pnpm` / `yarn` / `bun`)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root with at least:

```bash
# Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require"

# Required — generate e.g. via `openssl rand -base64 32`
AUTH_SECRET="<32+ random characters>"

# Optional — GitHub OAuth (falls back to placeholder values if omitted)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
```

> `lib/auth.ts` throws at startup if `AUTH_SECRET` (or `BETTER_AUTH_SECRET`) is missing.

### 3. Migrate the database

```bash
npx prisma migrate deploy        # apply existing migrations to a real DB
# or during development:
npx prisma migrate dev           # create + apply a new migration
```

Migrations live in `prisma/migrations/` (init auth tables, employee schema, password column, employee photo).

### 4. (Optional) Backfill logins for legacy employees

This script finds every `Employee` with `userId IS NULL` and either reuses an existing matching `User` or mints a new one with the temporary password `password123`.

```bash
npm run seed:employee-users              # apply
npm run seed:employee-users -- --dry-run # preview without writing
```

The script is **idempotent** — re-running it is a no-op once everyone is linked.

### 5. Run the dev server

```bash
npm run dev
```

Open **http://localhost:3000** and sign in (or self-register). Admins land on the analytics dashboard; `USER`-role accounts auto-redirect to `/dashboard/employees/{their-own-id}`.

---

## 📜 Scripts

| Script                              | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `npm run dev`                       | Next.js dev server with HMR                              |
| `npm run build`                     | Production build                                         |
| `npm run start`                     | Start the production build                               |
| `npm run lint`                      | ESLint over the whole project                            |
| `npm run seed:employee-users`       | Backfill `User` accounts for unlinked employees         |

> `prisma generate` runs automatically on `postinstall` (Prisma 7 default).

---

## 🗂️ Project Structure

```
app/
├── layout.tsx                 # Root layout (AuthProvider, fonts, globals)
├── page.tsx                   # Public landing page
├── providers.tsx              # SessionProvider wrapper
├── dashboard/
│   ├── page.tsx               # Main dashboard (analytics + SignInScreen)
│   ├── admin/page.tsx         # Admin user-management panel
│   └── employees/[id]/page.tsx# Self-service employee profile
└── api/
    ├── auth/
    │   ├── [...nextauth]/route.ts  # NextAuth handler
    │   ├── register/route.ts       # POST register a new user
    │   └── change-password/route.ts# POST change own password
    ├── dashboard/route.ts          # GET analytics aggregates
    ├── employees/route.ts          # POST Quick-Add
    ├── employees/[id]/route.ts     # GET / PUT / DELETE an employee
    ├── employees/[id]/photo/route.ts # POST / DELETE photo (base64 ≤ 2 MB)
    ├── employees/[id]/link/route.ts  # POST link employee ↔ user
    ├── employees/unlinked/route.ts # GET unlinked employees (admin)
    ├── users/route.ts              # GET list users (admin)
    └── users/[id]/route.ts         # PUT/DELETE a user (admin)

components/
├── dashboard/                # SignOut, dialogs, charts, photo upload, etc.
├── ui/                       # shadcn primitives (button, …)
└── redirect.tsx, promise-error-boundary.tsx

lib/
├── auth.ts                   # NextAuth config (Credentials + GitHub, JWT)
└── prisma.ts                 # Prisma client singleton (pg adapter)

prisma/
├── schema.prisma             # User, Account, Session, Employee, Attendance, Leave
└── migrations/               # 4 migrations

scripts/
└── seed-employee-users.ts    # Idempotent Employee→User backfill

proxy.ts                      # Auth middleware on /dashboard/employees/*
auth.ts                       # NextAuth default-export (calls lib/auth)
auth.config.ts                # Shared NextAuth config callbacks
```

---

## 🗃️ Database Model (high level)

| Model              | Notes                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| `User`             | NextAuth-compatible, augmented with a `password` column (nullable, bcrypt-hashed)|
| `Account`, `Session`, `VerificationToken` | Standard NextAuth tables                                       |
| `Employee`         | Linked 1:1 to `User` via nullable `userId` (`@unique`). Soft link for self-register vs Quick Add. |
| `Attendance`       | Per-day attendance rows, FK-cascade on Employee delete                           |
| `Leave`            | Leave requests — `PENDING` / `APPROVED` / `REJECTED`                             |

The Photo column on `Employee` is `String? @db.Text` and stores a base64 `data:image/...;` payload (max 2 MB server-side enforced).

---

## 🔐 Auth & Roles

`lib/auth.ts` configures two providers:

| Provider    | Identifier        | Notes                                                                              |
| ----------- | ----------------- | ---------------------------------------------------------------------------------- |
| Email/Pass  | `"credentials"`   | Looks up `User.password`, runs `bcrypt.compare`, returns `{id, name, email, role}` |
| GitHub OAuth| `"github"`        | Standard OAuth via `next-auth/providers/github`                                    |

Session strategy is **JWT** so the route we use for `proxy.ts` middleware works without DB lookups per request. The `jwt` callback hydrates two extra fields consumed by the `session` callback:

- `token.role` — re-fetched from DB on existing sessions that lack it (handles role upgrades without forcing a re-login).
- `token.employeeId` — looked up via `prisma.employee.findUnique({ where: { userId: token.sub } })`, used to auto-redirect `USER`-role accounts to their own profile after sign-in.

### Authorization tiers

| Auth role (`User.role`) | What they can do                                                  |
| ----------------------- | ----------------------------------------------------------------- |
| `USER`                  | View their own profile, change own password, upload own photo   |
| `ADMIN`                 | Everything above + admin user management, role toggle, employee CRUD |

The `Employee.role` column (`Admin`, `HR`, `Developer`, `Employee`) is the **job role** and is independent of the **auth role**. They're surfaced separately on the profile page and the Quick Add dialog.

### Security guarantees

- **Change-password endpoint** ignores any `[id]` URL param — it uses `session.user.id` exclusively. Even if the UI guard were ever bypassed, the server won't update someone else's hash.
- **Photo upload endpoint** is admin-or-self (`isAdmin || isOwnProfile`).
- **Proxy middleware** (`proxy.ts`) bounces unauthenticated requests on `/dashboard/employees/*` to `/dashboard`.

---

## 🌐 API Endpoints (surface)

| Method | Path                                  | Auth         | Purpose                                            |
| ------ | ------------------------------------- | ------------ | -------------------------------------------------- |
| GET    | `/api/auth/*`                         | public       | NextAuth handlers (sign-in / sign-out / callback)  |
| POST   | `/api/auth/register`                  | public       | Self-register a new user (≥ 6 char password)       |
| POST   | `/api/auth/change-password`           | session      | Change *own* password (requires current password)  |
| GET    | `/api/dashboard`                      | session      | Headcount / department / growth aggregates         |
| POST   | `/api/employees`                      | (intended admin) | Quick-Add employee + mint User             |
| GET    | `/api/employees/[id]`                 | session      | Fetch a single employee                            |
| PUT    | `/api/employees/[id]`                 | session      | Update employee                                    |
| DELETE | `/api/employees/[id]`                 | session      | Delete employee                                    |
| POST   | `/api/employees/[id]/photo`           | admin / self | Upload base64 photo (`data:image/…`, ≤ 2 MB)       |
| DELETE | `/api/employees/[id]/photo`           | admin / self | Remove photo                                       |
| POST   | `/api/employees/[id]/link`            | admin        | Link employee ↔ user                                |
| GET    | `/api/employees/unlinked`             | admin        | List unlinked employees (search/paginate)          |
| GET    | `/api/users`                          | admin        | List users + linked employees (paginated)          |
| PUT    | `/api/users/[id]`                     | admin        | Update user (currently role toggle + unlink)       |
| DELETE | `/api/users/[id]`                     | admin        | Delete user                                        |

---

## 🧪 Notable Patterns

- **`proxy.ts` instead of `middleware.ts`** — Next.js 16 renames the middleware entry point. Make sure your matcher still hits `/dashboard/employees/:path*`.
- **Atomic Quick Add** — `prisma.$transaction` creates the `User` (with hashed default password) and the `Employee` in one shot; pre-existing users with the same email are reused without password reset.
- **Abort-aware fetching** — `app/dashboard/page.tsx` uses a stored `AbortController` so rapid *Refresh* clicks cancel in-flight requests instead of stacking. Some browsers throw `TypeError` (not `AbortError`) on body interrupt — the fetcher falls back to `signal.aborted` for those.
- **Render-time clamping** — pagination state is clamped during render so the page count can shrink without leaving the user stranded on an empty slice.
- **Self-only UI guard** — the `Change Password` button is gated server-side in `app/dashboard/employees/[id]/page.tsx`: `employee.userId && employee.userId === session.user.id`. Defense in depth: even if the guard were spoofed, the API uses `session.user.id`.

---

## 🚢 Deployment

This is a standard Next.js App-Router app — **Vercel** is the path of least resistance (no custom server needed).

Before deploying:
1. Set the env vars from the *Configure environment* section above in your host's secrets manager.
2. Confirm `DATABASE_URL` points to a reachable Postgres instance (SSL mode is set in the connection string).
3. Run `prisma migrate deploy` during build (most hosts auto-detect Prisma; on Vercel enable a `postinstall` script if needed).
4. (Optional) Provision GitHub OAuth credentials if you want the OAuth button to work in production.

> **Self-hosted Node:** `npm run build` then `npm run start`. Make sure the build host has the same Node major version as the runtime.

---

## 🛠️ Troubleshooting

| Symptom                                                                  | Likely cause                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| App throws `AUTH_SECRET ... is not set` on boot                          | Missing `AUTH_SECRET` / `BETTER_AUTH_SECRET` in `.env`      |
| Sign-in succeeds but dashboard shows "loading..." forever                 | `DATABASE_URL` unreachable or wrong schema                 |
| Quick Add returns an error with a P2002 unique-constraint mention       | Duplicate `email` — the atomic block refuses to mint twice |
| Change-Password says "Current password is incorrect" right after a reset| Quick Add's default password is `password123`, not whatever you typed |
| Photo upload fails with "Photo must be less than 2MB"                    | Client-side image wasn't downscaled before base64-encoding |
| `middleware ./proxy.ts` warning on build                                 | You're on Next < 16 — upgrade; the file is correctly named for Next 16 |

---

## 📚 Documentation

Architecture-level diagrams for the trickier flows live in [`docs/`](./docs/README.md):

- [**Auth flow**](./docs/auth.md) — Credentials, GitHub, self-register, change-password, and `proxy.ts` middleware.
- [**Employee onboarding**](./docs/employee-onboarding.md) — Admin Quick Add (`prisma.$transaction`) + idempotent backfill seed.
- [**Photo upload**](./docs/photo-upload.md) — Client-side encode + server-side admin-or-self + 2 MB cap + delete.

Diagrams are written in Mermaid and render natively on GitHub.

---

## 📄 License

Private project. All rights reserved unless a `LICENSE` file is added.
