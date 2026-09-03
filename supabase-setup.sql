-- supabase-setup.sql
--
-- Kjør DETTE i Supabase-prosjektet ditt for å opprette tabellene
-- partnerdashbordet trenger. Steg: Supabase-dashbord -> SQL Editor ->
-- lim inn hele denne filen -> Run.

create table if not exists partners (
  code text primary key,
  user_id uuid references auth.users(id) unique,  -- ekte konto (Supabase Auth) knyttet til denne partneren
  name text not null,
  email text not null,
  balance_ore integer not null default 0,        -- opptjent provisjon, ikke utbetalt ennå (i øre)
  total_sales_ore integer not null default 0,     -- total omsetning generert av partneren (i øre)
  total_orders integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  partner_code text not null references partners(code),
  amount_ore integer not null,
  status text not null default 'pending',         -- 'pending' eller 'paid'
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Denne funksjonen oppdaterer en partners tall ATOMISK (trygt selv om to
-- salg skulle skje samtidig) - kalles fra webhooken etter et fullført kjøp.
create or replace function increment_partner_stats(
  p_code text,
  p_sale_ore integer,
  p_commission_ore integer
) returns void as $$
begin
  update partners
  set
    balance_ore = balance_ore + p_commission_ore,
    total_sales_ore = total_sales_ore + p_sale_ore,
    total_orders = total_orders + 1
  where code = p_code;
end;
$$ language plpgsql;
