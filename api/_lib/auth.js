// api/_lib/auth.js
//
// Verifiserer at forespørselen faktisk kommer fra en innlogget partner,
// ved å sjekke JWT-en Supabase Auth ga nettleseren deres ved innlogging.
// Dette er tryggere enn å stole på en kode+e-post sendt i selve
// forespørselen (som hvem som helst kunne skrevet inn manuelt).

import { supabase } from './supabase.js';

// Henter den innloggede brukeren fra "Authorization: Bearer <token>"-headeren.
// Returnerer null hvis token mangler eller er ugyldig/utløpt.
export async function getAuthedUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
