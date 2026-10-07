# RentFlow — Phase 3

Production-oriented React/Vite property-management SaaS backed by Supabase and Netlify Functions.

## Phase 3 features
- Tenant profiles with rent, deposit, service charge, parking and extras
- Automated/idempotent monthly invoice generation
- FIFO payment allocation across invoices
- Partial payments and advance-payment credits
- M-Pesa Daraja STK Push + callback processing
- Utility meter readings for water/electricity
- Lease expiry runway and renewal tracking
- Owner expenses and monthly owner statement estimates
- SMS/WhatsApp notification adapter with Twilio
- Billing run audit records
- Operational reports and browser PDF/print output
- Vacancy tracking: occupied, vacant, reserved, maintenance
- Supabase RLS and server-only service-role operations
- Netlify scheduled monthly billing function

## Supabase
The live project already contains Phase 1, Phase 2 and Phase 3 migrations. Keep supabase/phase-2.sql and supabase/phase-3.sql with the project for schema history.

## Local frontend
1. Copy .env.example to .env.local.
2. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
3. Run npm install.
4. Run npm run dev.

## Netlify server environment
Set these as Netlify environment variables with Functions scope:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- MPESA_ENVIRONMENT
- MPESA_CONSUMER_KEY
- MPESA_CONSUMER_SECRET
- MPESA_SHORTCODE
- MPESA_PASSKEY
- MPESA_CALLBACK_URL
- Optional: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM

The service-role key must never be prefixed with VITE_ and must never be committed to GitHub.

## M-Pesa
RentFlow uses Safaricom Daraja for STK Push. The callback endpoint is /.netlify/functions/mpesa-callback. The live callback URL should use the deployed Netlify domain.

## Continuous deployment
Connect the GitHub repository to Netlify:
- Build command: npm run build
- Publish directory: dist
- Node: 22

Every push to the connected production branch should trigger a Netlify build and deployment.

## Security
Frontend data access uses the Supabase publishable key and RLS. Server-only operations use the service-role key inside Netlify Functions. Do not expose it in the browser.
