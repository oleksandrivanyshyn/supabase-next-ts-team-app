# Frontend — Team Products Platform

Next.js (App Router) frontend for the Team Products Platform.

See the [root README](../README.md) for the full architecture overview, local
development setup (this app needs the Supabase stack running), and deployment
instructions.

## Quick start

```bash
cp .env.local.example .env.local   # fill in values from `supabase status`
npm install
npm run dev                        # http://localhost:3000
```

Requires the local Supabase stack (`supabase start`) and Edge Functions
(`supabase functions serve --env-file supabase/.env`) running — see the root
README.
