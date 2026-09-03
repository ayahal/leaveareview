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
  betalingen faktisk gikk gjennom, og krediterer partneren sin provisjon
  hvis bestillingen kom via en referral-lenke.
- `api/send-message.js` - tar imot meldinger fra "Snakk med oss"-skjemaet
  og sender dem videre til deres e-post via Resend.
- `api/create-partner.js`, `api/partner-stats.js`, `api/request-payout.js`
  - registrerer partnere, henter salgsstatistikk til dashbordet, og
  håndterer utbetalingsforespørsler. Lagrer i Supabase (se steg 9).
- Nettsiden er nå delt opp i fire egne sider i `public/`, som deler samme
  utseende (`styles.css`) og handlekurv (`main.js`, lagret i nettleserens
  localStorage så den følger med mellom sidene):
  - `index.html` - forsiden (alt fra hero til FAQ, pakkevalg og "Snakk med oss")
  - `checkout.html` - egen kasseside med kontaktskjema og betaling
  - `partner.html` - egen side for partnerprogrammet, med referral-lenke-generator
  - `dashboard.html` - partnerdashbord: logg inn med kode + e-post, se
    salg og saldo, be om utbetaling

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

### 9. Sett opp partnerdashbordet (Supabase)
Referral-lenker, salg og saldo for partnerprogrammet lagres nå i en ekte
database - **Supabase** (gratis å starte med):

1. Opprett konto på supabase.com → **New project**
2. Når prosjektet er klart: gå til **SQL Editor** i menyen til venstre
3. Åpne `supabase-setup.sql` (ligger i denne mappen), kopier hele
   innholdet, lim det inn i SQL Editor → **Run**. Dette oppretter de to
   tabellene (`partners` og `payouts`) og en liten hjelpefunksjon.
4. Gå til **Settings → API** i Supabase-prosjektet. Herfra trenger du to
   verdier til Vercel sine miljøvariabler (steg 4 over):
   - `SUPABASE_URL` (står øverst, kalles "Project URL")
   - `SUPABASE_SERVICE_ROLE_KEY` (under "Project API keys" - bruk
     **service_role**-nøkkelen, IKKE "anon"/"public"-nøkkelen, siden
     serverkoden trenger full tilgang)
5. Redeploy i Vercel

Etter dette vil:
- "Lag min referral-lenke" på partnersiden faktisk opprette en rad i
  `partners`-tabellen
- Webhooken automatisk kreditere riktig partner med provisjon
  (`COMMISSION_RATE` i `stripe-webhook.js` - satt til 20% som
  plassholder, endre til riktig sats der)
- Partnere kunne logge inn på `dashboard.html` med koden og e-posten sin
  for å se salg og saldo, og trykke "Be om utbetaling"

**Viktig om utbetaling:** "Be om utbetaling" overfører IKKE penger
automatisk - den lagrer en forespørsel i `payouts`-tabellen og sender dere
en e-post. Dere må fortsatt betale ut provisjonen manuelt (Vipps/bank) og
selv markere raden som betalt i Supabase (under **Table Editor →
payouts**, sett `status` til `paid`). Automatisk utbetaling er mulig med
**Stripe Connect**, men krever at hver partner onboardes med egen konto
der - en god del mer arbeid enn dette oppsettet.

### 10. Det som IKKE er satt opp ennå, men som du trenger før dere går live
- **Bestillingslagring**: selve varebestillingen (hvilke kort, farge,
  leveringsadresse) lagres fortsatt ikke i noen tabell - kun
  partner-provisjonen gjør det nå. Legg gjerne til en `orders`-tabell etter
  samme mønster som `partners`, og skriv til den i webhooken.
- **Kvitteringsepost til kunden** er heller ikke satt opp ennå - kun
  varsel-eposter til dere selv (kontaktskjema og utbetalingsforespørsler).
- **Juridisk**: kjøpsvilkårene er nå lagt inn som tekst direkte på
  nettsiden (se `#vilkar`-seksjonen), men bør leses gjennom av noen med
  juridisk kompetanse før dere tar imot ekte betalinger fra forbrukere i
  Norge - særlig angrerett- og personvernpunktene.

### 11. Test før dere går live
Bruk Stripes testkort (4242 4242 4242 4242, hvilken som helst fremtidig
dato/CVC) i testmodus. Bytt `STRIPE_SECRET_KEY` til `sk_live_...` og
`STRIPE_WEBHOOK_SECRET` til live-versjonen først når dere er klare til å
ta imot ekte penger.
