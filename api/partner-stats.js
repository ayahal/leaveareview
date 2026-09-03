// api/partner-stats.js
//
// Kalles fra dashboard.html når en partner "logger inn" med koden og
// e-posten sin. Dette er en enkel oppslags-sjekk, ikke ekte passordpålogging
// - koden fungerer omtrent som et passord siden den er unik og ikke
// gjettbar, men vurder ekte autentisering (f.eks. Supabase Auth) hvis
// partnerprogrammet vokser og pengesummene blir større.

import { supabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Kun POST er tillatt' });
  }

  try {
    const { code, email } = req.body;

    if (!code || !email) {
      return res.status(400).json({ error: 'Mangler kode eller e-post' });
    }

    const { data, error } = await supabase
      .from('partners')
      .select('code, name, email, balance_ore, total_sales_ore, total_orders')
      .eq('code', code.trim())
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Fant ingen partner med denne koden og e-posten' });
    }

    return res.status(200).json({
      name: data.name,
      code: data.code,
      balance: data.balance_ore / 100,
      totalSales: data.total_sales_ore / 100,
      totalOrders: data.total_orders
    });
  } catch (err) {
    console.error('Feil ved henting av partnerstatistikk:', err);
    return res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
