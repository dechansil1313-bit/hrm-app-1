# Architecture Docs

Diagrams + context for the trickier flows in **HRM Cloud**. Each diagram traces a real code path — the file annotations point at the implementation so you can jump straight from the picture to the source.

## Contents

- [Auth flow](./auth.md) — Credentials & GitHub sign-in, self-register, JWT hydration, change-password, and proxy middleware redirects.
- [Employee onboarding flow](./employee-onboarding.md) — Admin **Quick Add** (atomic employee + user mint) and the idempotent **seed backfill** for legacy rows.
- [Photo upload flow](./photo-upload.md) — Client-side encoding, server-side auth (`admin-or-self`) + size cap, and the matching delete.

## Conventions used across the diagrams

- Actor labels match the **component / file** names in the repo:
  - `SignInScreen` — the right-side panel in `app/dashboard/page.tsx`
  - `Credentials.authorize` — the `authorize()` callback in `lib/auth.ts`
  - `QuickAddDialog` — the modal in `components/dashboard/quick-add-dialog.tsx`
  - `EmployeePhotoUpload` — the avatar widget in `components/dashboard/employee-photo-upload.tsx`
- "**Self-only**" means `employee.userId === session.user.id` — server-enforced everywhere, never merely a UI affordance.
- "**Admin-or-self**" means `session.user.role === "ADMIN" || isOwnProfile`.
- Errors use the literal strings the API returns so they're greppable from server logs.
- Arrows match call directions:
  - `->>` solid = direct call / POST
  - `-->>` dashed = response / return value
- `Note over A,B` blocks separate narrative sections so multi-step paths stay readable.

## How to render

These are plain GitHub-flavored Markdown files. Mermaid blocks render natively on GitHub, GitLab, VS Code's Markdown preview, and most static-site generators (Docusaurus, MkDocs with the `pymdownx.superfences` + mermaid plugin, etc.).
