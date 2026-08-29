(function () {
  const session = requireAuth(['admin', 'manager']);
  if (!session) return;
  renderShell('dashboard.html', session);
  setPageTitle('Dashboard');

  function isToday(iso) {
    const d = new Date(iso), n = new Date();
    return d.toDateString() === n.toDateString();
  }

  function render() {
    const orders = Store.orders();
    const invoices = Store.invoices();
    const tables = Store.tables();
    const inventory = Store.inventory();

    const salesToday = invoices.filter(i => isToday(i.createdAt)).reduce((s, i) => s + i.total, 0);
    const ordersToday = orders.filter(o => isToday(o.createdAt)).length;
    const available = tables.filter(t => t.status === 'available').length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const reserved = tables.filter(t => t.status === 'reserved').length;
    const pending = orders.filter(o => ['pending', 'cooking', 'ready'].includes(o.status)).length;
    const lowStock = inventory.filter(i => inventoryStatus(i) !== 'ok');

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="grid grid-4">
        <div class="card stat-card">
          <div class="stat-label">Sales Today <span class="stat-icon sales"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span></div>
          <div class="stat-value">${money(salesToday)}</div>
          <div class="stat-sub">${invoices.filter(i => isToday(i.createdAt)).length} invoices billed</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Orders Today <span class="stat-icon orders"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/></svg></span></div>
          <div class="stat-value">${ordersToday}</div>
          <div class="stat-sub">${pending} currently pending</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Tables <span class="stat-icon tables"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/></svg></span></div>
          <div class="stat-value">${available}/${tables.length} <span style="font-size:14px;color:var(--muted);font-family:var(--font-body)">free</span></div>
          <div class="stat-sub">${occupied} occupied · ${reserved} reserved</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Inventory Alerts <span class="stat-icon stock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.7 3.86a2 2 0 0 0-3.4 0z"/></svg></span></div>
          <div class="stat-value">${lowStock.length}</div>
          <div class="stat-sub">${inventory.filter(i => inventoryStatus(i) === 'out').length} out of stock</div>
        </div>
      </div>

      <div class="dash-row">
        <div class="card">
          <div class="card-header"><h3>Revenue — last 7 days</h3></div>
          <div class="bar-chart" id="bar-chart"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Low stock &amp; out of stock</h3></div>
          <ul class="alert-list" id="alert-list"></ul>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-header">
          <h3>Recent orders</h3>
          <a href="orders.html" class="btn btn-secondary btn-sm">View all</a>
        </div>
        <table class="data-table">
          <thead><tr><th>Ticket</th><th>Table</th><th>Items</th><th>Status</th><th>Placed</th></tr></thead>
          <tbody id="recent-orders-body"></tbody>
        </table>
      </div>`;

    renderBarChart(invoices);
    renderAlerts(lowStock);
    renderRecentOrders(orders, tables);
  }

  function renderBarChart(invoices) {
    const el = document.getElementById('bar-chart');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const totals = days.map(d => invoices.filter(inv => new Date(inv.createdAt).toDateString() === d.toDateString()).reduce((s, i) => s + i.total, 0));
    const max = Math.max(...totals, 1);
    el.innerHTML = days.map((d, idx) => `
      <div class="bar-col">
        <span class="bar-val">${totals[idx] > 0 ? money(totals[idx]) : ''}</span>
        <div class="bar" style="height:${Math.max(4, (totals[idx] / max) * 100)}%"></div>
        <span class="bar-label">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
      </div>`).join('');
  }

  function renderAlerts(items) {
    const el = document.getElementById('alert-list');
    if (!items.length) {
      el.innerHTML = `<li class="alert-row"><span class="name">All ingredients well stocked</span></li>`;
      return;
    }
    el.innerHTML = items.slice(0, 8).map(i => `
      <li class="alert-row">
        <span class="name">${escapeHtml(i.name)}</span>
        <span style="display:flex;align-items:center;gap:8px;">
          <span class="qty">${i.quantity}${i.unit} left</span>
          <span class="badge ${inventoryStatus(i) === 'out' ? 'badge-danger' : 'badge-amber'}">${inventoryStatus(i) === 'out' ? 'Out' : 'Low'}</span>
        </span>
      </li>`).join('');
  }

  function renderRecentOrders(orders, tables) {
    const tableMap = {};
    tables.forEach(t => tableMap[t.id] = t.number);
    const body = document.getElementById('recent-orders-body');
    const recent = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
    if (!recent.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state">No orders placed yet today.</div></td></tr>`;
      return;
    }
    body.innerHTML = recent.map(o => `
      <tr>
        <td style="font-family:var(--font-mono)">#${o.id.slice(-5).toUpperCase()}</td>
        <td>Table ${tableMap[o.tableId] || '—'}</td>
        <td>${o.items.reduce((s, i) => s + i.qty, 0)} items</td>
        <td><span class="badge ${statusBadge(o.status)}">${o.status}</span></td>
        <td>${timeAgo(o.createdAt)}</td>
      </tr>`).join('');
  }

  function statusBadge(status) {
    return { pending: 'badge-danger', cooking: 'badge-amber', ready: 'badge-steel', served: 'badge-herb', billed: 'badge-muted' }[status] || 'badge-muted';
  }

  render();
  onDataChange(render);
})();
