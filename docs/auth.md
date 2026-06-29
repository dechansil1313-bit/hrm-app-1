# Auth Flow

Three entry points (**Credentials** sign-in, **GitHub** OAuth, **self-register**) and one privileged mutation (**change own password**). All routes share the same JWT session; an admin/USER first-paint redirect routes people to the right place.

## Diagram 1 — Sign in (Credentials & GitHub) + Self-Register

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant UI as SignInScreen<br/>(app/dashboard/page.tsx)
  participant NA as signIn()<br/>(next-auth/react)
  participant Handler as /api/auth/[...nextauth]<br/>(route.ts)
  participant Cred as Credentials.authorize<br/>(lib/auth.ts)
  participant GH as GitHub Provider<br/>(lib/auth.ts)
  participant DB as Postgres<br/>(prisma)
  participant JWT as jwt callback<br/>(lib/auth.ts)
  participant Sess as session callback<br/>(lib/auth.ts)
  participant Page as app/dashboard/page.tsx

  Note over User,Page: Path A — Credentials sign-in
  User->>UI: Submit email + password
  UI->>NA: signIn("credentials", {email, password, redirect:false})
  NA->>Handler: POST /api/auth/callback/credentials
  Handler->>Cred: authorize({email, password})
  Cred->>DB: prisma.user.findUnique({where:{email}})
  alt user missing or no password
    Cred-->>Handler: null
    Handler-->>UI: result.error="CredentialsSignin"
  else user found
    Cred->>Cred: bcrypt.compare(input, user.password)
    alt mismatch
      Cred-->>Handler: null
    else match
      Cred-->>Handler: {id, name, email, role}
    end
  end
  Handler->>JWT: jwt({token, user}) — user present only on first call
  alt token.role missing
    JWT->>DB: prisma.user.findUnique({id:token.sub}, select:{role})
    DB-->>JWT: role value
  end
  alt token.employeeId missing
    JWT->>DB: prisma.employee.findUnique({where:{userId:token.sub}})
    DB-->>JWT: {id} | null
  end
  Handler->>Sess: session({session, token})
  Sess-->>UI: session.user.{role, employeeId} hydrated
  Handler-->>UI: result={ok:true}
  alt session.user.role === "USER"
    UI->>User: auto-redirect → /dashboard/employees/{employeeId}
  else session.user.role === "ADMIN"
    UI->>User: render /dashboard analytics
  end

  Note over User,Page: Path B — GitHub OAuth
  User->>UI: Click "Sign in with GitHub"
  UI->>NA: signIn("github")
  NA->>GH: OAuth dance (browser redirect → callback → token)
  GH->>DB: prismaAdapter auto-creates Account + User (if new)
  GH-->>NA: {id, name, email, image}
  NA->>JWT: jwt({token, user})
  Note right of JWT: No password on GitHub user!<br/>change-password returns "This account has no password to update"
  NA->>Page: redirect → /dashboard

  Note over User,Page: Path C — Self-register then auto sign-in
  User->>UI: Toggle "Register" → submit {name, email, password}
  UI->>Handler: POST /api/auth/register (app/api/auth/register/route.ts)
  Handler->>Handler: validate password.length ≥ 6
  alt existing email
    Handler-->>UI: 409 "A user with this email already exists"
  else created
    Handler->>DB: bcrypt.hash(password, 12) → prisma.user.create
    Handler-->>UI: 200 {id, name, email}
    UI->>NA: signIn("credentials", {email, password, redirect:false})
    Note right of UI: same as Path A from here on
  end
```

## Diagram 2 — Change own password

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Page as /dashboard/employees/[id]<br/>(app/dashboard/employees/[id]/page.tsx)
  participant Modal as ChangePasswordButton<br/>(components/dashboard/change-password-button.tsx)
  participant API as POST /api/auth/change-password<br/>(route.ts)
  participant DB as Postgres

  Page->>Page: server-side guard<br/>employee.userId === session.user.id
  alt visible only on own profile
    Page->>Modal: render
  else viewing someone else's profile
    Page->>User: button omitted (defense in depth)
  end
  User->>Modal: Click "Change Password" → fill current/new/confirm
  Modal->>Modal: client-side pre-flight<br/>• new.length ≥ 6<br/>• new === confirm<br/>• new !== current
  Modal->>API: POST {currentPassword, newPassword}
  API->>API: auth() ⇒ require session
  alt no session
    API-->>Modal: 401 Unauthorized
  else session present
    API->>DB: prisma.user.findUnique({where:{id:session.user.id}}, select:{password:true})
    alt user.password null (e.g. GitHub-only account)
      API-->>Modal: 400 "This account has no password to update"
    else user has password
      API->>API: bcrypt.compare(currentPassword, user.password)
      alt mismatch
        API-->>Modal: 400 "Current password is incorrect"
      else match
        API->>DB: prisma.user.update({data:{password: bcrypt.hash(new, 12)}})
        API-->>Modal: 200 {ok: true}
        Modal->>User: green check "Password updated successfully."<br/>modal auto-closes after ~1.2s
        Note right of Modal: Existing JWT stays valid<br/>(password isn't in the token)
      end
    end
  end
```

## Diagram 3 — Proxy middleware (`proxy.ts`) protects `/dashboard/employees/*`

```mermaid
flowchart TD
  Req([Incoming request<br/>matcher /dashboard/employees/*]) --> Auth{auth()<br/>⇒ session?}
  Auth -- "no session" --> Bounce[NextResponse.redirect<br/>new URL "/dashboard", request.url)]
  Auth -- "yes" --> Pass[NextResponse.next]
  Bounce --> Dash[/dashboard<br/>renders SignInScreen]
  Pass --> Page[/dashboard/employees/&#123;id&#125;<br/>full profile page]
```

### Why this matters

- **JWT strategy, not database sessions** — `session: { strategy: "jwt" }` keeps `proxy.ts` cheap and lets the change-password route live without auto-invalidation.
- **One-shot legacy fixup in the `jwt` callback** — `role` and `employeeId` are fetched from the DB only when the token already lacks them (`if (!token.role && token.sub)` / `if (token.sub && !token.employeeId)` in `lib/auth.ts`). After that first hydration the JWT locks the values in for its full lifetime (~30 d by default), so **DB role changes do NOT propagate to in-flight sessions** — the user has to re-login (or wait for JWT expiry) to see role upgrades take effect. Same applies to `employeeId` — once it's bound to a User, unlinking + re-linking won't move the user until they sign in fresh. The branch exists as a migration fixup for tokens issued before the hook was added, not as a continuous re-hydration.
- **GitHub-only accounts can't change password** — the API returns *"This account has no password to update"* rather than crashing; this is also why the UI button is the only entry point, and why this endpoint silently no-ops on accounts that have never had a password.
- **Per-field eye toggles** — the modal currently has independent visibility flags for `Current`, `New`, and `Confirm`, so users can reveal only the field they're auditing without exposing the rest.

### File map

| File                                                | Role                                       |
| --------------------------------------------------- | ------------------------------------------ |
| `lib/auth.ts`                                        | NextAuth config + provider + JWT/Sess cbs  |
| `app/api/auth/[...nextauth]/route.ts`                | NextAuth HTTP handler                      |
| `app/api/auth/register/route.ts`                    | Self-register POST endpoint                |
| `app/api/auth/change-password/route.ts`             | Change-own-password POST endpoint          |
| `app/dashboard/page.tsx`                             | `SignInScreen` + role-based first-paint redirect |
| `components/dashboard/change-password-button.tsx`    | Modal form with pre-flight validation      |
| `app/dashboard/employees/[id]/page.tsx`             | Renders the button only on own profile     |
| `proxy.ts`                                           | Redirects unauthenticated requests         |
