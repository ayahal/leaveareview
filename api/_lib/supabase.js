// api/_lib/supabase.js
//
// Delt Supabase-klient brukt av flere endepunkter. Bruker
// SERVICE_ROLE-nøkkelen (ikke den offentlige "anon"-nøkkelen), siden disse
// funksjonene kjører på serveren og trenger å lese/skrive uten å være
// begrenset av radnivå-sikkerhet beregnet på nettleser-klienter.
//
// ALDRI bruk SUPABASE_SERVICE_ROLE_KEY i noen kode som sendes til
// nettleseren - den gir full tilgang til databasen.

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
