// api/partner-stats.js
//
// Kalles fra dashboard.html for å hente den innloggede partnerens tall.
// Identifiserer partneren via JWT-en fra Supabase Auth (Authorization-
// headeren), ikke via kode+e-post sendt i forespørselen.

import { supabase } from './_lib/supabase.js';
import { getAuthedUser } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metode ikke tillatt' });
  }

  try {
    const user = await getAuthedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Du må være logget inn.' });
    }

    const { data, error } = await supabase
      .from('partners')
      .select('code, name, email, balance_ore, total_sales_ore, total_orders')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Fant ingen partnerkode knyttet til denne kontoen.' });
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
