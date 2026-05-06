## Supabase setup

### Environment variables

Copy `.env.example` to `.env` and fill in:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only)

Legacy fallback env names are still supported:

- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database

Apply:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_storage_portfolio_policies.sql`

in the Supabase SQL editor.

### Storage

`0002_storage_portfolio_policies.sql` creates/updates the `portfolio` bucket and adds policies.

- Portfolio uploads are user-scoped by path: `<auth.uid()>/uploads/<file>`.
- Public read is enabled for `portfolio` objects (v1 behavior using `getPublicUrl`).

