// dashboard.js - kun for partnerdashbordet (dashboard.html).
// Krever main.js, supabase-client.js og Supabase-CDN-scriptet lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  var loginBox = document.getElementById('loginBox');
  var dashboardBox = document.getElementById('dashboardBox');
  var loginBtn = document.getElementById('loginBtn');
  var loginError = document.getElementById('loginError');
  var logoutBtn = document.getElementById('logoutBtn');
  var payoutBtn = document.getElementById('payoutBtn');
  var payoutMsg = document.getElementById('payoutMsg');
  var payoutFormWrap = document.getElementById('payoutFormWrap');
  var payoutSubmitBtn = document.getElementById('payoutSubmitBtn');
  var payoutDetails = document.getElementById('payoutDetails');
  var payoutDetailsLabel = document.getElementById('payoutDetailsLabel');
  var payoutHistoryWrap = document.getElementById('payoutHistoryWrap');
  var payoutHistoryList = document.getElementById('payoutHistoryList');
  var refLinkOutput = document.getElementById('refLinkOutput');
  var copyRefBtn = document.getElementById('copyRefBtn');

  var payoutMethodRadios = document.querySelectorAll('input[name="payoutMethod"]');
  for (var pi = 0; pi < payoutMethodRadios.length; pi++) {
    payoutMethodRadios[pi].addEventListener('change', function () {
      var isVipps = document.querySelector('input[name="payoutMethod"]:checked').value === 'vipps';
      payoutDetailsLabel.textContent = isVipps ? 'Vipps-/telefonnummer' : 'Kontonummer';
      payoutDetails.placeholder = isVipps ? '900 00 000' : '1234.56.78903';
    });
  }

  function showDashboard(stats) {
    loginBox.style.display = 'none';
    dashboardBox.style.display = 'block';
    document.getElementById('dashGreeting').textContent = stats.name ? 'Hei, ' + stats.name + '!' : 'Hei!';
    document.getElementById('dashOrders').textContent = stats.totalOrders;
    document.getElementById('dashSales').textContent = LAR.formatKr(stats.totalSales);
    document.getElementById('dashBalance').textContent = LAR.formatKr(stats.balance);
    payoutBtn.style.display = stats.balance > 0 ? 'block' : 'none';
    refLinkOutput.value = window.location.origin + '/?ref=' + stats.code;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderPayoutHistory(payouts) {
    if (!payouts || payouts.length === 0) {
      payoutHistoryWrap.style.display = 'none';
      return;
    }
    payoutHistoryWrap.style.display = 'block';

    var html = '';
    for (var i = 0; i < payouts.length; i++) {
      var p = payouts[i];
      var methodLabel = p.paymentMethod === 'vipps' ? 'Vipps' : 'Bank';
      var statusLabel = p.status === 'paid' ? 'Betalt' : 'Venter';
      html += '<div class="payout-history-item">' +
        '<div class="payout-history-info"><b>' + LAR.formatKr(p.amount) + '</b>' +
        '<span>' + formatDate(p.requestedAt) + ' - ' + methodLabel + ' ' + p.paymentDetails + '</span></div>' +
        '<span class="payout-status ' + p.status + '">' + statusLabel + '</span>' +
        '</div>';
    }
    payoutHistoryList.innerHTML = html;
  }

  function loadPayoutHistory(token) {
    return fetch('/api/partner-payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) return; // stille feil her - forstyrrer ikke resten av dashbordet
        renderPayoutHistory(data.payouts);
      });
  }

  // Henter tallene til den innloggede partneren. Bruker gjeldende
  // Supabase-økt (JWT) for å bevise hvem som spør - ikke noe skrevet inn
  // manuelt i et skjema.
  //
  // Selvreparerende: hvis kontoen finnes (innlogging gikk bra) men
  // mangler en partnerkode - f.eks. fordi noen ble avbrutt midt i
  // registreringen av en gammel utgave av dette skjemaet - opprettes
  // koden her i stedet for å bare vise en feilmelding.
  function loadStats() {
    var currentSession;
    return window.supabaseClient.auth.getSession().then(function (result) {
      currentSession = result.data.session;
      if (!currentSession) throw new Error('not-logged-in');

      return fetch('/api/partner-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + currentSession.access_token
        }
      }).then(function (r) { return r.json(); });
    }).then(function (data) {
      if (data.error) {
        if (data.error.indexOf('Fant ingen partnerkode') !== -1) {
          // Selvreparasjon: opprett koden nå, så prøv én gang til.
          return fetch('/api/create-partner', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + currentSession.access_token
            },
            body: JSON.stringify({ name: '' })
          })
            .then(function (r) { return r.json(); })
            .then(function (createData) {
              if (createData.error) throw new Error(createData.error);
              return fetch('/api/partner-stats', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + currentSession.access_token
                }
              }).then(function (r) { return r.json(); });
            });
        }
        throw new Error(data.error);
      }
      return data;
    }).then(function (data) {
      if (data.error) throw new Error(data.error);
      showDashboard(data);
      return loadPayoutHistory(currentSession.access_token);
    });
  }

  loginBtn.addEventListener('click', function () {
    var email = document.getElementById('db-email').value.trim();
    var password = document.getElementById('db-password').value;

    if (!email || !password) {
      loginError.style.display = 'block';
      loginError.textContent = 'Fyll ut både e-post og passord.';
      return;
    }

    loginError.style.display = 'none';
    loginBtn.setAttribute('disabled', 'disabled');
    loginBtn.textContent = 'Logger inn...';

    window.supabaseClient.auth.signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) throw result.error;
        return loadStats();
      })
      .catch(function (err) {
        loginError.style.display = 'block';
        loginError.textContent = err.message === 'Invalid login credentials'
          ? 'Feil e-post eller passord.'
          : err.message;
      })
      .finally(function () {
        loginBtn.removeAttribute('disabled');
        loginBtn.textContent = 'Logg inn';
      });
  });

  logoutBtn.addEventListener('click', function () {
    window.supabaseClient.auth.signOut().then(function () {
      loginBox.style.display = 'block';
      dashboardBox.style.display = 'none';
      document.getElementById('db-email').value = '';
      document.getElementById('db-password').value = '';
    });
  });

  // Trykk på "Be om utbetaling" åpner skjemaet for betalingsinfo i
  // stedet for å sende forespørselen med en gang.
  payoutBtn.addEventListener('click', function () {
    payoutBtn.style.display = 'none';
    payoutFormWrap.style.display = 'block';
  });

  payoutSubmitBtn.addEventListener('click', function () {
    var method = document.querySelector('input[name="payoutMethod"]:checked').value;
    var details = payoutDetails.value.trim();

    if (!details) {
      payoutMsg.style.display = 'block';
      payoutMsg.textContent = 'Fyll inn ' + (method === 'vipps' ? 'Vipps-/telefonnummeret' : 'kontonummeret') + ' ditt.';
      return;
    }

    payoutSubmitBtn.setAttribute('disabled', 'disabled');
    payoutSubmitBtn.textContent = 'Sender forespørsel...';
    payoutMsg.style.display = 'none';

    window.supabaseClient.auth.getSession().then(function (result) {
      var session = result.data.session;
      if (!session) throw new Error('Du er ikke logget inn lenger.');

      return fetch('/api/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ paymentMethod: method, paymentDetails: details })
      }).then(function (r) { return r.json(); });
    })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        payoutMsg.style.display = 'block';
        payoutMsg.style.color = 'var(--accent)';
        payoutMsg.textContent = 'Forespørselen er sendt! Vi behandler utbetalingen manuelt og tar kontakt.';
        payoutFormWrap.style.display = 'none';
        payoutDetails.value = '';
        return loadStats();
      })
      .catch(function (err) {
        payoutMsg.style.display = 'block';
        payoutMsg.textContent = 'Kunne ikke sende forespørsel: ' + err.message;
      })
      .finally(function () {
        payoutSubmitBtn.removeAttribute('disabled');
        payoutSubmitBtn.textContent = 'Send utbetalingsforespørsel';
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

  // Supabase husker økten i nettleseren automatisk (med sikker
  // token-fornyelse i bakgrunnen) - så et nytt besøk senere logger deg
  // rett inn igjen uten at vi trenger å håndtere det selv.
  window.supabaseClient.auth.getSession().then(function (result) {
    if (result.data.session) {
      loadStats().catch(function () { /* økten var ugyldig - bli på loginBox */ });
    }
  });

});
