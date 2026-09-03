// api/create-partner.js
//
// Kalles fra partner.html rett etter at noen har opprettet en ekte konto
// (e-post + passord via Supabase Auth). Oppretter partnerkoden deres og
// kobler den til den innloggede brukeren - én konto kan aldri få mer enn
// én kode, siden user_id er unikt i partners-tabellen.

import { supabase } from './_lib/supabase.js';
import { getAuthedUser } from './_lib/auth.js';

function slugify(str) {
  return str.toLowerCase()
    .replace(/[æå]/g, 'a').replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Kun POST er tillatt' });
  }

  try {
    const user = await getAuthedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Du må være logget inn.' });
    }

    // Har denne kontoen allerede en kode? Returner den i stedet for å lage
    // en ny - dette er det som faktisk hindrer at samme person (nå
    // identifisert ved ekte innlogget konto, ikke bare en e-post skrevet i
    // et skjema) kan lage flere koder.
    const { data: existing } = await supabase
      .from('partners')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ code: existing.code });
    }

    const { name } = req.body;
    var base = slugify(name || 'partner') || 'partner';
    var code = base + Math.floor(1000 + Math.random() * 9000);

    // Svært liten sjanse for kollisjon på selve koden, men prøv en gang
    // til med nytt tilfeldig tall hvis den allerede er tatt.
    let { data: codeTaken } = await supabase.from('partners').select('code').eq('code', code).maybeSingle();
    if (codeTaken) {
      code = base + Math.floor(1000 + Math.random() * 9000);
    }

    const { error } = await supabase.from('partners').insert({
      code: code,
      user_id: user.id,
      name: name || '',
      email: user.email
    });

    if (error) throw error;

    return res.status(200).json({ code: code });
  } catch (err) {
    console.error('Feil ved oppretting av partner:', err);
    return res.status(500).json({ error: 'Kunne ikke opprette partnerkode. Prøv igjen.' });
  }
}
