// index.js - kun for forsiden (index.html).
// Krever at main.js er lastet inn FØR denne filen.

document.addEventListener('DOMContentLoaded', function () {

  // ---------- tap demo ----------
  const demoCard = document.getElementById('demoCard');
  const tapGlow = document.getElementById('tapGlow');
  const faceLock = document.getElementById('faceLock');
  const faceGoogle = document.getElementById('faceGoogle');
  const faceSent = document.getElementById('faceSent');
  const gsText = document.getElementById('gsText');
  const stars = ['s1', 's2', 's3', 's4', 's5'].map(id => document.getElementById(id));
  let demoRunning = false;
  const reviewLine = "Kjempehyggelig betjening og rask service. Anbefales!";

  function showFace(face) {
    [faceLock, faceGoogle, faceSent].forEach(f => f.classList.remove('visible'));
    face.classList.add('visible');
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function runDemo() {
    if (demoRunning) return;
    demoRunning = true;

    tapGlow.classList.remove('burst');
    void tapGlow.offsetWidth;
    tapGlow.classList.add('burst');

    showFace(faceGoogle);
    stars.forEach(s => s.classList.remove('filled'));
    gsText.textContent = '';
    gsText.innerHTML = '<span class="caret">&nbsp;</span>';

    for (let i = 0; i < stars.length; i++) {
      await wait(180);
      stars[i].classList.add('filled');
    }
    await wait(300);

    for (let i = 0; i <= reviewLine.length; i++) {
      gsText.innerHTML = reviewLine.slice(0, i) + '<span class="caret">&nbsp;</span>';
      await wait(22);
    }
    await wait(500);

    showFace(faceSent);
    await wait(2200);
    showFace(faceLock);
    demoRunning = false;

    setTimeout(runDemo, 2600);
  }

  demoCard.addEventListener('click', runDemo);
  demoCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runDemo(); }
  });

  setTimeout(runDemo, 1300);

  // ---------- bundle pricing ----------
  const UNIT_PRICE = 249;
  const MAX_DISCOUNT = 45;
  const SCALE_A = 51;
  const SCALE_B = 0.45;

  function calcDiscountPct(qty) {
    const raw = SCALE_A * (1 - Math.pow(qty, -SCALE_B));
    return Math.min(MAX_DISCOUNT, Math.max(0, raw));
  }

  const qtyInput = document.getElementById('qtyInput');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const customPrice = document.getElementById('customPrice');
  const customDesc = document.getElementById('customDesc');
  const customPick = document.getElementById('customPick');

  var selectedColor = 'Svart';
  var colorButtons = document.querySelectorAll('.color-option');
  for (var ci = 0; ci < colorButtons.length; ci++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        for (var cj = 0; cj < colorButtons.length; cj++) {
          colorButtons[cj].classList.remove('selected');
          colorButtons[cj].setAttribute('aria-pressed', 'false');
        }
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
        selectedColor = btn.dataset.color;
      });
    })(colorButtons[ci]);
  }

  function updateCustomCard() {
    let qty = parseInt(qtyInput.value, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 300) qty = 300;
    qtyInput.value = qty;

    const discountPct = calcDiscountPct(qty);
    const fullTotal = qty * UNIT_PRICE;
    const discTotal = fullTotal * (1 - discountPct / 100);
    const savings = fullTotal - discTotal;

    if (discountPct < 0.5) {
      customPrice.innerHTML = LAR.formatKr(discTotal);
      customDesc.textContent = 'Ingen mengderabatt enda på så få kort.';
    } else {
      customPrice.innerHTML = LAR.formatKr(discTotal) + ' <span class="strike">' + LAR.formatKr(fullTotal) + '</span>';
      customDesc.textContent = Math.round(discountPct) + '% avslag - du sparer ' + LAR.formatKr(savings) + '.';
    }
    return { qty, discountPct, discTotal, fullTotal };
  }

  qtyInput.addEventListener('input', updateCustomCard);
  qtyMinus.addEventListener('click', function () {
    qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    updateCustomCard();
  });
  qtyPlus.addEventListener('click', function () {
    qtyInput.value = Math.min(300, (parseInt(qtyInput.value, 10) || 1) + 1);
    updateCustomCard();
  });
  updateCustomCard();

  var bundleCards = document.querySelectorAll('.bundle-card:not(.custom)');
  for (var bi = 0; bi < bundleCards.length; bi++) {
    (function (card) {
      var btn = card.querySelector('.bundle-pick');
      btn.addEventListener('click', function () {
        var qty = parseInt(card.dataset.qty, 10);
        var price = parseFloat(card.dataset.price);
        var full = parseFloat(card.dataset.full);
        var discount = parseFloat(card.dataset.discount);
        LAR.addToCart(qty, selectedColor, price, full, discount);
      });
    })(bundleCards[bi]);
  }

  customPick.addEventListener('click', function () {
    var result = updateCustomCard();
    LAR.addToCart(result.qty, selectedColor, result.discTotal, result.fullTotal, result.discountPct);
  });

  // ---------- chat / contact form ----------
  var chatForm = document.getElementById('chatForm');
  var chatFormWrap = document.getElementById('chatFormWrap');
  var chatConfirm = document.getElementById('chatConfirm');

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var submitBtn = chatForm.querySelector('button[type="submit"]');
    var originalText = submitBtn.textContent;
    submitBtn.setAttribute('disabled', 'disabled');
    submitBtn.textContent = 'Sender...';

    var payload = {
      email: document.getElementById('chat-email').value,
      message: document.getElementById('chat-message').value
    };

    fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) { return response.json(); })
      .then(function (data) {
        if (data.ok) {
          chatFormWrap.style.display = 'none';
          chatConfirm.style.display = 'block';
        } else {
          throw new Error(data.error || 'Ukjent feil');
        }
      })
      .catch(function (err) {
        alert('Kunne ikke sende meldingen: ' + err.message + '. Prøv igjen senere.');
        submitBtn.removeAttribute('disabled');
        submitBtn.textContent = originalText;
      });
  });

});
