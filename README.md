# Photographer Platform V1

Nuxt 4 + Nuxt UI + Supabase multi-tenant platform with:

- Public photographer profiles: `/:username`
- Discovery pages: `/photographers`, `/photos`
- Auth: `/auth/login`, `/auth/register`, `/auth/forgot`
- Dashboard: `/dashboard` (threads + profile), `/dashboard/portfolio` (upload/manage photos)
- Admin moderation: `/admin`

## Setup

1) Install deps

```bash
npm install
```

2) Configure Supabase

- Copy `.env.example` → `.env` and fill values.
- Use these env vars:
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
- Apply these migrations in Supabase SQL editor:
  - `supabase/migrations/0001_init.sql`
  - `supabase/migrations/0002_storage_portfolio_policies.sql`

3) Run dev server

```bash
npm run dev
```

## Seed demo data (optional)

This will create a few users (admin/photographers/client), tags, profiles, and some photos:

```bash
npm run seed
```

## Production build

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```
