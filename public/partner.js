// partner.js - kun for partnersiden (partner.html).
// Krever at main.js er lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  var generateRefBtn = document.getElementById('generateRefBtn');
  var partnerResult = document.getElementById('partnerResult');
  var refLinkOutput = document.getElementById('refLinkOutput');
  var copyRefBtn = document.getElementById('copyRefBtn');
  var partnerError = document.getElementById('partnerError');

  generateRefBtn.addEventListener('click', function () {
    var name = document.getElementById('pf-name').value.trim();
    var email = document.getElementById('pf-email').value.trim();

    if (!email) {
      if (partnerError) {
        partnerError.style.display = 'block';
        partnerError.textContent = 'Skriv inn e-posten din først.';
      }
      return;
    }

    var originalText = generateRefBtn.textContent;
    generateRefBtn.setAttribute('disabled', 'disabled');
    generateRefBtn.textContent = 'Lager lenke...';
    if (partnerError) partnerError.style.display = 'none';

    fetch('/api/create-partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        // Referral-lenken peker til forsiden - det er der en ny besøkende
        // skal lande, ikke til denne partnersiden.
        var link = window.location.origin + '/index.html?ref=' + data.code;
        refLinkOutput.value = link;
        partnerResult.style.display = 'block';
        document.getElementById('statClicks').textContent = '0';
        document.getElementById('statOrders').textContent = '0';
        document.getElementById('statEarnings').textContent = '0 kr';
      })
      .catch(function (err) {
        if (partnerError) {
          partnerError.style.display = 'block';
          partnerError.textContent = 'Kunne ikke lage lenke: ' + err.message;
        }
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
