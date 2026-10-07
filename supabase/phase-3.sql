-- RentFlow Phase 3 database migration
-- Applied to Supabase project qgnbpxkycfoqgxxhbxfo.
alter table public.tenants add column if not exists id_number text not null default '';
alter table public.tenants add column if not exists rent numeric not null default 0;
alter table public.tenants add column if not exists deposit numeric not null default 0;
alter table public.tenants add column if not exists service_charge numeric not null default 0;
alter table public.tenants add column if not exists parking numeric not null default 0;
alter table public.tenants add column if not exists extras numeric not null default 0;
alter table public.tenants add column if not exists whatsapp_opt_in boolean not null default false;
alter table public.tenants add column if not exists sms_opt_in boolean not null default true;
alter table public.units drop constraint if exists units_status_check;
alter table public.units add constraint units_status_check check(status in('occupied','vacant','reserved','maintenance'));
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists notes text not null default '';
alter table public.invoices add column if not exists updated_at timestamptz not null default now();
create unique index if not exists invoices_property_tenant_month_uidx on public.invoices(property_id,tenant_id,billing_month) where status<>'void';
create sequence if not exists public.rentflow_invoice_seq;
create or replace function public.set_invoice_number() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.invoice_number is null or new.invoice_number='' then new.invoice_number:='RF-'||to_char(new.billing_month,'YYYYMM')||'-'||lpad(nextval('public.rentflow_invoice_seq')::text,6,'0'); end if;
 new.updated_at:=now(); return new;
end $$;
drop trigger if exists trg_invoice_number on public.invoices;
create trigger trg_invoice_number before insert or update on public.invoices for each row execute function public.set_invoice_number();

create table if not exists public.payment_allocations(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.properties(id) on delete cascade,
 payment_id uuid not null references public.rent_payments(id) on delete cascade,invoice_id uuid references public.invoices(id) on delete set null,
 amount numeric not null check(amount>0),allocation_type text not null default 'invoice' check(allocation_type in('invoice','credit')),created_at timestamptz not null default now());
create table if not exists public.tenant_credits(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.properties(id) on delete cascade,
 tenant_id uuid not null,payment_id uuid references public.rent_payments(id) on delete set null,amount numeric not null check(amount>0),
 remaining_amount numeric not null check(remaining_amount>=0),description text not null default 'Advance payment credit',created_at timestamptz not null default now(),
 constraint tenant_credits_tenant_fk foreign key(tenant_id,property_id) references public.tenants(id,property_id) on delete cascade);
create table if not exists public.mpesa_transactions(
 id uuid primary key default gen_random_uuid(),property_id uuid references public.properties(id) on delete set null,tenant_id uuid,
 checkout_request_id text unique,merchant_request_id text,mpesa_receipt text unique,phone text not null default '',amount numeric not null default 0,
 transaction_date timestamptz,result_code integer,result_description text not null default '',raw_payload jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in('pending','success','failed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.notification_logs(
 id uuid primary key default gen_random_uuid(),property_id uuid references public.properties(id) on delete cascade,tenant_id uuid,
 channel text not null check(channel in('sms','whatsapp','email')),recipient text not null,template text not null,subject text not null default '',
 message text not null,status text not null default 'queued' check(status in('queued','sent','failed')),provider_message_id text,error_message text not null default '',sent_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.billing_runs(
 id uuid primary key default gen_random_uuid(),property_id uuid references public.properties(id) on delete cascade,billing_month date not null,
 invoice_count integer not null default 0,status text not null default 'completed' check(status in('running','completed','failed')),error_message text not null default '',
 started_at timestamptz not null default now(),completed_at timestamptz);
create unique index if not exists billing_runs_property_month_uidx on public.billing_runs(property_id,billing_month);

-- The RPCs allocate payments FIFO, preserve advance credit and generate idempotent monthly invoices.
-- See the live Supabase migration for the complete function bodies.
