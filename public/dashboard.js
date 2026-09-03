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
  var refLinkOutput = document.getElementById('refLinkOutput');
  var copyRefBtn = document.getElementById('copyRefBtn');

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

  // Henter tallene til den innloggede partneren. Bruker gjeldende
  // Supabase-økt (JWT) for å bevise hvem som spør - ikke noe skrevet inn
  // manuelt i et skjema.
  function loadStats() {
    return window.supabaseClient.auth.getSession().then(function (result) {
      var session = result.data.session;
      if (!session) throw new Error('not-logged-in');

      return fetch('/api/partner-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        }
      }).then(function (r) { return r.json(); });
    }).then(function (data) {
      if (data.error) throw new Error(data.error);
      showDashboard(data);
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

  payoutBtn.addEventListener('click', function () {
    payoutBtn.setAttribute('disabled', 'disabled');
    payoutBtn.textContent = 'Sender forespørsel...';

    window.supabaseClient.auth.getSession().then(function (result) {
      var session = result.data.session;
      if (!session) throw new Error('Du er ikke logget inn lenger.');

      return fetch('/api/request-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        }
      }).then(function (r) { return r.json(); });
    })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        payoutMsg.style.display = 'block';
        payoutMsg.style.color = 'var(--accent)';
        payoutMsg.textContent = 'Forespørselen er sendt! Vi behandler utbetalingen manuelt og tar kontakt.';
        payoutBtn.style.display = 'none';
        return loadStats();
      })
      .catch(function (err) {
        payoutMsg.style.display = 'block';
        payoutMsg.textContent = 'Kunne ikke sende forespørsel: ' + err.message;
        payoutBtn.removeAttribute('disabled');
        payoutBtn.textContent = 'Be om utbetaling';
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
