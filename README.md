# The Copper Fork, Restaurant Management System

A full featured, browser based restaurant management system built with plain
HTML, CSS, and JavaScript. All data is persisted with `localStorage`, no
backend or build step required.

## Running it

Just open **`login.html`** (or `index.html`) directly in a browser, or serve
the folder with any static server, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

> Opening `index.html`/`login.html` straight from the file system (`file://`)
> works fine, `localStorage` is scoped per origin/per folder in most
> browsers. For the most reliable experience (and to test the cross tab
> "live sync" between roles), serve it over `http://localhost` and open two
> tabs signed in as different roles.

## Demo accounts

| Role       | Username  | Password    |
|------------|-----------|-------------|
| Admin      | admin     | admin123    |
| Manager    | manager   | manager123  |
| Waiter     | waiter    | waiter123   |
| Waiter 2   | waiter2   | waiter123   |
| Kitchen    | kitchen   | kitchen123  |

The database seeds itself automatically on first load (12 tables, a 12 item
menu with linked ingredient recipes, 14 inventory ingredients, and 5 users,
plus a week of backfilled invoices so the dashboard and reports have data).
Reset everything by clearing the site's localStorage from dev tools.

## Modules

- **Dashboard** (admin/manager), today's sales, order counts, table
  occupancy, low stock alerts, a 7 day revenue chart, and recent orders.
- **Tables** (admin/manager/waiter), seat, reserve, clear, add, and remove
  tables; jumps straight into a new order when you seat a table.
- **Orders & Kitchen Display** (all roles), waiters build orders from the
  live menu (search + category filters, a running cart); orders are sent to
  the kitchen automatically. Kitchen staff move tickets through
  Pending to Cooking to Ready; waiters mark Ready to Served and generate the
  bill. Admin/manager see both the front of house list and the kitchen board.
- **Menu management** (admin/manager edit, everyone can view), add, edit,
  delete, search, and categorize dishes. Each dish can optionally be linked
  to a recipe of inventory ingredients + quantities, so placing an order
  automatically deducts stock.
- **Inventory** (admin/manager edit, everyone can view), track quantity,
  unit, and low stock threshold per ingredient; automatic Low/Out badges;
  quick restock action.
- **Billing**, generated from any "Served" order: subtotal, tax, total,
  payment method, then frees the table automatically.
- **Reports** (admin/manager), Today / 7 day / 30 day / custom range;
  total revenue, orders billed, average order value, a daily revenue chart,
  top selling dishes, and a full invoice log.

## How the pieces fit together

```
storage.js   -> localStorage data layer + seed data (the single source of truth)
app.js       -> auth guard, sidebar/topbar shell, toasts, modals, formatting
<page>.js    -> page specific logic, one file per module
```

Every page polls for changes every few seconds and listens for the
browser's `storage` event, so if you open the Kitchen Display in one tab and
the Waiter view in another, status updates appear on their own without a
manual refresh.

## Notes on scope

This is a fully working front end simulation of a restaurant's daily
workflow, intended as a strong foundation for a real deployment. To go to
production you'd want to swap `storage.js` for real API calls to a backend
+ database (so data is shared across devices, not just one browser), add
proper password hashing/session tokens, and add receipt printing.
