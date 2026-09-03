// main.js - lastes inn på ALLE sider.
// Inneholder handlekurv-motoren (delt mellom forsiden og kassen via
// localStorage, siden det er separate sider nå) og fanger opp
// referral-koder fra URL-en.

window.LAR = (function () {
  var CART_KEY = 'lar_cart';
  var REF_KEY = 'lar_referral';

  function formatKr(n) {
    var rounded = Math.round(n);
    var s = String(rounded);
    var out = '';
    var count = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      count++;
      if (count % 3 === 0 && i !== 0) { out = ' ' + out; }
    }
    return out + ' kr';
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  var cart = loadCart();
  var cartIdCounter = 1;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id >= cartIdCounter) cartIdCounter = cart[i].id + 1;
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) { /* ignorer - t.d. privat nettlesing der lagring er sperret */ }
  }

  function cartTotal() {
    var sum = 0;
    for (var i = 0; i < cart.length; i++) { sum += cart[i].lineTotal; }
    return sum;
  }

  function cartCount() {
    var count = 0;
    for (var i = 0; i < cart.length; i++) { count += cart[i].qty; }
    return count;
  }

  function addToCart(qty, color, unitTotal, fullTotal, discountPct) {
    cart.push({
      id: cartIdCounter++,
      qty: qty,
      color: color,
      lineTotal: unitTotal,
      fullTotal: fullTotal,
      discountPct: discountPct
    });
    saveCart();
    renderAll();
    openCartDrawer();
  }

  function removeFromCart(id) {
    cart = cart.filter(function (line) { return line.id !== id; });
    saveCart();
    renderAll();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderAll();
  }

  // ---------- referral-kode ----------
  function captureReferralFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref');
    if (ref) {
      try { localStorage.setItem(REF_KEY, ref); } catch (e) { /* ignorer */ }
    }
  }

  function getReferralCode() {
    try { return localStorage.getItem(REF_KEY) || null; }
    catch (e) { return null; }
  }

  // ---------- handlekurv-panel (header) ----------
  var cartToggle, cartClose, cartOverlay, cartDrawer, cartDrawerBody, cartBadge, drawerTotal, continueShopping;
  var renderCallbacks = [];

  function onRender(fn) { renderCallbacks.push(fn); }

  function renderAll() {
    renderDrawer();
    for (var i = 0; i < renderCallbacks.length; i++) { renderCallbacks[i](); }
  }

  function openCartDrawer() {
    if (cartOverlay) cartOverlay.classList.add('open');
    if (cartDrawer) cartDrawer.classList.add('open');
  }
  function closeCartDrawer() {
    if (cartOverlay) cartOverlay.classList.remove('open');
    if (cartDrawer) cartDrawer.classList.remove('open');
  }

  function renderDrawer() {
    if (!cartBadge) return;

    var count = cartCount();
    cartBadge.textContent = count;
    cartBadge.classList.toggle('hide', count === 0);

    var total = cartTotal();
    if (drawerTotal) drawerTotal.textContent = formatKr(total);

    if (!cartDrawerBody) return;

    if (cart.length === 0) {
      cartDrawerBody.innerHTML = '<p class="cart-empty-msg">Handlekurven er tom.</p>';
      return;
    }

    var html = '';
    for (var j = 0; j < cart.length; j++) {
      var line = cart[j];
      html += '<div class="cart-line">' +
        '<div class="cart-line-info"><b>' + line.qty + ' kort - ' + line.color + '</b>' +
        '<span>' + (line.discountPct >= 0.5 ? Math.round(line.discountPct) + '% avslag' : 'ingen mengderabatt') + '</span></div>' +
        '<div class="cart-line-right"><span class="cart-line-price">' + formatKr(line.lineTotal) + '</span>' +
        '<button type="button" class="cart-line-remove" data-remove-id="' + line.id + '">Fjern</button></div>' +
        '</div>';
    }
    cartDrawerBody.innerHTML = html;
    var removeButtons = cartDrawerBody.querySelectorAll('[data-remove-id]');
    for (var k = 0; k < removeButtons.length; k++) {
      removeButtons[k].addEventListener('click', function () {
        removeFromCart(parseInt(this.dataset.removeId, 10));
      });
    }
  }

  function initHeaderCart() {
    cartToggle = document.getElementById('cartToggle');
    cartClose = document.getElementById('cartClose');
    cartOverlay = document.getElementById('cartOverlay');
    cartDrawer = document.getElementById('cartDrawer');
    cartDrawerBody = document.getElementById('cartDrawerBody');
    cartBadge = document.getElementById('cartBadge');
    drawerTotal = document.getElementById('drawerTotal');
    continueShopping = document.getElementById('continueShopping');

    if (cartToggle) cartToggle.addEventListener('click', openCartDrawer);
    if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);
    if (continueShopping) {
      continueShopping.addEventListener('click', function () {
        closeCartDrawer();
        window.location.href = 'index.html#produkter';
      });
    }

    renderDrawer();
  }

  document.addEventListener('DOMContentLoaded', function () {
    captureReferralFromUrl();
    initHeaderCart();
  });

  return {
    get cart() { return cart; },
    formatKr: formatKr,
    cartTotal: cartTotal,
    cartCount: cartCount,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    getReferralCode: getReferralCode,
    openCartDrawer: openCartDrawer,
    closeCartDrawer: closeCartDrawer,
    onRender: onRender,
    renderAll: renderAll
  };
})();
