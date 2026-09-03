// api/request-payout.js
//
// Kalles når en partner trykker "Be om utbetaling" i dashbordet.
// Identifiserer partneren via JWT-en fra Supabase Auth.
//
// Dette AUTOMATISERER IKKE selve pengeoverføringen (det krever enten
// Stripe Connect med hver partner koblet til, eller manuell
// bankoverføring) - den oppretter en forespørsel i databasen og varsler
// dere på e-post, slik at dere kan behandle utbetalingen manuelt.

import { supabase } from './_lib/supabase.js';
import { getAuthedUser } from './_lib/auth.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { paymentMethod, paymentDetails } = req.body;
    if (!paymentMethod || !paymentDetails) {
      return res.status(400).json({ error: 'Velg betalingsmåte og fyll inn Vipps-/kontonummer.' });
    }
    if (paymentMethod !== 'vipps' && paymentMethod !== 'bank') {
      return res.status(400).json({ error: 'Ugyldig betalingsmåte.' });
    }

    const { data: partner, error: findError } = await supabase
      .from('partners')
      .select('code, name, email, balance_ore')
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!partner) {
      return res.status(404).json({ error: 'Fant ingen partnerkode knyttet til denne kontoen.' });
    }
    if (partner.balance_ore <= 0) {
      return res.status(400).json({ error: 'Ingenting å utbetale ennå' });
    }

    const { error: payoutError } = await supabase.from('payouts').insert({
      partner_code: partner.code,
      amount_ore: partner.balance_ore,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      status: 'pending'
    });
    if (payoutError) throw payoutError;

    // Nullstill saldo - beløpet ligger nå som en "pending"-forespørsel i
    // payouts-tabellen i stedet, og bør merkes "paid" der den dagen dere
    // faktisk har overført pengene.
    const { error: resetError } = await supabase
      .from('partners')
      .update({ balance_ore: 0 })
      .eq('code', partner.code);
    if (resetError) throw resetError;

    try {
      const methodLabel = paymentMethod === 'vipps' ? 'Vipps' : 'Bankkonto';
      await resend.emails.send({
        from: 'LeaveAReview partnerprogram <post@din-verifiserte-domene.no>',
        to: process.env.CONTACT_EMAIL,
        subject: 'Ny utbetalingsforespørsel fra partner',
        text: `${partner.name} (${partner.email}, kode: ${partner.code}) har bedt om utbetaling av ${(partner.balance_ore / 100).toFixed(2)} kr.\n\nBetalingsmåte: ${methodLabel}\nNummer: ${paymentDetails}`
      });
    } catch (emailErr) {
      console.error('Kunne ikke sende varsel-e-post om utbetaling:', emailErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Feil ved utbetalingsforespørsel:', err);
    return res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
