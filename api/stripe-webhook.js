// api/stripe-webhook.js
//
// Stripe kaller denne URL-en automatisk etter en betaling - ikke nettleseren.
// Dette er den PÅLITELIGE bekreftelsen på at penger faktisk kom inn (i
// motsetning til success_url, som bare betyr at kunden ble sendt tilbake -
// noen kan i teorien besøke den URL-en uten å ha betalt).
//
// Du MÅ registrere denne URL-en i Stripe-dashbordet (se README, steg 6) for
// at dette skal kalles i det hele tatt.

import Stripe from 'stripe';
import { supabase } from './_lib/supabase.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Provisjonssats for partnerprogrammet - PLASSHOLDER, sett riktig verdi her.
const COMMISSION_RATE = 0.20;

// Stripe krever den RÅ (uparserte) HTTP-bodyen for å kunne verifisere at
// forespørselen faktisk kommer fra Stripe og ikke er forfalsket av noen
// andre. Derfor skrur vi av Vercels automatiske JSON-parsing for akkurat
// dette endepunktet.
export const config = {
  api: {
    bodyParser: false,
  },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const signature = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook-signatur feilet:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // ------------------------------------------------------------------
    // Krediter partneren hvis bestillingen kom via en referral-lenke.
    // Bruker en Postgres-funksjon (increment_partner_stats) i stedet for
    // en vanlig UPDATE, slik at det er trygt selv om to salg for samme
    // partner skulle skje samtidig (se supabase-setup.sql).
    // ------------------------------------------------------------------
    const referralCode = session.metadata?.referralCode;
    if (referralCode) {
      const saleOre = session.amount_total; // Stripe oppgir beløp i øre
      const commissionOre = Math.round(saleOre * COMMISSION_RATE);

      const { error } = await supabase.rpc('increment_partner_stats', {
        p_code: referralCode,
        p_sale_ore: saleOre,
        p_commission_ore: commissionOre
      });

      if (error) {
        console.error('Kunne ikke kreditere partner:', referralCode, error);
      } else {
        console.log('Krediterte partner', referralCode, 'med', commissionOre / 100, 'kr');
      }
    }

    // ------------------------------------------------------------------
    // Det som fortsatt IKKE er satt opp her (se README for hvor):
    //
    // 1. Lagre selve bestillingen (varer, leveringsadresse) i en egen
    //    tabell, slik at dere har en liste over hva som skal sendes ut.
    // 2. Send kvitteringsepost til kunden (f.eks. med Resend).
    // ------------------------------------------------------------------

    console.log(
      'Betaling fullført:',
      session.id,
      session.customer_details?.email,
      session.metadata
    );
  }

  return res.status(200).json({ received: true });
}
