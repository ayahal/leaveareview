// partner.js - kun for partnersiden (partner.html).
// Krever main.js, supabase-client.js og Supabase-CDN-scriptet lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  var generateRefBtn = document.getElementById('generateRefBtn');
  var partnerResult = document.getElementById('partnerResult');
  var refLinkOutput = document.getElementById('refLinkOutput');
  var copyRefBtn = document.getElementById('copyRefBtn');
  var partnerError = document.getElementById('partnerError');
  var partnerFormWrap = document.getElementById('partnerFormWrap');

  function showError(msg) {
    if (!partnerError) return;
    partnerError.style.display = 'block';
    partnerError.textContent = msg;
  }

  generateRefBtn.addEventListener('click', function () {
    var name = document.getElementById('pf-name').value.trim();
    var email = document.getElementById('pf-email').value.trim();
    var password = document.getElementById('pf-password').value;

    if (!email || !password) {
      showError('Fyll ut e-post og passord.');
      return;
    }
    if (password.length < 6) {
      showError('Passordet må være minst 6 tegn.');
      return;
    }

    var originalText = generateRefBtn.textContent;
    generateRefBtn.setAttribute('disabled', 'disabled');
    generateRefBtn.textContent = 'Oppretter konto...';
    if (partnerError) partnerError.style.display = 'none';

    // Steg 1: opprett en ekte konto (e-post + passord) via Supabase Auth.
    // Dette er det som gjør at partneren kan logge inn på nytt senere fra
    // hvilken som helst enhet, i stedet for at vi "husker" noe lokalt.
    window.supabaseClient.auth.signUp({ email: email, password: password })
      .then(function (result) {
        if (result.error) throw result.error;

        var session = result.data.session;
        if (!session) {
          // Skjer hvis prosjektet krever e-postbekreftelse før innlogging.
          throw new Error('Sjekk e-posten din og bekreft kontoen før du fortsetter.');
        }

        // Steg 2: be serveren opprette (eller hente eksisterende)
        // partnerkode knyttet til denne kontoen - kontoen er nå beviset
        // på hvem man er, ikke en e-post skrevet i et skjema.
        return fetch('/api/create-partner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
          },
          body: JSON.stringify({ name: name })
        }).then(function (r) { return r.json(); });
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        var link = window.location.origin + '/?ref=' + data.code;
        refLinkOutput.value = link;
        partnerFormWrap.style.display = 'none';
        partnerResult.style.display = 'block';
      })
      .catch(function (err) {
        showError(err.message || 'Noe gikk galt. Prøv igjen.');
      })
      .finally(function () {
        generateRefBtn.removeAttribute('disabled');
        generateRefBtn.textContent = originalText;
      });
  });

  copyRefBtn.addEventListener('click', function () {
    refLinkOutput.select();
    refLinkOutput.setSelectionRange(0, 99999);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(refLinkOutput.value);
    } else {
      document.execCommand('copy');
    }
    var original = copyRefBtn.textContent;
    copyRefBtn.textContent = 'Kopiert!';
    setTimeout(function () { copyRefBtn.textContent = original; }, 1500);
  });

});
