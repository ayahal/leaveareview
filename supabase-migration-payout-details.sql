-- supabase-migration-payout-details.sql
--
-- Kjør denne i tillegg til de forrige - legger til betalingsinfo på
-- utbetalingsforespørsler, slik at dere slipper å kontakte partneren for
-- Vipps-nummer eller kontonummer hver gang.
--
-- Steg: Supabase-dashbord -> SQL Editor -> lim inn hele denne filen -> Run.

alter table payouts
  add column if not exists payment_method text,     -- 'vipps' eller 'bank'
  add column if not exists payment_details text;     -- vipps-/telefonnummer, eller kontonummer
