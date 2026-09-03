// api/partner-payouts.js
//
// Kalles fra dashboard.html for å vise historikken over
// utbetalingsforespørsler til den innloggede partneren, med status
// (pending/paid) - slik at partneren selv kan følge med uten å måtte
// spørre dere.

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

    const { data: partner, error: findError } = await supabase
      .from('partners')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!partner) {
      return res.status(404).json({ error: 'Fant ingen partnerkode knyttet til denne kontoen.' });
    }

    const { data, error } = await supabase
      .from('payouts')
      .select('id, amount_ore, payment_method, payment_details, status, requested_at, paid_at')
      .eq('partner_code', partner.code)
      .order('requested_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      payouts: (data || []).map((p) => ({
        id: p.id,
        amount: p.amount_ore / 100,
        paymentMethod: p.payment_method,
        paymentDetails: p.payment_details,
        status: p.status,
        requestedAt: p.requested_at,
        paidAt: p.paid_at
      }))
    });
  } catch (err) {
    console.error('Feil ved henting av utbetalingshistorikk:', err);
    return res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
