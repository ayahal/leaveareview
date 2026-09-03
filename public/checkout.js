// checkout.js - kun for kassesiden (checkout.html).
// Krever at main.js er lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  var checkoutEmpty = document.getElementById('checkoutEmpty');
  var checkoutFilled = document.getElementById('checkoutFilled');
  var checkoutConfirm = document.getElementById('checkoutConfirm');
  var checkoutLines = document.getElementById('checkoutLines');
  var checkoutSubtotal = document.getElementById('checkoutSubtotal');
  var checkoutTotalEl = document.getElementById('checkoutTotal');
  var checkoutButtonTotal = document.getElementById('checkoutButtonTotal');
  var checkoutForm = document.getElementById('checkoutForm');
  var referralNote = document.getElementById('referralNote');

  function renderCheckout() {
    var cart = LAR.cart;

    if (cart.length === 0) {
      checkoutEmpty.style.display = 'block';
      checkoutFilled.style.display = 'none';
      checkoutConfirm.style.display = 'none';
      return;
    }
    checkoutEmpty.style.display = 'none';
    checkoutConfirm.style.display = 'none';
    checkoutFilled.style.display = 'block';

    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var line = cart[i];
      html += '<div class="checkout-line"><div><b>' + line.qty + ' kort - ' + line.color + '</b>' +
        '<span>' + (line.discountPct >= 0.5 ? Math.round(line.discountPct) + '% avslag' : 'ingen mengderabatt') + '</span></div>' +
        '<strong>' + LAR.formatKr(line.lineTotal) + '</strong></div>';
    }
    checkoutLines.innerHTML = html;

    var total = LAR.cartTotal();
    checkoutSubtotal.textContent = LAR.formatKr(total);
    checkoutTotalEl.textContent = LAR.formatKr(total);
    checkoutButtonTotal.textContent = LAR.formatKr(total);

    var refCode = LAR.getReferralCode();
    if (refCode) {
      referralNote.style.display = 'block';
      referralNote.textContent = 'Henvist av partnerkode: ' + refCode;
    } else {
      referralNote.style.display = 'none';
    }
  }

  LAR.onRender(renderCheckout);
  renderCheckout();

  checkoutForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var submitBtn = checkoutForm.querySelector('.checkout-submit');
    var originalBtnHtml = submitBtn.innerHTML;
    submitBtn.setAttribute('disabled', 'disabled');
    submitBtn.textContent = 'Sender deg til betaling...';

    var customer = {
      name: document.getElementById('co-name').value,
      company: document.getElementById('co-company').value,
      email: document.getElementById('co-email').value,
      phone: document.getElementById('co-phone').value,
      address: document.getElementById('co-address').value,
      zip: document.getElementById('co-zip').value,
      city: document.getElementById('co-city').value
    };

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: LAR.cart, customer: customer, referralCode: LAR.getReferralCode() })
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Ukjent feil');
        }
      })
      .catch(function (err) {
        alert('Kunne ikke starte betalingen: ' + err.message + '. Prøv igjen, eller kontakt oss hvis problemet vedvarer.');
        submitBtn.removeAttribute('disabled');
        submitBtn.innerHTML = originalBtnHtml;
      });
  });

  // Kunden kommer hit tilbake fra Stripes betalingsside via success_url.
  // Den ekte bekreftelsen på at betalingen gikk gjennom skjer i webhooken på
  // serveren (api/stripe-webhook.js) - dette er kun den vennlige meldingen
  // kunden ser i nettleseren når de sendes tilbake.
  (function () {
    var params = new URLSearchParams(window.location.search);
    var status = params.get('checkout');
    if (status === 'success') {
      var sessionId = params.get('session_id') || '';
      checkoutEmpty.style.display = 'none';
      checkoutFilled.style.display = 'none';
      checkoutConfirm.style.display = 'block';
      document.getElementById('confirmOrderNumber').textContent = sessionId ? sessionId.slice(-8).toUpperCase() : '-';
      document.getElementById('confirmEmail').textContent = 'e-posten du oppga i kassen';
      LAR.clearCart();
    }
  })();

});
