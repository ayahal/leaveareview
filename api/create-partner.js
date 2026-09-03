// api/create-partner.js
//
// Kalles fra partner.html når noen trykker "Lag min referral-lenke".
// Oppretter en rad i "partners"-tabellen i Supabase, slik at koden faktisk
// finnes et sted og kan slås opp igjen senere i partnerdashbordet.

import { supabase } from './_lib/supabase.js';

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
    const { name, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Mangler e-post' });
    }

    var base = slugify(name || 'partner') || 'partner';
    var code = base + Math.floor(1000 + Math.random() * 9000);

    // Svært liten sjanse for kollisjon, men prøv en gang til med nytt
    // tilfeldig tall hvis koden allerede finnes.
    let { data: existing } = await supabase.from('partners').select('code').eq('code', code).maybeSingle();
    if (existing) {
      code = base + Math.floor(1000 + Math.random() * 9000);
    }

    const { error } = await supabase.from('partners').insert({
      code: code,
      name: name || '',
      email: email
    });

    if (error) throw error;

    return res.status(200).json({ code: code });
  } catch (err) {
    console.error('Feil ved oppretting av partner:', err);
    return res.status(500).json({ error: 'Kunne ikke opprette partnerkode. Prøv igjen.' });
  }
}
