(function () {
  const session = requireAuth(['admin', 'manager', 'waiter']);
  if (!session) return;
  renderShell('tables.html', session);
  setPageTitle('Tables');

  const canManage = ['admin', 'manager'].includes(session.role);

  function render() {
    const tables = Store.tables().sort((a, b) => a.number - b.number);
    const orders = Store.orders();
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="badge badge-herb">${tables.filter(t => t.status === 'available').length} available</span>
          <span class="badge badge-danger">${tables.filter(t => t.status === 'occupied').length} occupied</span>
          <span class="badge badge-steel">${tables.filter(t => t.status === 'reserved').length} reserved</span>
        </div>
        <div class="toolbar-right">
          ${canManage ? `<button class="btn btn-primary" id="add-table-btn">+ Add Table</button>` : ''}
        </div>
      </div>
      <div class="tables-grid" id="tables-grid"></div>`;

    const grid = document.getElementById('tables-grid');
    grid.innerHTML = tables.map(t => {
      const activeOrder = orders.find(o => o.id === t.currentOrderId && o.status !== 'billed');
      return `
      <div class="table-card ${t.status}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="t-number">Table ${t.number}</div>
            <div class="t-cap">Seats ${t.capacity}</div>
          </div>
          <span class="badge ${t.status === 'available' ? 'badge-herb' : t.status === 'occupied' ? 'badge-danger' : 'badge-steel'}">${t.status}</span>
        </div>
        ${activeOrder ? `<div style="font-size:12px;color:var(--muted);font-family:var(--font-mono)">Ticket #${activeOrder.id.slice(-5).toUpperCase()} · ${activeOrder.status}</div>` : ''}
        <div class="t-actions">
          ${actionButtons(t, activeOrder)}
        </div>
      </div>`;
    }).join('') || `<div class="empty-state">No tables set up yet.</div>`;

    if (canManage) document.getElementById('add-table-btn').addEventListener('click', openAddTable);
    grid.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id)));
  }

  function actionButtons(t, activeOrder) {
    let html = '';
    if (t.status === 'available') {
      html += `<button class="btn btn-primary btn-sm" data-action="seat" data-id="${t.id}">Seat &amp; Start Order</button>`;
      html += `<button class="btn btn-secondary btn-sm" data-action="reserve" data-id="${t.id}">Mark Reserved</button>`;
    } else if (t.status === 'reserved') {
      html += `<button class="btn btn-primary btn-sm" data-action="seat" data-id="${t.id}">Seat Now</button>`;
      html += `<button class="btn btn-secondary btn-sm" data-action="unreserve" data-id="${t.id}">Cancel Reservation</button>`;
    } else if (t.status === 'occupied') {
      html += `<a class="btn btn-secondary btn-sm" href="orders.html?table=${t.id}">View Order</a>`;
      if (!activeOrder) html += `<button class="btn btn-primary btn-sm" data-action="free" data-id="${t.id}">Clear Table</button>`;
    }
    if (canManage && t.status === 'available') {
      html += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}">Remove Table</button>`;
    }
    return html;
  }

  function handleAction(action, id) {
    const tables = Store.tables();
    const t = tables.find(x => x.id === id);
    if (!t) return;

    if (action === 'seat') {
      t.status = 'occupied';
      Store.saveTables(tables);
      window.location.href = `orders.html?table=${t.id}&new=1`;
      return;
    }
    if (action === 'reserve') { t.status = 'reserved'; toast(`Table ${t.number} marked reserved`, 'success'); }
    if (action === 'unreserve') { t.status = 'available'; toast(`Reservation cancelled for Table ${t.number}`); }
    if (action === 'free') { t.status = 'available'; t.currentOrderId = null; toast(`Table ${t.number} cleared`); }
    if (action === 'delete') {
      if (!confirm(`Remove Table ${t.number}? This cannot be undone.`)) return;
      Store.saveTables(tables.filter(x => x.id !== id));
      render();
      return;
    }
    Store.saveTables(tables);
    render();
  }

  function openAddTable() {
    const modal = openModal(`
      <h3 class="modal-title">Add table</h3>
      <div class="field"><label>Table number</label><input type="number" id="nt-number" min="1" required></div>
      <div class="field"><label>Seating capacity</label><input type="number" id="nt-capacity" min="1" value="4" required></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="save-btn">Add table</button>
      </div>`);
    modal.querySelector('#cancel-btn').addEventListener('click', closeModal);
    modal.querySelector('#save-btn').addEventListener('click', () => {
      const number = +document.getElementById('nt-number').value;
      const capacity = +document.getElementById('nt-capacity').value;
      if (!number || !capacity) return toast('Please fill in both fields', 'error');
      const tables = Store.tables();
      if (tables.some(t => t.number === number)) return toast('That table number already exists', 'error');
      tables.push({ id: uid('t'), number, capacity, status: 'available', currentOrderId: null });
      Store.saveTables(tables);
      closeModal();
      toast(`Table ${number} added`, 'success');
      render();
    });
  }

  render();
  onDataChange(render);
})();
