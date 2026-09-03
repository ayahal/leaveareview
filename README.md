# LeaveAReview - backend

Dette er de serverless-funksjonene nettsiden trenger for å faktisk kunne
ta imot betaling med Visa, Mastercard, Apple Pay og (snart) Vipps via
Stripe, og for å sende meldinger fra kontaktskjemaet som e-post. Uten
disse er "Fullfør bestilling" og "Send melding" bare simuleringer i
nettleseren.

## Hva er allerede gjort

- `api/create-checkout-session.js` - oppretter en ekte Stripe Checkout-økt
  med riktig pris (regnet ut på nytt på serveren, ikke stolt på fra
  nettleseren) og sender kunden til Stripes betalingsside.
- `api/stripe-webhook.js` - lytter etter Stripes bekreftelse på at
  betalingen faktisk gikk gjennom.
- `api/send-message.js` - tar imot meldinger fra "Snakk med oss"-skjemaet
  og sender dem videre til deres e-post via Resend.
- `public/index.html` (nettsiden) sin "Fullfør bestilling"-knapp og
  "Send melding"-knapp er koblet til å kalle disse to funksjonene.

## Det du selv må gjøre, steg for steg

### 1. Opprett Stripe-konto
Gå til stripe.com → Sign up. Du trenger org.nummer for det norske
selskapet deres for å ta imot ekte penger (test-modus fungerer uten).

### 2. Finn API-nøklene dine
Stripe-dashbord → **Developers → API keys**. Kopier "Secret key"
(`sk_test_...` i testmodus). Ikke del denne med noen, og ikke last den opp
til GitHub.

### 3. Opprett prosjektet hos en hosting-leverandør
Anbefaler **Vercel** (gratis for dette bruksnivået):
1. Opprett konto på vercel.com, koble den til en GitHub-konto
2. Last opp denne mappen (`leaveareview-backend/`) til et nytt GitHub-repo
3. I Vercel: **Add New → Project**, velg repoet
4. Nettsiden ligger allerede klar i `public/index.html` i denne mappen -
   Vercel serverer den automatisk på rot-URL-en siden den heter `index.html`

### 4. Legg inn miljøvariablene
I Vercel-prosjektet: **Settings → Environment Variables**. Legg inn de tre
variablene fra `.env.example` (bruk dine ekte verdier, ikke eksemplene):
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (kommer i steg 6, legg inn en placeholder nå)
- `SITE_URL` (den ekte URL-en Vercel gir deg, f.eks. `https://leaveareview.vercel.app`)

Trykk **Deploy**.

### 5. Verifiser domenet for Apple Pay
Stripe-dashbord → **Settings → Payment methods → Apple Pay** → legg til
domenet ditt. Stripe gir deg en liten verifiseringsfil du må laste opp til
`.well-known/apple-developer-merchantid-domain-association` på nettsiden -
i Vercel legger du den i `public/.well-known/`. Etter det vises Apple Pay
automatisk for besøkende på iPhone/Safari, helt uten kode fra deg.

### 6. Koble på webhooken
Stripe-dashbord → **Developers → Webhooks → Add endpoint**.
- URL: `https://din-side.vercel.app/api/stripe-webhook`
- Event: velg `checkout.session.completed`
- Stripe gir deg en "Signing secret" (`whsec_...`) - lim den inn som
  `STRIPE_WEBHOOK_SECRET` i Vercel (steg 4) og re-deploy.

### 7. Be om tilgang til Vipps i Stripe
Stripe-dashbord → **Settings → Payment methods** → søk etter Vipps → be om
tilgang (den er i begrenset utrulling per nå). Når du får den, legg til
`'vipps'` i `payment_method_types`-listen i `create-checkout-session.js`
(det står kommentert akkurat hvor i filen).

### 8. Sett opp e-post for "Snakk med oss"-skjemaet
Dette skjemaet på nettsiden bruker **Resend** til å faktisk sende meldingen
til dere som e-post (`api/send-message.js`):
1. Opprett konto på resend.com
2. Verifiser et domene dere eier (Resend viser hvilke DNS-oppføringer som
   må legges til hos deres domeneleverandør)
3. Lag en API-nøkkel under **API Keys** i Resend-dashbordet
4. Legg inn i Vercels miljøvariabler (steg 4 over):
   - `RESEND_API_KEY`
   - `CONTACT_EMAIL` (e-postadressen dere selv vil motta meldinger på)
5. Bytt ut `post@din-verifiserte-domene.no` i `send-message.js` med en
   avsenderadresse på domenet dere nettopp verifiserte

Fram til domenet er verifisert kan dere teste med avsenderadressen
`onboarding@resend.dev`, som Resend tilbyr uten videre oppsett.

### 9. Det som IKKE er satt opp ennå, men som du trenger før dere går live
- **En database** for å faktisk lagre bestillingene (Supabase er en enkel,
  gratis start). Uten dette forsvinner bestillingsdataen når webhooken er
  ferdig - dere har ingen liste over hva som er solgt.
- **Referral-utbetaling**: nettsiden sender `referralCode` med til Stripe
  som metadata, men ingenting krediterer partneren automatisk ennå - det
  krever samme database som over, pluss egen logikk for å regne ut og
  faktisk utbetale provisjon (Stripe kan gjøre utbetalinger via **Stripe
  Connect** hvis partnerne skal få pengene direkte).
- **Juridisk**: kjøpsvilkårene er nå lagt inn som tekst direkte på
  nettsiden (se `#vilkar`-seksjonen), men bør leses gjennom av noen med
  juridisk kompetanse før dere tar imot ekte betalinger fra forbrukere i
  Norge - særlig angrerett- og personvernpunktene.

### 10. Test før dere går live
Bruk Stripes testkort (4242 4242 4242 4242, hvilken som helst fremtidig
dato/CVC) i testmodus. Bytt `STRIPE_SECRET_KEY` til `sk_live_...` og
`STRIPE_WEBHOOK_SECRET` til live-versjonen først når dere er klare til å
ta imot ekte penger.
