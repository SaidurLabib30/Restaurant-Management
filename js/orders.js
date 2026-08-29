(function () {
  const session = requireAuth(['admin', 'manager', 'waiter', 'kitchen']);
  if (!session) return;
  renderShell('orders.html', session);

  const isKitchenOnly = session.role === 'kitchen';
  const isWaiterOnly = session.role === 'waiter';
  const canSeeBoth = ['admin', 'manager'].includes(session.role);
  let activeTab = isKitchenOnly ? 'kitchen' : 'foh';
  let statusFilter = 'active';
  let cart = []; // { menuItemId, name, price, qty }
  let editingOrderId = null; // when adding items to an existing order

  setPageTitle(isKitchenOnly ? 'Kitchen Display' : 'Orders & Kitchen');

  function render() {
    const content = document.getElementById('page-content');
    let tabsHtml = '';
    if (canSeeBoth) {
      tabsHtml = `
        <div class="tabs">
          <button class="tab-btn ${activeTab === 'foh' ? 'active' : ''}" data-tab="foh">Front of House</button>
          <button class="tab-btn ${activeTab === 'kitchen' ? 'active' : ''}" data-tab="kitchen">Kitchen Display</button>
        </div>`;
    }
    content.innerHTML = `${tabsHtml}<div id="tab-body"></div>`;
    if (canSeeBoth) {
      content.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; render(); }));
    }
    if (isKitchenOnly || activeTab === 'kitchen') return renderKitchenBoard();
    renderFOH();
  }

  /* ---------------------- Front of house ---------------------- */
  function renderFOH() {
    const body = document.getElementById('tab-body');
    const tables = Store.tables();
    const tableMap = {}; tables.forEach(t => tableMap[t.id] = t.number);
    let orders = Store.orders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (statusFilter === 'active') orders = orders.filter(o => o.status !== 'billed');
    else if (statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);

    body.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <select class="filter-select" id="status-filter">
            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active orders</option>
            <option value="pending" ${statusFilter === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="cooking" ${statusFilter === 'cooking' ? 'selected' : ''}>Cooking</option>
            <option value="ready" ${statusFilter === 'ready' ? 'selected' : ''}>Ready</option>
            <option value="served" ${statusFilter === 'served' ? 'selected' : ''}>Served (awaiting bill)</option>
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All orders</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" id="new-order-btn">+ New Order</button>
        </div>
      </div>
      <div class="order-list" id="order-list"></div>`;

    document.getElementById('status-filter').addEventListener('change', (e) => { statusFilter = e.target.value; renderFOH(); });
    document.getElementById('new-order-btn').addEventListener('click', () => openOrderBuilder());

    const list = document.getElementById('order-list');
    if (!orders.length) {
      list.innerHTML = `<div class="empty-state"><h4>No orders here</h4><p>Start a new order from an available table.</p></div>`;
      return;
    }
    list.innerHTML = orders.map(o => orderCardHtml(o, tableMap)).join('');
    list.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleOrderAction(btn.dataset.action, btn.dataset.id)));
  }

  function orderCardHtml(o, tableMap) {
    const subtotal = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const itemsSummary = o.items.map(i => `${i.qty}× ${i.name}`).join(', ');
    return `
      <div class="order-card">
        <div>
          <div style="display:flex;align-items:center;gap:10px;">
            <strong style="font-family:var(--font-mono)">#${o.id.slice(-5).toUpperCase()}</strong>
            <span>Table ${tableMap[o.tableId] || '—'}</span>
            <span class="badge ${statusBadge(o.status)}">${o.status}</span>
          </div>
          <div class="items-line">${escapeHtml(itemsSummary)} &nbsp;·&nbsp; ${money(subtotal)} &nbsp;·&nbsp; ${timeAgo(o.createdAt)}</div>
        </div>
        <div class="actions">${fohActions(o)}</div>
      </div>`;
  }

  function fohActions(o) {
    let html = '';
    if (['pending', 'cooking'].includes(o.status)) {
      html += `<button class="btn btn-secondary btn-sm" data-action="add-items" data-id="${o.id}">Add Items</button>`;
      if (['admin', 'manager'].includes(session.role)) html += `<button class="btn btn-danger btn-sm" data-action="cancel" data-id="${o.id}">Cancel</button>`;
    }
    if (o.status === 'ready') html += `<button class="btn btn-primary btn-sm" data-action="serve" data-id="${o.id}">Mark Served</button>`;
    if (o.status === 'served') html += `<button class="btn btn-primary btn-sm" data-action="bill" data-id="${o.id}">Generate Bill</button>`;
    if (o.status === 'billed') html += `<span class="badge badge-muted">Paid</span>`;
    return html;
  }

  function statusBadge(status) {
    return { pending: 'badge-danger', cooking: 'badge-amber', ready: 'badge-steel', served: 'badge-herb', billed: 'badge-muted' }[status] || 'badge-muted';
  }

  function handleOrderAction(action, id) {
    const orders = Store.orders();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (action === 'add-items') return openOrderBuilder(order);
    if (action === 'serve') { order.status = 'served'; order.updatedAt = new Date().toISOString(); Store.saveOrders(orders); toast('Order marked served'); render(); return; }
    if (action === 'bill') return openInvoiceModal(order);
    if (action === 'cancel') {
      if (!confirm('Cancel this order and restock its ingredients?')) return;
      restockInventoryForItems(order.items);
      const tables = Store.tables();
      const t = tables.find(x => x.id === order.tableId);
      if (t) { t.status = 'available'; t.currentOrderId = null; Store.saveTables(tables); }
      Store.saveOrders(orders.filter(o => o.id !== id));
      toast('Order cancelled', 'success');
      render();
    }
  }

  function restockInventoryForItems(items) {
    const inv = Store.inventory();
    const invMap = {}; inv.forEach(i => invMap[i.id] = i);
    const menu = Store.menu();
    const menuMap = {}; menu.forEach(m => menuMap[m.id] = m);
    items.forEach(oi => {
      const mi = menuMap[oi.menuItemId];
      if (!mi || !mi.recipe) return;
      mi.recipe.forEach(r => {
        const invItem = invMap[r.inventoryId];
        if (invItem) invItem.quantity = +(invItem.quantity + r.qty * oi.qty).toFixed(2);
      });
    });
    Store.saveInventory(inv);
  }

  /* ---------------------- Kitchen board ---------------------- */
  function renderKitchenBoard() {
    const body = document.getElementById('tab-body');
    const tables = Store.tables();
    const tableMap = {}; tables.forEach(t => tableMap[t.id] = t.number);
    const orders = Store.orders();
    const columns = [
      { key: 'pending', label: 'Pending' },
      { key: 'cooking', label: 'Cooking' },
      { key: 'ready', label: 'Ready' },
      { key: 'served', label: 'Served' }
    ];
    body.innerHTML = `<div class="kitchen-board">${columns.map(c => `
      <div>
        <div class="kitchen-col-head"><span>${c.label}</span><span class="badge ${statusBadge(c.key)}">${orders.filter(o => o.status === c.key).length}</span></div>
        <div class="kitchen-col" id="col-${c.key}"></div>
      </div>`).join('')}</div>`;

    columns.forEach(c => {
      let colOrders = orders.filter(o => o.status === c.key).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (c.key === 'served') colOrders = colOrders.slice(0, 5);
      const col = document.getElementById('col-' + c.key);
      if (!colOrders.length) { col.innerHTML = `<p style="font-size:12.5px;color:var(--muted);">No tickets</p>`; return; }
      col.innerHTML = colOrders.map(o => ticketHtml(o, tableMap)).join('');
      col.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => advanceKitchenStatus(btn.dataset.id, btn.dataset.action)));
    });
  }

  function ticketHtml(o, tableMap) {
    const canAdvance = ['admin', 'manager', 'kitchen'].includes(session.role);
    let action = '';
    if (o.status === 'pending' && canAdvance) action = `<button class="btn btn-primary btn-sm" data-action="cooking" data-id="${o.id}">Start Cooking</button>`;
    if (o.status === 'cooking' && canAdvance) action = `<button class="btn btn-primary btn-sm" data-action="ready" data-id="${o.id}">Mark Ready</button>`;
    if (o.status === 'ready') action = `<span class="badge badge-steel">Waiting for pickup</span>`;
    return `
      <div class="ticket">
        <div class="ticket-head"><strong>Table ${tableMap[o.tableId] || '—'}</strong><span>#${o.id.slice(-5).toUpperCase()} · ${timeAgo(o.createdAt)}</span></div>
        <ul class="ticket-items">
          ${o.items.map(i => `<li><span><span class="qty">${i.qty}×</span>${escapeHtml(i.name)}</span></li>`).join('')}
        </ul>
        <div class="ticket-footer">
          <span class="ticket-status ${o.status}">${o.status}</span>
          ${action}
        </div>
      </div>`;
  }

  function advanceKitchenStatus(id, newStatus) {
    const orders = Store.orders();
    const order = orders.find(o => o.id === id);
    if (!order) return;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    Store.saveOrders(orders);
    toast(`Ticket #${id.slice(-5).toUpperCase()} → ${newStatus}`, 'success');
    render();
  }

  /* ---------------------- Order builder (new / add items) ---------------------- */
  function openOrderBuilder(existingOrder, presetTableId) {
    cart = [];
    editingOrderId = existingOrder ? existingOrder.id : null;
    const tables = Store.tables();
    const availableTables = tables.filter(t => t.status === 'available' || t.id === presetTableId || (existingOrder && t.id === existingOrder.tableId));
    const menu = Store.menu().filter(m => m.status === 'available');
    const categories = ['All', ...new Set(menu.map(m => m.category))];

    const tableSelectHtml = existingOrder
      ? `<p style="font-size:13px;color:var(--muted);margin-bottom:14px;">Adding items to Table ${tables.find(t => t.id === existingOrder.tableId)?.number} · Ticket #${existingOrder.id.slice(-5).toUpperCase()}</p>`
      : `<div class="field"><label>Table</label>
          <select id="ob-table">
            ${availableTables.map(t => `<option value="${t.id}" ${t.id === presetTableId ? 'selected' : ''}>Table ${t.number} (seats ${t.capacity})</option>`).join('') || '<option disabled>No available tables</option>'}
          </select></div>`;

    const modal = openModal(`
      <h3 class="modal-title">${existingOrder ? 'Add items to order' : 'New order'}</h3>
      ${tableSelectHtml}
      <div class="field">
        <label>Search menu</label>
        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="ob-search" placeholder="Search dishes...">
        </div>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1">
          <select class="filter-select" id="ob-category" style="width:100%">
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="menu-pick-list" id="ob-menu-list"></div>

      <h4 style="margin-top:18px;font-size:14px;">Order cart</h4>
      <ul class="cart-list" id="ob-cart-list"></ul>
      <div style="display:flex;justify-content:space-between;font-weight:700;padding-top:10px;">
        <span>Subtotal</span><span id="ob-subtotal">$0.00</span>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="ob-cancel">Cancel</button>
        <button class="btn btn-primary" id="ob-submit">${existingOrder ? 'Add to order' : 'Send to kitchen'}</button>
      </div>`, { wide: true });

    function drawMenuList() {
      const search = (document.getElementById('ob-search').value || '').toLowerCase();
      const cat = document.getElementById('ob-category').value;
      const filtered = menu.filter(m => (cat === 'All' || m.category === cat) && m.name.toLowerCase().includes(search));
      const listEl = document.getElementById('ob-menu-list');
      listEl.innerHTML = filtered.map(m => `
        <div class="menu-pick-item">
          <div><div class="mi-name">${escapeHtml(m.name)}</div><div class="mi-price">${money(m.price)} · ${m.category}</div></div>
          <button class="btn btn-secondary btn-sm" data-add="${m.id}">Add</button>
        </div>`).join('') || `<p style="font-size:13px;color:var(--muted)">No dishes match.</p>`;
      listEl.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add)));
    }

    function addToCart(menuItemId) {
      const m = menu.find(x => x.id === menuItemId);
      if (!m) return;
      const existing = cart.find(c => c.menuItemId === menuItemId);
      if (existing) existing.qty += 1;
      else cart.push({ menuItemId, name: m.name, price: m.price, qty: 1 });
      drawCart();
    }

    function drawCart() {
      const el = document.getElementById('ob-cart-list');
      if (!cart.length) {
        el.innerHTML = `<li style="color:var(--muted);border:none;">Cart is empty — add dishes above.</li>`;
      } else {
        el.innerHTML = cart.map((c, idx) => `
          <li>
            <span>${escapeHtml(c.name)}</span>
            <span class="stepper">
              <button data-dec="${idx}">−</button>
              <span>${c.qty}</span>
              <button data-inc="${idx}">+</button>
              <span style="width:56px;text-align:right;font-family:var(--font-mono)">${money(c.price * c.qty)}</span>
            </span>
          </li>`).join('');
        el.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => { cart[+b.dataset.inc].qty++; drawCart(); }));
        el.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
          const i = +b.dataset.dec; cart[i].qty--; if (cart[i].qty <= 0) cart.splice(i, 1); drawCart();
        }));
      }
      document.getElementById('ob-subtotal').textContent = money(cart.reduce((s, c) => s + c.price * c.qty, 0));
    }

    document.getElementById('ob-search').addEventListener('input', drawMenuList);
    document.getElementById('ob-category').addEventListener('change', drawMenuList);
    document.getElementById('ob-cancel').addEventListener('click', closeModal);
    document.getElementById('ob-submit').addEventListener('click', () => submitOrder(existingOrder));

    drawMenuList();
    drawCart();
  }

  function submitOrder(existingOrder) {
    if (!cart.length) return toast('Add at least one item to the order', 'error');
    const orders = Store.orders();
    const tables = Store.tables();

    if (existingOrder) {
      const order = orders.find(o => o.id === existingOrder.id);
      cart.forEach(c => {
        const line = order.items.find(i => i.menuItemId === c.menuItemId);
        if (line) line.qty += c.qty; else order.items.push({ ...c });
      });
      order.updatedAt = new Date().toISOString();
      deductInventoryForItems(cart);
      Store.saveOrders(orders);
      toast('Items added to order', 'success');
    } else {
      const tableId = document.getElementById('ob-table').value;
      if (!tableId) return toast('Please choose a table', 'error');
      const newOrder = {
        id: uid('o'),
        tableId,
        waiterId: session.id,
        waiterName: session.name,
        items: cart.map(c => ({ ...c })),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      orders.push(newOrder);
      Store.saveOrders(orders);
      deductInventoryForItems(newOrder.items);
      const t = tables.find(x => x.id === tableId);
      if (t) { t.status = 'occupied'; t.currentOrderId = newOrder.id; Store.saveTables(tables); }
      toast('Order sent to kitchen', 'success');
    }
    closeModal();
    render();
  }

  /* ---------------------- Invoice / billing ---------------------- */
  function openInvoiceModal(order) {
    const settings = Store.settings();
    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * settings.taxRate;
    const total = subtotal + tax;
    const tables = Store.tables();
    const tableNumber = tables.find(t => t.id === order.tableId)?.number;

    const modal = openModal(`
      <h3 class="modal-title">Bill — Table ${tableNumber}</h3>
      <ul class="cart-list">
        ${order.items.map(i => `<li><span>${i.qty}× ${escapeHtml(i.name)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}
      </ul>
      <div style="padding-top:10px;font-size:13.5px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>${money(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;color:var(--muted);"><span>Tax (${(settings.taxRate * 100).toFixed(0)}%)</span><span>${money(tax)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;border-top:1px solid var(--line);padding-top:8px;"><span>Total</span><span>${money(total)}</span></div>
      </div>
      <div class="field" style="margin-top:16px;">
        <label>Payment method</label>
        <select id="inv-payment">
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="Mobile Payment">Mobile Payment</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="inv-cancel">Cancel</button>
        <button class="btn btn-primary" id="inv-confirm">Confirm &amp; Close Bill</button>
      </div>`);

    document.getElementById('inv-cancel').addEventListener('click', closeModal);
    document.getElementById('inv-confirm').addEventListener('click', () => {
      const invoices = Store.invoices();
      const invoice = {
        id: uid('inv'),
        orderId: order.id,
        tableId: order.tableId,
        items: order.items,
        subtotal, tax, total,
        paymentMethod: document.getElementById('inv-payment').value,
        waiterName: order.waiterName,
        createdAt: new Date().toISOString()
      };
      invoices.push(invoice);
      Store.saveInvoices(invoices);

      const orders = Store.orders();
      const o = orders.find(x => x.id === order.id);
      o.status = 'billed';
      Store.saveOrders(orders);

      const tables = Store.tables();
      const t = tables.find(x => x.id === order.tableId);
      if (t) { t.status = 'available'; t.currentOrderId = null; }
      Store.saveTables(tables);

      closeModal();
      toast('Invoice generated — table cleared', 'success');
      render();
    });
  }

  /* ---------------------- Boot ---------------------- */
  const params = new URLSearchParams(window.location.search);
  render();
  if (params.get('new') === '1' && params.get('table')) {
    setTimeout(() => openOrderBuilder(null, params.get('table')), 50);
    history.replaceState({}, '', 'orders.html');
  }
  onDataChange(render);
})();
