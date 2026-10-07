# RentFlow Property Manager — Phase 2

Production-oriented React/Vite property management application backed by Supabase.

## Features
- Supabase email/password authentication
- Property workspace onboarding
- Row Level Security with property membership
- Tenants, units, leases, invoices and payments
- Partial/advance payment ledger support
- Meter readings for water/electricity
- Digital tenant statements
- Owner reporting
- 300-unit demo seed
- Promotional landing page
- Netlify SPA deployment

## Local setup

1. Create a Supabase project or use the RentCore project.
2. Apply `supabase/phase-2.sql` in the SQL editor if not already applied.
3. Copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. `npm install`
5. `npm run dev`

Never put a Supabase service-role key in frontend environment variables. The frontend uses only the publishable key and relies on RLS for authorization.
