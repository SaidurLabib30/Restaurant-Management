(function () {
  const session = requireAuth(['admin', 'manager', 'waiter', 'kitchen']);
  if (!session) return;

  renderShell('menu.html', session);
  setPageTitle('Menu Management');

  const canManage = ['admin', 'manager'].includes(session.role);
  let search = '';
  let category = 'All';
  let recipeRows = [];

  /*
   * Convert stored image paths into reliable browser paths.
   *
   * Example:
   * ../assets/images/0.jpg
   *
   * becomes:
   * /assets/images/0.jpg
   */
  function getImagePath(imagePath) {
    if (!imagePath) return '';

    // Already a Base64 image
    if (imagePath.startsWith('data:image/')) {
      return imagePath;
    }

    // Already an absolute URL
    if (
      imagePath.startsWith('http://') ||
      imagePath.startsWith('https://') ||
      imagePath.startsWith('/')
    ) {
      return imagePath;
    }

    // Convert relative path based on the current page URL
    try {
      return new URL(imagePath, window.location.href).href;
    } catch (error) {
      console.error('Invalid image path:', imagePath, error);
      return imagePath;
    }
  }

  function render() {
    const menu = Store.menu();
    const categories = ['All', ...new Set(menu.map(m => m.category))];
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">

          <div class="search-bar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="7"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>

            <input
              type="text"
              id="menu-search"
              placeholder="Search dishes..."
              value="${escapeHtml(search)}"
            >
          </div>

          <select class="filter-select" id="menu-cat">
            ${categories.map(c => `
              <option
                value="${escapeHtml(c)}"
                ${c === category ? 'selected' : ''}
              >
                ${escapeHtml(c)}
              </option>
            `).join('')}
          </select>

        </div>

        <div class="toolbar-right">
          ${
            canManage
              ? `<button class="btn btn-primary" id="add-item-btn">
                   + Add Dish
                 </button>`
              : ''
          }
        </div>
      </div>

      <div class="menu-grid" id="menu-grid"></div>
    `;

    document
      .getElementById('menu-search')
      .addEventListener('input', (e) => {
        search = e.target.value;
        renderGrid();
      });

    document
      .getElementById('menu-cat')
      .addEventListener('change', (e) => {
        category = e.target.value;
        renderGrid();
      });

    if (canManage) {
      document
        .getElementById('add-item-btn')
        .addEventListener('click', () => openItemModal());
    }

    renderGrid();
  }

  function renderGrid() {
    const menu = Store.menu().filter(m =>
      (category === 'All' || m.category === category) &&
      m.name.toLowerCase().includes(search.toLowerCase())
    );

    const grid = document.getElementById('menu-grid');

    if (!menu.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h4>No dishes found</h4>
          <p>Try a different search or category.</p>
        </div>
      `;

      return;
    }

    grid.innerHTML = menu.map(m => {

      const imagePath = getImagePath(m.image);

      return `
        <div class="menu-item-card status-${m.status === 'available' ? 'available' : 'unavailable'}">

          <div class="mi-photo">

            ${
              imagePath
                ? `
                  <img
                    src="${imagePath}"
                    alt="${escapeHtml(m.name)}"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                  >

                  <span
                    class="mi-photo-fallback"
                    style="display:none;"
                  >
                    ${escapeHtml(m.name.charAt(0))}
                  </span>
                `
                : `
                  <span class="mi-photo-fallback">
                    ${escapeHtml(m.name.charAt(0))}
                  </span>
                `
            }

          </div>

          <div class="mi-top">

            <div>
              <strong>
                ${escapeHtml(m.name)}
              </strong>

              <div
                style="font-size:11.5px;color:var(--muted);"
              >
                ${escapeHtml(m.category)}
              </div>
            </div>

            <span class="mi-price">
              ${money(m.price)}
            </span>

          </div>

          <div class="mi-desc">
            ${escapeHtml(m.description || '')}
          </div>

          <div class="mi-foot">

            <span
              class="badge ${
                m.status === 'available'
                  ? 'badge-herb'
                  : 'badge-muted'
              }"
            >
              ${escapeHtml(m.status)}
            </span>

            ${
              canManage
                ? `
                  <span style="display:flex;gap:6px;">

                    <button
                      class="icon-btn"
                      data-edit="${m.id}"
                      title="Edit"
                    >
                      ✎
                    </button>

                    <button
                      class="icon-btn"
                      data-del="${m.id}"
                      title="Delete"
                    >
                      🗑
                    </button>

                  </span>
                `
                : ''
            }

          </div>

        </div>
      `;
    }).join('');

    grid
      .querySelectorAll('[data-edit]')
      .forEach(button => {
        button.addEventListener('click', () => {
          const item = menu.find(
            m => m.id === button.dataset.edit
          );

          openItemModal(item);
        });
      });

    grid
      .querySelectorAll('[data-del]')
      .forEach(button => {
        button.addEventListener('click', () => {
          deleteItem(button.dataset.del);
        });
      });
  }

  function deleteItem(id) {
    if (!confirm('Delete this dish from the menu?')) return;

    Store.saveMenu(
      Store.menu().filter(m => m.id !== id)
    );

    toast('Dish removed', 'success');

    renderGrid();
  }

  function openItemModal(item) {
    const inventory = Store.inventory();

    recipeRows = item && item.recipe
      ? item.recipe.map(r => ({ ...r }))
      : [];

    const modal = openModal(`

      <h3 class="modal-title">
        ${item ? 'Edit dish' : 'Add dish'}
      </h3>

      <div class="field-row">

        <div class="field">
          <label>Name</label>

          <input
            id="mi-name"
            value="${item ? escapeHtml(item.name) : ''}"
            required
          >
        </div>

        <div class="field">
          <label>Category</label>

          <input
            id="mi-category"
            value="${item ? escapeHtml(item.category) : ''}"
            placeholder="e.g. Mains"
            required
          >
        </div>

      </div>

      <div class="field-row">

        <div class="field">
          <label>Price</label>

          <input
            type="number"
            step="0.01"
            min="0"
            id="mi-price"
            value="${item ? item.price : ''}"
            required
          >
        </div>

        <div class="field">

          <label>Status</label>

          <select id="mi-status">

            <option
              value="available"
              ${!item || item.status === 'available' ? 'selected' : ''}
            >
              Available
            </option>

            <option
              value="unavailable"
              ${item && item.status === 'unavailable' ? 'selected' : ''}
            >
              Unavailable
            </option>

          </select>

        </div>

      </div>

      <div class="field">

        <label>Description</label>

        <textarea
          id="mi-desc"
          rows="2"
        >
          ${item ? escapeHtml(item.description || '') : ''}
        </textarea>

      </div>

      <div class="field">

        <label>
          Photo (optional)
        </label>

        <div class="photo-picker">

          <div
            class="photo-preview"
            id="mi-photo-preview"
          >

            ${
              item && item.image
                ? `
                  <img
                    src="${getImagePath(item.image)}"
                    alt=""
                  >
                `
                : `
                  <span>
                    No photo
                  </span>
                `
            }

          </div>

          <div class="photo-picker-actions">

            <input
              type="file"
              id="mi-photo-input"
              accept="image/*"
              style="display:none;"
            >

            <button
              type="button"
              class="btn btn-secondary btn-sm"
              id="mi-photo-btn"
            >
              Choose image
            </button>

            ${
              item && item.image
                ? `
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    id="mi-photo-remove"
                  >
                    Remove
                  </button>
                `
                : ''
            }

          </div>

        </div>

      </div>

      <div class="field">

        <label>
          Recipe (ingredients consumed per serving)
          — optional, powers automatic inventory deduction
        </label>

        <div id="recipe-rows"></div>

        <button
          type="button"
          class="btn btn-secondary btn-sm"
          id="add-recipe-row"
        >
          + Add ingredient
        </button>

      </div>

      <div class="modal-actions">

        <button
          class="btn btn-secondary"
          id="mi-cancel"
        >
          Cancel
        </button>

        <button
          class="btn btn-primary"
          id="mi-save"
        >
          ${item ? 'Save changes' : 'Add dish'}
        </button>

      </div>

    `, { wide: true });

    let pendingImage = item && item.image
      ? item.image
      : null;

    document
      .getElementById('mi-photo-btn')
      .addEventListener('click', () => {
        document
          .getElementById('mi-photo-input')
          .click();
      });

    document
      .getElementById('mi-photo-input')
      .addEventListener('change', async (e) => {

        const file = e.target.files[0];

        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          return toast(
            'Please choose an image under 2MB',
            'error'
          );
        }

        pendingImage = await fileToDataUrl(file);

        document
          .getElementById('mi-photo-preview')
          .innerHTML = `
            <img
              src="${pendingImage}"
              alt=""
            >
          `;
      });

    const removeBtn =
      document.getElementById('mi-photo-remove');

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {

        pendingImage = null;

        document
          .getElementById('mi-photo-preview')
          .innerHTML = `
            <span>
              No photo
            </span>
          `;
      });
    }

    function drawRecipeRows() {

      const el =
        document.getElementById('recipe-rows');

      if (!recipeRows.length) {

        el.innerHTML = `
          <p
            style="font-size:12.5px;color:var(--muted);"
          >
            No ingredients linked yet.
          </p>
        `;

        return;
      }

      el.innerHTML = recipeRows.map((r, idx) => `

        <div class="recipe-row">

          <select data-ing="${idx}">

            ${
              inventory.map(inv => `
                <option
                  value="${inv.id}"
                  ${inv.id === r.inventoryId ? 'selected' : ''}
                >
                  ${escapeHtml(inv.name)}
                  (${escapeHtml(inv.unit)})
                </option>
              `).join('')
            }

          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            data-qty="${idx}"
            value="${r.qty}"
            placeholder="Qty"
          >

          <button
            type="button"
            class="icon-btn"
            data-rm="${idx}"
          >
            ✕
          </button>

        </div>

      `).join('');

      el
        .querySelectorAll('[data-ing]')
        .forEach(select => {

          select.addEventListener('change', (e) => {

            recipeRows[
              +e.target.dataset.ing
            ].inventoryId = e.target.value;

          });

        });

      el
        .querySelectorAll('[data-qty]')
        .forEach(input => {

          input.addEventListener('input', (e) => {

            recipeRows[
              +e.target.dataset.qty
            ].qty = +e.target.value;

          });

        });

      el
        .querySelectorAll('[data-rm]')
        .forEach(button => {

          button.addEventListener('click', () => {

            recipeRows.splice(
              +button.dataset.rm,
              1
            );

            drawRecipeRows();

          });

        });
    }

    document
      .getElementById('add-recipe-row')
      .addEventListener('click', () => {

        if (!inventory.length) {
          return toast(
            'Add inventory items first',
            'error'
          );
        }

        recipeRows.push({
          inventoryId: inventory[0].id,
          qty: 0.1
        });

        drawRecipeRows();
      });

    document
      .getElementById('mi-cancel')
      .addEventListener('click', closeModal);

    document
      .getElementById('mi-save')
      .addEventListener('click', () => {
        saveItem(item, pendingImage);
      });

    drawRecipeRows();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);

      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  function saveItem(existing, image) {

    const name =
      document.getElementById('mi-name').value.trim();

    const category =
      document.getElementById('mi-category').value.trim();

    const price =
      +document.getElementById('mi-price').value;

    const status =
      document.getElementById('mi-status').value;

    const description =
      document.getElementById('mi-desc').value.trim();

    if (!name || !category || !price) {
      return toast(
        'Please fill in name, category and price',
        'error'
      );
    }

    const menu = Store.menu();

    if (existing) {

      const m =
        menu.find(x => x.id === existing.id);

      Object.assign(m, {
        name,
        category,
        price,
        status,
        description,
        image,
        recipe: recipeRows.filter(
          r => r.inventoryId && r.qty > 0
        )
      });

    } else {

      menu.push({
        id: uid('m'),
        name,
        category,
        price,
        status,
        description,
        image,
        recipe: recipeRows.filter(
          r => r.inventoryId && r.qty > 0
        )
      });

    }

    Store.saveMenu(menu);

    closeModal();

    toast(
      existing
        ? 'Dish updated'
        : 'Dish added',
      'success'
    );

    render();
  }

  render();

  onDataChange(render);

})();