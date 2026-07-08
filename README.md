# Team Products Platform

A multi-tenant web app where users sign up, create or join **one** team, and
manage their team's **products**. Every user only ever sees and touches data
belonging to their own team — isolation is enforced at the database level with
Row-Level Security, not just in application code.

Built entirely on Supabase services (Auth, Postgres + RLS, Edge Functions,
Storage, Realtime, Cron) with a Next.js frontend.

---

## Features

| Area | What it does |
|---|---|
| **Auth** | Email/password with **mandatory email verification**, Google OAuth, forgot/reset password — all via Supabase Auth |
| **Onboarding** | On first sign-in a user either creates a team (auto-generated 6-char invite code) or joins one by code |
| **Teams** | Exactly one team per user; membership only changes through guarded RPCs |
| **Products** | Team-scoped CRUD with a `draft → active → deleted` state machine (edit only while `draft`, soft-delete only) |
| **Product list** | Paginated table with filters by status, creator, and date range, plus full-text search over title + description |
| **Storage** | Product images in a private bucket, served as short-lived signed URLs |
| **Realtime** | Live online/offline presence of teammates (no realtime on products, by design) |
| **Cron** | Daily job hard-deletes products that have been `deleted` for more than 2 weeks, and removes their images |
| **UX** | Light/dark/system theme, toasts, loading skeletons |

---

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, react-hook-form + zod
- **Backend:** Supabase Edge Functions (Deno) — the single entry point for all team/product business logic
- **Database:** Postgres with Row-Level Security, managed through Supabase CLI migrations
- **Access:** `@supabase/supabase-js` (no ORM) — Edge Functions forward the caller's JWT so every query runs under that user's RLS identity
- **Auth / Storage / Realtime / Cron:** Supabase Auth, Storage, Realtime Presence, `pg_cron` + `pg_net`

---

## Architecture at a glance

```
Browser (Next.js)
  │
  ├── supabase.auth.*          → Supabase Auth           (sign up / in / OAuth / reset)
  ├── supabase.functions.invoke → Edge Functions (Deno)  → Postgres (RLS applies as the user)
  │        teams / products                              → Storage (signed URLs)
  ├── supabase.from(...)        → Postgres directly       (only trivial RLS-scoped reads: team, members)
  ├── supabase.storage.upload   → Storage                 (image upload, RLS-scoped)
  └── supabase.channel(...)     → Realtime Presence       (who's online)

pg_cron (daily) → pg_net.http_post → cron-cleanup Edge Function (service role) → hard-delete + Storage cleanup
```

Key design points a reviewer usually asks about:

- **All product/team writes go through Edge Functions** (brief requirement), yet those functions use plain `supabase-js` with the caller's forwarded `Authorization` header — so **RLS is the real access-control layer**, not the function code. One design satisfies "all backend in Edge Functions", "supabase-js as the ORM", and "RLS protects products" at once.
- **The product state machine lives in a Postgres trigger** (`enforce_product_rules`), because RLS can't compare OLD vs NEW rows. The Edge Function pre-checks for friendly 4xx responses; the trigger is the final, unbypassable enforcement.
- **Team membership only changes via `create_team` / `join_team` RPCs** (`security definer`). Direct writes to `profiles.team_id` are blocked with a **column-level GRANT** — without it, a user could PATCH their own `team_id` via PostgREST and hijack into any team, bypassing invite codes entirely.
- **Two trivial reads bypass Edge Functions** (`useTeam`, `useTeamMembers`) — they only populate UI chrome and are still RLS-scoped. Everything that is real business logic goes through a function.

---

## Repository structure

```
.
├── frontend/                     # Next.js app
│   ├── app/                      # routes: (auth), (app), onboarding, auth/callback
│   ├── components/               # ui/ (shadcn), auth/, products/, team/
│   ├── hooks/                    # useProducts, useTeam(s), useTeamPresence, ...
│   ├── lib/                      # api.ts (Edge Function helper), supabase/ clients
│   └── proxy.ts                  # Next 16 middleware — session guard + auth-page bounce
└── supabase/
    ├── migrations/               # 6 ordered SQL migrations (schema → triggers → RLS → storage → cron)
    ├── seed.sql                  # local-only Vault secrets for the cron job
    └── functions/
        ├── _shared/              # cors, supabase client, auth, context, errors (DRY)
        ├── teams/                # POST /teams, POST /teams/join
        ├── products/             # GET/POST/PATCH/DELETE products
        └── cron-cleanup/         # invoked by pg_cron only
```

---

## Local development

**Prerequisites:** Docker, the [Supabase CLI](https://supabase.com/docs/guides/cli), and Node.js 20+.

### 1. Start the Supabase stack

```bash
supabase start          # boots Postgres, Auth, Storage, etc. in Docker
supabase db reset       # applies all migrations + seed.sql
```

`supabase status` prints the local API URL, anon key, and service-role key.

### 2. Configure environment files

```bash
cp supabase/.env.example supabase/.env
cp frontend/.env.local.example frontend/.env.local
```

- `supabase/.env` — Google OAuth credentials (optional for local unless testing Google), `CRON_SECRET`, and `PUBLIC_SUPABASE_URL` (see note below).
- `frontend/.env.local` — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `supabase status`.

> **Local Storage gotcha:** inside Edge Functions the auto-injected `SUPABASE_URL`
> resolves to the internal Docker hostname (`http://kong:8000`), which a browser
> can't reach — so signed image URLs would be broken. `PUBLIC_SUPABASE_URL`
> (set to `http://127.0.0.1:54321` locally) rewrites the origin before the URL
> reaches the client. It's left unset in production, where `SUPABASE_URL` is
> already public and the rewrite is a no-op.

### 3. Serve Edge Functions

```bash
supabase functions serve --env-file supabase/.env
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Confirmation emails and password-reset links are caught by **Mailpit** at
`http://127.0.0.1:54324` (no real email is sent locally).

### Google OAuth locally (optional)

Requires a Google Cloud OAuth client with redirect URI
`http://127.0.0.1:54321/auth/v1/callback`, the client id/secret in
`supabase/.env`, and `supabase stop && supabase start` after editing
`config.toml` (its changes are not hot-reloaded).

---

## Deployment

### Backend (Supabase hosted project)

```bash
supabase link --project-ref <ref>
supabase db push                                   # migrations → hosted DB
supabase functions deploy teams products cron-cleanup
supabase secrets set CRON_SECRET=<random>          # + Google secrets if used
```

Then, **once**, via the hosted project's SQL editor (never in a migration —
these are secret values), seed the Vault secrets the cron job reads:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<hosted anon key>', 'anon_key');
select vault.create_secret('<same CRON_SECRET as above>', 'cron_secret');
```

In the dashboard: **Authentication → URL Configuration** set the production
Site URL + `/auth/callback` redirect; **Authentication → Providers → Google**
add the production client id/secret (and the production callback URL in Google
Cloud Console).

### Frontend (Vercel)

- Import the repo, set **Root Directory = `frontend`** (this is a monorepo).
- Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the hosted
  project's values.
- After the first deploy, add the resulting domain to Supabase Auth redirect
  URLs and Google Cloud authorized origins.

---

## Requirements mapping

| Brief requirement | Where |
|---|---|
| Email/password + verification + Google + forgot password | `frontend/components/auth/*`, `supabase/config.toml` (`enable_confirmations`) |
| Create/join team, one team per user, unique invite code | `create_team` / `join_team` RPCs, `generate_invite_code()` |
| Team-only data access | RLS via `get_my_team_id()` across all tables + storage |
| Product CRUD, draft/active/deleted state machine, soft delete | `products` function + `enforce_product_rules()` trigger |
| Table with pagination, status/date/creator filters, full-text search | `products` GET + `ProductFilters` / `ProductTable` |
| Cron delete of products deleted > 2 weeks | `cron-cleanup` function + `cron.sql` |
| No realtime for products | products use TanStack Query only; realtime is presence-only |
| Realtime online/offline members | `useTeamPresence` + `TeamHeader` |
| RLS on products, migrations, Edge Functions, shared `_shared/`, local containers | `supabase/` throughout |
