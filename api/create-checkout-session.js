// api/create-checkout-session.js
//
// Denne funksjonen kalles fra nettsiden når kunden trykker "Fullfør bestilling".
// Den oppretter en Stripe Checkout Session og sender tilbake en URL som
// nettsiden redirecter kunden til. Selve betalingsskjemaet (kort, Apple Pay,
// Vipps når det er aktivert) vises på Stripes egen, sikre side - det bygger
// du ikke selv.
//
// VIKTIG sikkerhetsprinsipp: vi regner ut prisen PÅ NYTT her på serveren,
// med samme rabattformel som nettsiden bruker. Vi stoler aldri på et
// prisbeløp sendt fra klienten - ellers kunne hvem som helst endre prisen
// i nettleserens devtools før de sender bestillingen.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const UNIT_PRICE_ORE = 24900; // 249 kr i øre (Stripe bruker minste myntenhet)
const MAX_DISCOUNT = 45;
const SCALE_A = 51;
const SCALE_B = 0.45;

function calcDiscountPct(qty) {
  const raw = SCALE_A * (1 - Math.pow(qty, -SCALE_B));
  return Math.min(MAX_DISCOUNT, Math.max(0, raw));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Kun POST er tillatt' });
  }

  try {
    const { cart, customer, referralCode } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Handlekurven er tom' });
    }
    if (!customer || !customer.email) {
      return res.status(400).json({ error: 'Mangler e-post' });
    }

    const line_items = cart.map((line) => {
      const qty = Math.max(1, Math.min(300, parseInt(line.qty, 10) || 1));
      const color = line.color === 'Hvit' ? 'Hvit' : 'Svart';

      const discountPct = calcDiscountPct(qty);
      const fullTotalOre = qty * UNIT_PRICE_ORE;
      const discTotalOre = Math.round(fullTotalOre * (1 - discountPct / 100));
      const unitAmountOre = Math.round(discTotalOre / qty);

      return {
        price_data: {
          currency: 'nok',
          product_data: {
            name: `LeaveAReview NFC-kort - ${color}`,
            description: `${qty} stk, ${Math.round(discountPct)}% mengderabatt`,
          },
          unit_amount: unitAmountOre,
        },
        quantity: qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      // 'card' dekker Visa/Mastercard og gir deg Apple Pay + Google Pay helt
      // automatisk på Checkout-siden så snart domenet er verifisert i Stripe
      // (se README, steg 5). Legg til 'vipps' i denne listen så snart Stripe
      // har gitt dere tilgang til Vipps som betalingsmetode:
      // payment_method_types: ['card', 'vipps'],
      payment_method_types: ['card'],

      line_items,
      customer_email: customer.email,

      // All info vi trenger for å fullføre og levere bestillingen, og for å
      // kunne kreditere en partner hvis kunden kom via en referral-lenke.
      // Dette dukker opp i Stripe-dashbordet og sendes til webhooken under.
      metadata: {
        referralCode: referralCode || '',
        customerName: customer.name || '',
        company: customer.company || '',
        phone: customer.phone || '',
        address: customer.address || '',
        zip: customer.zip || '',
        city: customer.city || '',
      },

      success_url: `${process.env.SITE_URL}/checkout.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/checkout.html?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Feil ved oppretting av checkout session:', err);
    return res.status(500).json({ error: 'Noe gikk galt. Prøv igjen.' });
  }
}
