-- supabase-migration-accounts.sql
--
-- Kjør DENNE i tillegg til den forrige (supabase-setup.sql) - dette
-- legger til ekte konto-kobling (e-post + passord via Supabase Auth) på
-- toppen av tabellene som allerede finnes.
--
-- Steg: Supabase-dashbord -> SQL Editor -> lim inn hele denne filen -> Run.

-- Kobler hver partner-rad til en ekte innlogget bruker (Supabase Auth).
-- "unique" sikrer at én bruker ikke kan ha mer enn én partnerkode.
alter table partners
  add column if not exists user_id uuid references auth.users(id) unique;

-- E-post er nå bare til visning/varsler - selve påloggingen skjer via
-- Supabase Auth (user_id over), ikke ved å matche denne kolonnen.
-- Den kan derfor ikke lenger dobbeltbrukes til å lage flere koder, siden
-- user_id nå er det som bestemmer eierskap.
