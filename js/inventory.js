(function () {
  const session = requireAuth(['admin', 'manager', 'waiter', 'kitchen']);
  if (!session) return;
  renderShell('inventory.html', session);
  setPageTitle('Inventory');

  const canManage = ['admin', 'manager'].includes(session.role);
  let statusFilter = 'all';
  let search = '';

  function render() {
    const content = document.getElementById('page-content');
    const inv = Store.inventory();
    content.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:20px;">
        <div class="card stat-card"><div class="stat-label">Total ingredients</div><div class="stat-value">${inv.length}</div></div>
        <div class="card stat-card"><div class="stat-label">Low stock</div><div class="stat-value" style="color:var(--amber)">${inv.filter(i => inventoryStatus(i) === 'low').length}</div></div>
        <div class="card stat-card"><div class="stat-label">Out of stock</div><div class="stat-value" style="color:var(--danger)">${inv.filter(i => inventoryStatus(i) === 'out').length}</div></div>
      </div>

      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="inv-search" placeholder="Search ingredients...">
          </div>
          <select class="filter-select" id="inv-filter">
            <option value="all">All statuses</option>
            <option value="ok">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
        </div>
        <div class="toolbar-right">
          ${canManage ? `<button class="btn btn-primary" id="add-inv-btn">+ Add Ingredient</button>` : ''}
        </div>
      </div>

      <div class="card">
        <table class="data-table">
          <thead><tr><th>Ingredient</th><th>Quantity</th><th>Threshold</th><th>Status</th><th></th></tr></thead>
          <tbody id="inv-body"></tbody>
        </table>
      </div>`;

    document.getElementById('inv-search').addEventListener('input', (e) => { search = e.target.value; renderTable(); });
    document.getElementById('inv-filter').addEventListener('change', (e) => { statusFilter = e.target.value; renderTable(); });
    if (canManage) document.getElementById('add-inv-btn').addEventListener('click', () => openInvModal());

    renderTable();
  }

  function renderTable() {
    const items = Store.inventory().filter(i =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === 'all' || inventoryStatus(i) === statusFilter)
    ).sort((a, b) => a.name.localeCompare(b.name));

    const body = document.getElementById('inv-body');
    if (!items.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-state">No ingredients match your filters.</div></td></tr>`;
      return;
    }
    body.innerHTML = items.map(i => {
      const s = inventoryStatus(i);
      return `
      <tr>
        <td><strong>${escapeHtml(i.name)}</strong></td>
        <td>${i.quantity} ${i.unit}</td>
        <td>${i.threshold} ${i.unit}</td>
        <td><span class="badge ${s === 'ok' ? 'badge-herb' : s === 'low' ? 'badge-amber' : 'badge-danger'}">${s === 'ok' ? 'In stock' : s === 'low' ? 'Low' : 'Out'}</span></td>
        <td style="text-align:right;">
          ${canManage ? `
            <button class="btn btn-secondary btn-sm" data-restock="${i.id}">+ Restock</button>
            <button class="icon-btn" data-edit="${i.id}" title="Edit">✎</button>
            <button class="icon-btn" data-del="${i.id}" title="Delete">🗑</button>` : ''}
        </td>
      </tr>`;
    }).join('');

    body.querySelectorAll('[data-restock]').forEach(b => b.addEventListener('click', () => restock(b.dataset.restock)));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openInvModal(items.find(i => i.id === b.dataset.edit))));
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteInv(b.dataset.del)));
  }

  function restock(id) {
    const amount = prompt('Add how much stock? (enter a number)');
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    const inv = Store.inventory();
    const item = inv.find(i => i.id === id);
    item.quantity = +(item.quantity + n).toFixed(2);
    Store.saveInventory(inv);
    toast(`${item.name} restocked (+${n} ${item.unit})`, 'success');
    renderTable();
  }

  function deleteInv(id) {
    if (!confirm('Delete this ingredient? Any dish recipes referencing it will keep the reference but it will no longer deduct stock.')) return;
    Store.saveInventory(Store.inventory().filter(i => i.id !== id));
    toast('Ingredient removed', 'success');
    renderTable();
  }

  function openInvModal(item) {
    const modal = openModal(`
      <h3 class="modal-title">${item ? 'Edit ingredient' : 'Add ingredient'}</h3>
      <div class="field"><label>Name</label><input id="iv-name" value="${item ? escapeHtml(item.name) : ''}" required></div>
      <div class="field-row">
        <div class="field"><label>Unit</label><input id="iv-unit" value="${item ? item.unit : ''}" placeholder="kg, l, pcs" required></div>
        <div class="field"><label>Quantity in stock</label><input type="number" step="0.01" min="0" id="iv-qty" value="${item ? item.quantity : ''}" required></div>
      </div>
      <div class="field"><label>Low-stock threshold</label><input type="number" step="0.01" min="0" id="iv-threshold" value="${item ? item.threshold : ''}" required></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="iv-cancel">Cancel</button>
        <button class="btn btn-primary" id="iv-save">${item ? 'Save changes' : 'Add ingredient'}</button>
      </div>`);
    document.getElementById('iv-cancel').addEventListener('click', closeModal);
    document.getElementById('iv-save').addEventListener('click', () => {
      const name = document.getElementById('iv-name').value.trim();
      const unit = document.getElementById('iv-unit').value.trim();
      const quantity = +document.getElementById('iv-qty').value;
      const threshold = +document.getElementById('iv-threshold').value;
      if (!name || !unit || quantity < 0 || threshold < 0) return toast('Please fill in all fields', 'error');
      const inv = Store.inventory();
      if (item) Object.assign(inv.find(i => i.id === item.id), { name, unit, quantity, threshold });
      else inv.push({ id: uid('inv'), name, unit, quantity, threshold });
      Store.saveInventory(inv);
      closeModal();
      toast(item ? 'Ingredient updated' : 'Ingredient added', 'success');
      render();
    });
  }

  render();
  onDataChange(render);
})();
