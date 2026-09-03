// api/send-message.js
//
// Denne funksjonen kalles fra "Snakk med oss"-skjemaet på nettsiden.
// Den tar imot e-post + melding fra kunden, og sender det videre til
// DERES e-postadresse via en e-post-tjeneste (Resend, se README).
// Kunden sender aldri en e-post direkte - alt går via denne serveren,
// som er nødvendig fordi nettsider ikke kan sende e-post på egen hånd.

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Kun POST er tillatt' });
  }

  try {
    const { email, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ ok: false, error: 'Mangler e-post eller melding' });
    }

    await resend.emails.send({
      // Avsenderadressen må være på et domene dere har verifisert hos Resend
      // (se README, steg om Resend). Fram til da kan dere bruke
      // "onboarding@resend.dev" som avsender i test.
      from: 'LeaveAReview kontaktskjema <post@din-verifiserte-domene.no>',
      to: process.env.CONTACT_EMAIL,
      reply_to: email,
      subject: 'Ny melding fra kontaktskjemaet',
      text: `Fra: ${email}\n\nMelding:\n${message}`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Feil ved sending av e-post:', err);
    return res.status(500).json({ ok: false, error: 'Kunne ikke sende meldingen. Prøv igjen.' });
  }
}
