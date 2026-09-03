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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    // HER er stedet du kobler på det som gjør bestillingen "ekte":
    //
    // 1. Lagre bestillingen i en database (f.eks. Supabase/Postgres):
    //      await db.orders.insert({
    //        stripeSessionId: session.id,
    //        email: session.customer_details.email,
    //        amountTotal: session.amount_total,
    //        metadata: session.metadata,
    //      });
    //
    // 2. Send kvitteringsepost (f.eks. med Resend eller Postmark):
    //      await sendReceiptEmail(session.customer_details.email, session);
    //
    // 3. Hvis bestillingen kom via en partner-lenke, krediter partneren:
    //      if (session.metadata.referralCode) {
    //        await db.referrals.incrementSales(session.metadata.referralCode, session.amount_total);
    //      }
    //
    // Ingen av disse tre finnes ennå - se README for hvor du setter dem opp.
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
