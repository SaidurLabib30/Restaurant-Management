(function () {
  const session = requireAuth(['admin', 'manager']);
  if (!session) return;
  renderShell('reports.html', session);
  setPageTitle('Sales Reports');

  let range = 'week'; // today | week | month | custom
  let customFrom = null, customTo = null;

  function rangeDates() {
    const now = new Date();
    let from, to = new Date(now);
    to.setHours(23, 59, 59, 999);
    if (range === 'today') { from = new Date(now); from.setHours(0, 0, 0, 0); }
    else if (range === 'week') { from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); }
    else if (range === 'month') { from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0); }
    else { from = customFrom ? new Date(customFrom) : new Date(now.setDate(now.getDate() - 6)); to = customTo ? new Date(customTo) : new Date(); to.setHours(23, 59, 59, 999); }
    return { from, to };
  }

  function render() {
    const { from, to } = rangeDates();
    const invoices = Store.invoices().filter(i => {
      const d = new Date(i.createdAt);
      return d >= from && d <= to;
    });

    const revenue = invoices.reduce((s, i) => s + i.total, 0);
    const avgOrder = invoices.length ? revenue / invoices.length : 0;

    const itemTotals = {};
    invoices.forEach(inv => inv.items.forEach(it => {
      itemTotals[it.name] = (itemTotals[it.name] || 0) + it.qty;
    }));
    const topItems = Object.entries(itemTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxQty = topItems.length ? topItems[0][1] : 1;

    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <select class="filter-select" id="range-select">
            <option value="today" ${range === 'today' ? 'selected' : ''}>Today</option>
            <option value="week" ${range === 'week' ? 'selected' : ''}>Last 7 days</option>
            <option value="month" ${range === 'month' ? 'selected' : ''}>Last 30 days</option>
            <option value="custom" ${range === 'custom' ? 'selected' : ''}>Custom range</option>
          </select>
          ${range === 'custom' ? `
            <input type="date" id="from-date" value="${customFrom || ''}">
            <span style="color:var(--muted)">to</span>
            <input type="date" id="to-date" value="${customTo || ''}">
          ` : ''}
        </div>
      </div>

      <div class="grid grid-3">
        <div class="card stat-card"><div class="stat-label">Total revenue</div><div class="stat-value">${money(revenue)}</div><div class="stat-sub">${from.toLocaleDateString()} – ${to.toLocaleDateString()}</div></div>
        <div class="card stat-card"><div class="stat-label">Orders billed</div><div class="stat-value">${invoices.length}</div></div>
        <div class="card stat-card"><div class="stat-label">Average order value</div><div class="stat-value">${money(avgOrder)}</div></div>
      </div>

      <div class="dash-row">
        <div class="card">
          <div class="card-header"><h3>Revenue by day</h3></div>
          <div class="bar-chart" id="rep-bar-chart"></div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Top-selling dishes</h3></div>
          <ul class="rank-list" id="rank-list"></ul>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="card-header"><h3>Invoice log</h3></div>
        <table class="data-table">
          <thead><tr><th>Invoice</th><th>Table</th><th>Waiter</th><th>Payment</th><th>Total</th><th>Date</th></tr></thead>
          <tbody id="invoice-body"></tbody>
        </table>
      </div>`;

    document.getElementById('range-select').addEventListener('change', (e) => { range = e.target.value; render(); });
    if (range === 'custom') {
      document.getElementById('from-date').addEventListener('change', (e) => { customFrom = e.target.value; render(); });
      document.getElementById('to-date').addEventListener('change', (e) => { customTo = e.target.value; render(); });
    }

    renderDailyBars(invoices, from, to);
    renderTopItems(topItems, maxQty);
    renderInvoiceLog(invoices);
  }

  function renderDailyBars(invoices, from, to) {
    const el = document.getElementById('rep-bar-chart');
    const days = [];
    const cursor = new Date(from);
    while (cursor <= to && days.length < 31) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    const totals = days.map(d => invoices.filter(i => new Date(i.createdAt).toDateString() === d.toDateString()).reduce((s, i) => s + i.total, 0));
    const max = Math.max(...totals, 1);
    el.innerHTML = days.map((d, idx) => `
      <div class="bar-col">
        <span class="bar-val">${totals[idx] > 0 ? money(totals[idx]) : ''}</span>
        <div class="bar" style="height:${Math.max(4, (totals[idx] / max) * 100)}%"></div>
        <span class="bar-label">${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
      </div>`).join('');
  }

  function renderTopItems(topItems, maxQty) {
    const el = document.getElementById('rank-list');
    if (!topItems.length) { el.innerHTML = `<div class="empty-state">No sales in this range yet.</div>`; return; }
    el.innerHTML = topItems.map(([name, qty], idx) => `
      <li class="rank-row">
        <span class="rank-num">${idx + 1}</span>
        <span style="width:120px;font-size:13px;">${escapeHtml(name)}</span>
        <span class="rank-bar-track"><span class="rank-bar-fill" style="width:${(qty / maxQty) * 100}%"></span></span>
        <span class="rank-val">${qty} sold</span>
      </li>`).join('');
  }

  function renderInvoiceLog(invoices) {
    const body = document.getElementById('invoice-body');
    const tables = Store.tables();
    const tableMap = {}; tables.forEach(t => tableMap[t.id] = t.number);
    const sorted = [...invoices].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!sorted.length) { body.innerHTML = `<tr><td colspan="6"><div class="empty-state">No invoices in this range.</div></td></tr>`; return; }
    body.innerHTML = sorted.map(i => `
      <tr>
        <td style="font-family:var(--font-mono)">#${i.id.slice(-5).toUpperCase()}</td>
        <td>Table ${tableMap[i.tableId] || '—'}</td>
        <td>${escapeHtml(i.waiterName || '—')}</td>
        <td>${i.paymentMethod}</td>
        <td>${money(i.total)}</td>
        <td>${fmtDateTime(i.createdAt)}</td>
      </tr>`).join('');
  }

  render();
  onDataChange(render);
})();
