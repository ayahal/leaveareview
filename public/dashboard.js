// dashboard.js - kun for partnerdashbordet (dashboard.html).
// Krever at main.js er lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  var LOGIN_KEY = 'lar_partner_login';

  var loginBox = document.getElementById('loginBox');
  var dashboardBox = document.getElementById('dashboardBox');
  var loginBtn = document.getElementById('loginBtn');
  var loginError = document.getElementById('loginError');
  var logoutBtn = document.getElementById('logoutBtn');
  var payoutBtn = document.getElementById('payoutBtn');
  var payoutMsg = document.getElementById('payoutMsg');

  function saveLogin(code, email) {
    try {
      localStorage.setItem(LOGIN_KEY, JSON.stringify({ code: code, email: email }));
    } catch (e) { /* ignorer */ }
  }

  function loadLogin() {
    try {
      var raw = localStorage.getItem(LOGIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearLogin() {
    try { localStorage.removeItem(LOGIN_KEY); } catch (e) { /* ignorer */ }
  }

  function showDashboard(stats, code, email) {
    loginBox.style.display = 'none';
    dashboardBox.style.display = 'block';
    document.getElementById('dashGreeting').textContent = stats.name ? 'Hei, ' + stats.name + '!' : 'Hei!';
    document.getElementById('dashOrders').textContent = stats.totalOrders;
    document.getElementById('dashSales').textContent = LAR.formatKr(stats.totalSales);
    document.getElementById('dashBalance').textContent = LAR.formatKr(stats.balance);
    payoutBtn.style.display = stats.balance > 0 ? 'block' : 'none';
  }

  function fetchStats(code, email) {
    loginError.style.display = 'none';
    return fetch('/api/partner-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, email: email })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        saveLogin(code, email);
        showDashboard(data, code, email);
      });
  }

  loginBtn.addEventListener('click', function () {
    var code = document.getElementById('db-code').value.trim();
    var email = document.getElementById('db-email').value.trim();
    if (!code || !email) {
      loginError.textContent = 'Fyll ut både kode og e-post.';
      loginError.style.display = 'block';
      return;
    }
    fetchStats(code, email).catch(function (err) {
      loginError.textContent = err.message;
      loginError.style.display = 'block';
    });
  });

  logoutBtn.addEventListener('click', function () {
    clearLogin();
    loginBox.style.display = 'block';
    dashboardBox.style.display = 'none';
    document.getElementById('db-code').value = '';
    document.getElementById('db-email').value = '';
  });

  payoutBtn.addEventListener('click', function () {
    var login = loadLogin();
    if (!login) return;

    payoutBtn.setAttribute('disabled', 'disabled');
    payoutBtn.textContent = 'Sender forespørsel...';

    fetch('/api/request-payout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: login.code, email: login.email })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        payoutMsg.style.display = 'block';
        payoutMsg.style.color = 'var(--accent)';
        payoutMsg.textContent = 'Forespørselen er sendt! Vi behandler utbetalingen manuelt og tar kontakt.';
        payoutBtn.style.display = 'none';
        // Oppdater tallene på nytt slik at saldoen viser 0 med en gang
        return fetchStats(login.code, login.email);
      })
      .catch(function (err) {
        payoutMsg.style.display = 'block';
        payoutMsg.textContent = 'Kunne ikke sende forespørsel: ' + err.message;
        payoutBtn.removeAttribute('disabled');
        payoutBtn.textContent = 'Be om utbetaling';
      });
  });

  // Husk pålogging mellom besøk
  var existingLogin = loadLogin();
  if (existingLogin) {
    fetchStats(existingLogin.code, existingLogin.email).catch(function () {
      clearLogin();
    });
  }

});
