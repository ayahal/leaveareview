// supabase-client.js
//
// Offentlig konfigurasjon for Supabase Auth i nettleseren (pålogging for
// partnere). SUPABASE_ANON_KEY er trygt å ha i klientkode - det er
// nettopp derfor den heter "anon"/"publishable"-nøkkelen. Bruk ALDRI
// service_role-nøkkelen her, den skal kun ligge i Vercels
// miljøvariabler og brukes fra serverkoden (api/_lib/supabase.js).
//
// BYTT UT begge verdiene under med deres egne, fra Supabase-dashbordet:
// Settings -> API -> "Project URL" og "anon/public"-nøkkelen
// ("Publishable key" i det nyeste Supabase-grensesnittet).

const SUPABASE_URL = 'https://uilsjmvchtmzjhdrjcro.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zPLWM2BJkohI9EaHN7jBMA_KjvdS9Zc';

window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
