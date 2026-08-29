/* ============================================================
   app.js — Shared shell logic used by every page:
   auth guard, sidebar navigation, header clock, toasts, helpers
   ============================================================ */

const ROLE_LABEL = {
  admin: 'Administrator',
  manager: 'Manager',
  waiter: 'Waiter',
  kitchen: 'Kitchen Staff'
};

const ROLE_HOME = {
  admin: '../pages/dashboard.html',
  manager: '../pages/dashboard.html',
  waiter: '../pages/tables.html',
  kitchen: '../pages/orders.html'
};

const NAV_LINKS = [
  { href: 'dashboard.html', label: 'Dashboard', icon: 'grid', roles: ['admin', 'manager'] },
  { href: 'tables.html', label: 'Tables', icon: 'layout', roles: ['admin', 'manager', 'waiter'] },
  { href: 'orders.html', label: 'Orders & Kitchen', icon: 'ticket', roles: ['admin', 'manager', 'waiter', 'kitchen'] },
  { href: 'menu.html', label: 'Menu', icon: 'book', roles: ['admin', 'manager', 'waiter', 'kitchen'] },
  { href: 'inventory.html', label: 'Inventory', icon: 'box', roles: ['admin', 'manager', 'waiter', 'kitchen'] },
  { href: 'reports.html', label: 'Reports', icon: 'chart', roles: ['admin', 'manager'] }
];

const ICONS = {
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  layout: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M9 9v11"/>',
  ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 6.5V19.5"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  chart: '<path d="M4 20V10M12 20V4M20 20v-7"/>'
};

/* ---------------------- Auth guard ---------------------- */
function requireAuth(allowedRoles) {
  const inPagesFolder = window.location.pathname.includes('/pages/');
  const session = Store.session();
  if (!session) {
    window.location.href = inPagesFolder ? '../login.html' : 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    alert('Your role (' + ROLE_LABEL[session.role] + ") doesn't have access to this page.");
    const home = ROLE_HOME[session.role]; // e.g. '../pages/dashboard.html'
    window.location.href = inPagesFolder ? home.replace('../pages/', '') : home;
    return null;
  }
  return session;
}

/* ---------------------- Shell: sidebar + header ---------------------- */
function renderShell(activeHref, session) {
  const shell = document.getElementById('app-shell');
  if (!shell) return;

  const links = NAV_LINKS.filter(l => l.roles.includes(session.role)).map(l => `
    <a class="nav-link ${l.href === activeHref ? 'active' : ''}" href="${l.href}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[l.icon]}</svg>
      <span>${l.label}</span>
    </a>`).join('');

  shell.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">
          <img src="../assets/logo/copper-fork-mark.svg" alt="The Copper Fork">
        </span>
        <div class="brand-text">
          <strong>The Copper Fork</strong>
          <small>Restaurant OS</small>
        </div>
      </div>
      <nav class="nav">${links}</nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="avatar">${session.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
          <div>
            <strong>${session.name}</strong>
            <small>${ROLE_LABEL[session.role]}</small>
          </div>
        </div>
        <button class="btn btn-ghost btn-block" id="logout-btn">Log out</button>
      </div>
    </aside>
    <div class="main-col">
      <header class="topbar">
        <div class="topbar-title" id="page-title"></div>
        <div class="topbar-right">
          <span class="live-clock" id="live-clock"></span>
        </div>
      </header>
      <main class="content" id="page-content"></main>
    </div>`;

  document.getElementById('logout-btn').addEventListener('click', () => {
    Store.clearSession();
    window.location.href = '../login.html';
  });

  tickClock();
  setInterval(tickClock, 1000);
}

function tickClock() {
  const el = document.getElementById('live-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    '  •  ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function setPageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
}

/* ---------------------- Toasts ---------------------- */
function toast(message, kind = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = message;
  host.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

/* ---------------------- Modal ---------------------- */
function openModal(innerHtml, opts = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `<div class="modal-box ${opts.wide ? 'modal-wide' : ''}">${innerHtml}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay && !opts.persistent) closeModal(); });
  document.body.appendChild(overlay);
  return overlay;
}
function closeModal() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
}

/* ---------------------- Formatting ---------------------- */
function money(n) {
  const s = Store.settings();
  const amount = Number(n || 0);
  const isTaka = s.currency === '৳';
  return s.currency + (isTaka
    ? Math.round(amount).toLocaleString('en-US')
    : amount.toFixed(2));
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  return Math.floor(diff / 3600) + 'h ago';
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------------------- Cross-tab / live refresh ---------------------- */
function onDataChange(cb) {
  window.addEventListener('storage', cb);
  const interval = setInterval(cb, 4000);
  window.addEventListener('beforeunload', () => clearInterval(interval));
}
