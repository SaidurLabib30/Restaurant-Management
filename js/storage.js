/* ============================================================
   storage.js — Data layer for the Restaurant Management System
   Everything is persisted to localStorage under the RMS_ prefix.
   This is the single source of truth; all pages read/write here.
   ============================================================ */

const DB = {
  USERS: 'RMS_USERS',
  MENU: 'RMS_MENU',
  TABLES: 'RMS_TABLES',
  INVENTORY: 'RMS_INVENTORY',
  ORDERS: 'RMS_ORDERS',
  INVOICES: 'RMS_INVOICES',
  SESSION: 'RMS_SESSION',
  SETTINGS: 'RMS_SETTINGS',
  SEEDED: 'RMS_SEEDED_V1'
};

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readDB(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : null);
  } catch (e) {
    console.error('Storage read failed for', key, e);
    return fallback !== undefined ? fallback : null;
  }
}

function writeDB(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Storage write failed for', key, e);
    return false;
  }
}

/* ---------------------- Seed data ---------------------- */

function seedDatabase() {
  if (localStorage.getItem(DB.SEEDED)) return;

  const users = [
    { id: 'u_admin', username: 'admin', password: 'admin123', role: 'admin', name: 'System Administrator' },
    { id: 'u_manager', username: 'manager', password: 'manager123', role: 'manager', name: 'Alex Rivera' },
    { id: 'u_waiter', username: 'waiter', password: 'waiter123', role: 'waiter', name: 'Sam Torres' },
    { id: 'u_waiter2', username: 'waiter2', password: 'waiter123', role: 'waiter', name: 'Jamie Lee' },
    { id: 'u_kitchen', username: 'kitchen', password: 'kitchen123', role: 'kitchen', name: 'Chef Morgan' }
  ];

  const inventory = [
    { id: 'inv_1', name: 'Tomatoes', unit: 'kg', quantity: 20, threshold: 5 },
    { id: 'inv_2', name: 'Chicken Breast', unit: 'kg', quantity: 15, threshold: 4 },
    { id: 'inv_3', name: 'Rice', unit: 'kg', quantity: 30, threshold: 6 },
    { id: 'inv_4', name: 'Lettuce', unit: 'kg', quantity: 8, threshold: 3 },
    { id: 'inv_5', name: 'Mozzarella Cheese', unit: 'kg', quantity: 3, threshold: 4 },
    { id: 'inv_6', name: 'Coffee Beans', unit: 'kg', quantity: 6, threshold: 2 },
    { id: 'inv_7', name: 'Flour', unit: 'kg', quantity: 25, threshold: 5 },
    { id: 'inv_8', name: 'Butter', unit: 'kg', quantity: 4, threshold: 2 },
    { id: 'inv_9', name: 'Milk', unit: 'l', quantity: 18, threshold: 5 },
    { id: 'inv_10', name: 'Beef Patty', unit: 'pcs', quantity: 2, threshold: 10 },
    { id: 'inv_11', name: 'Potatoes', unit: 'kg', quantity: 22, threshold: 5 },
    { id: 'inv_12', name: 'Basil', unit: 'kg', quantity: 0, threshold: 1 },
    { id: 'inv_13', name: 'Lemons', unit: 'pcs', quantity: 40, threshold: 10 },
    { id: 'inv_14', name: 'Chocolate', unit: 'kg', quantity: 5, threshold: 2 }
  ];

  const menu = [
    {
      id: 'm_1',
      name: 'Garden Salad',
      category: 'Starters',
      price: 175,
      description: 'Fresh lettuce, tomato & house dressing',
      status: 'available',
      image: '../assets/images/0.jpg',
      recipe: [
        { inventoryId: 'inv_4', qty: 0.15 },
        { inventoryId: 'inv_1', qty: 0.1 }
      ]
    },

    {
      id: 'm_2',
      name: 'Bruschetta',
      category: 'Starters',
      price: 220,
      description: 'Toasted bread, tomato, basil',
      status: 'available',
      image: '../assets/images/1.jpg',
      recipe: [
        { inventoryId: 'inv_1', qty: 0.12 },
        { inventoryId: 'inv_12', qty: 0.02 }
      ]
    },

    {
      id: 'm_3',
      name: 'Grilled Chicken',
      category: 'Mains',
      price: 300,
      description: 'Chicken breast, herbs, side of rice',
      status: 'available',
      image: '../assets/images/2.jpg',
      recipe: [
        { inventoryId: 'inv_2', qty: 0.3 },
        { inventoryId: 'inv_3', qty: 0.2 }
      ]
    },

    {
      id: 'm_4',
      name: 'Classic Beef Burger',
      category: 'Mains',
      price: 250,
      description: 'Beef patty, cheese, lettuce, fries',
      status: 'available',
      image: '../assets/images/3.jpg',
      recipe: [
        { inventoryId: 'inv_10', qty: 1 },
        { inventoryId: 'inv_5', qty: 0.05 },
        { inventoryId: 'inv_4', qty: 0.05 },
        { inventoryId: 'inv_11', qty: 0.2 }
      ]
    },

    {
      id: 'm_5',
      name: 'Margherita Pizza',
      category: 'Mains',
      price: 280,
      description: 'Mozzarella, tomato, basil',
      status: 'available',
      image: '../assets/images/4.jpg',
      recipe: [
        { inventoryId: 'inv_7', qty: 0.25 },
        { inventoryId: 'inv_5', qty: 0.15 },
        { inventoryId: 'inv_1', qty: 0.1 }
      ]
    },

    {
      id: 'm_6',
      name: 'Chicken Rice Bowl',
      category: 'Mains',
      price: 260,
      description: 'Grilled chicken over jasmine rice',
      status: 'available',
      image: '../assets/images/5.jpg',
      recipe: [
        { inventoryId: 'inv_2', qty: 0.25 },
        { inventoryId: 'inv_3', qty: 0.25 }
      ]
    },

    {
      id: 'm_7',
      name: 'Espresso',
      category: 'Beverages',
      price: 180,
      description: 'Double shot espresso',
      status: 'available',
      image: '../assets/images/6.webp',
      recipe: [
        { inventoryId: 'inv_6', qty: 0.02 }
      ]
    },

    {
      id: 'm_8',
      name: 'Cafe Latte',
      category: 'Beverages',
      price: 150,
      description: 'Espresso with steamed milk',
      status: 'available',
      image: '../assets/images/7.jpg',
      recipe: [
        { inventoryId: 'inv_6', qty: 0.02 },
        { inventoryId: 'inv_9', qty: 0.2 }
      ]
    },

    {
      id: 'm_9',
      name: 'Fresh Lemonade',
      category: 'Beverages',
      price: 100,
      description: 'House-made lemonade',
      status: 'available',
      image: '../assets/images/8.jpg',
      recipe: [
        { inventoryId: 'inv_13', qty: 2 }
      ]
    },

    {
      id: 'm_10',
      name: 'Chocolate Lava Cake',
      category: 'Desserts',
      price: 200,
      description: 'Warm cake, molten center',
      status: 'available',
      image: '../assets/images/9.jpg',
      recipe: [
        { inventoryId: 'inv_14', qty: 0.1 },
        { inventoryId: 'inv_7', qty: 0.05 },
        { inventoryId: 'inv_8', qty: 0.05 }
      ]
    },

    {
      id: 'm_11',
      name: 'Tiramisu',
      category: 'Desserts',
      price: 240,
      description: 'Espresso-soaked layers, mascarpone',
      status: 'available',
      image: '../assets/images/10.jpg',
      recipe: [
        { inventoryId: 'inv_6', qty: 0.03 }
      ]
    },

    {
      id: 'm_12',
      name: 'French Fries',
      category: 'Starters',
      price: 99,
      description: 'Crispy golden fries',
      status: 'available',
      image: '../assets/images/11.jpg',
      recipe: [
        { inventoryId: 'inv_11', qty: 0.25 }
      ]
    }
  ];

  const tables = [];

  for (let i = 1; i <= 12; i++) {
    tables.push({
      id: 't_' + i,
      number: i,
      capacity: [2, 2, 4, 4, 4, 6, 2, 4, 4, 6, 2, 8][i - 1] || 4,
      status: 'available',
      currentOrderId: null
    });
  }

  writeDB(DB.USERS, users);
  writeDB(DB.MENU, menu);
  writeDB(DB.TABLES, tables);
  writeDB(DB.INVENTORY, inventory);
  writeDB(DB.ORDERS, []);
  writeDB(DB.INVOICES, []);
  writeDB(DB.SETTINGS, {
    taxRate: 0.08,
    currency: '৳',
    restaurantName: 'The Copper Fork'
  });

  localStorage.setItem(DB.SEEDED, 'true');
}

/*
 * Repair menu image paths for browsers that already ran an older
 * version of this app before the image fixes. seedDatabase() only
 * runs once per browser, so anyone who loaded the app earlier is
 * stuck with whatever MENU data got cached first — including any
 * broken image paths. This runs on every load and patches known
 * bad values in place, without touching orders/inventory/tables.
 */
function repairMenuImages() {
  const menu = readDB(DB.MENU, null);
  if (!menu || !Array.isArray(menu)) return;

  let changed = false;

  const FIXES = {
    '../assets/images/6.jpg': '../assets/images/6.webp'
  };

  menu.forEach(item => {
    if (item.image && FIXES[item.image]) {
      item.image = FIXES[item.image];
      changed = true;
    }
  });

  // Make sure every default dish (m_1 .. m_12) actually has an
  // image assigned, in case older cached data was missing some.
  const DEFAULT_IMAGE = {
    m_1: '../assets/images/0.jpg',
    m_2: '../assets/images/1.jpg',
    m_3: '../assets/images/2.jpg',
    m_4: '../assets/images/3.jpg',
    m_5: '../assets/images/4.jpg',
    m_6: '../assets/images/5.jpg',
    m_7: '../assets/images/6.webp',
    m_8: '../assets/images/7.jpg',
    m_9: '../assets/images/8.jpg',
    m_10: '../assets/images/9.jpg',
    m_11: '../assets/images/10.jpg',
    m_12: '../assets/images/11.jpg'
  };

  menu.forEach(item => {
    if (!item.image && DEFAULT_IMAGE[item.id]) {
      item.image = DEFAULT_IMAGE[item.id];
      changed = true;
    }
  });

  if (changed) {
    writeDB(DB.MENU, menu);
  }
}

/* ---------------------- Generic accessors ---------------------- */

const Store = {
  users: () => readDB(DB.USERS, []),

  menu: () => readDB(DB.MENU, []),

  saveMenu: (v) => writeDB(DB.MENU, v),

  tables: () => readDB(DB.TABLES, []),

  saveTables: (v) => writeDB(DB.TABLES, v),

  inventory: () => readDB(DB.INVENTORY, []),

  saveInventory: (v) => writeDB(DB.INVENTORY, v),

  orders: () => readDB(DB.ORDERS, []),

  saveOrders: (v) => writeDB(DB.ORDERS, v),

  invoices: () => readDB(DB.INVOICES, []),

  saveInvoices: (v) => writeDB(DB.INVOICES, v),

  settings: () => readDB(DB.SETTINGS, {
    taxRate: 0.08,
    currency: '৳',
    restaurantName: 'Restaurant'
  }),

  saveSettings: (v) => writeDB(DB.SETTINGS, v),

  session: () => readDB(DB.SESSION, null),

  saveSession: (v) => writeDB(DB.SESSION, v),

  clearSession: () => localStorage.removeItem(DB.SESSION)
};

/* ---------------------- Inventory status helper ---------------------- */

function inventoryStatus(item) {
  if (item.quantity <= 0) return 'out';

  if (item.quantity <= item.threshold) return 'low';

  return 'ok';
}

/* ---------------------- Deduct stock when an order is placed ---------------------- */

function deductInventoryForItems(orderItems) {
  const inv = Store.inventory();

  const invMap = {};

  inv.forEach(i => invMap[i.id] = i);

  const menu = Store.menu();

  const menuMap = {};

  menu.forEach(m => menuMap[m.id] = m);

  orderItems.forEach(oi => {
    const menuItem = menuMap[oi.menuItemId];

    if (!menuItem || !menuItem.recipe) return;

    menuItem.recipe.forEach(r => {
      const invItem = invMap[r.inventoryId];

      if (invItem) {
        invItem.quantity = Math.max(
          0,
          +(invItem.quantity - (r.qty * oi.qty)).toFixed(2)
        );
      }
    });
  });

  Store.saveInventory(inv);
}

/*
 * Repair currency + menu prices for browsers that already ran an
 * older version of this app (before the switch to BDT). Only
 * touches settings.currency and the price of the 12 default dishes
 * — a dish is only migrated if its price still matches the old USD
 * default, so any price the user has since edited is left alone.
 */
function repairCurrency() {
  const settings = readDB(DB.SETTINGS, null);
  if (settings && settings.currency !== '৳') {
    settings.currency = '৳';
    writeDB(DB.SETTINGS, settings);
  }

  const menu = readDB(DB.MENU, null);
  if (!menu || !Array.isArray(menu)) return;

  const OLD_USD = { m_1: 6.5, m_2: 7.0, m_3: 14.5, m_4: 12.0, m_5: 11.5, m_6: 13.0, m_7: 3.0, m_8: 4.0, m_9: 3.5, m_10: 6.0, m_11: 6.5, m_12: 4.5 };
  const BDT_PRICE = { m_1: 715, m_2: 770, m_3: 1595, m_4: 1320, m_5: 1265, m_6: 1430, m_7: 330, m_8: 440, m_9: 385, m_10: 660, m_11: 715, m_12: 495 };

  let changed = false;
  menu.forEach(item => {
    if (BDT_PRICE[item.id] && item.price === OLD_USD[item.id]) {
      item.price = BDT_PRICE[item.id];
      changed = true;
    }
  });

  if (changed) writeDB(DB.MENU, menu);
}

seedDatabase();
repairMenuImages();
repairCurrency();