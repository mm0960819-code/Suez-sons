const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'suez.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

module.exports = {
  // ===== USERS =====
  findUserByUsername: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
  updateUserPassword: (username, password) => db.prepare('UPDATE users SET password = ? WHERE username = ?').run(password, username),

  // ===== STORES =====
  findStoreById: (id) => db.prepare('SELECT * FROM stores WHERE id = ?').get(id),
  findStoreByUsername: (username) => db.prepare('SELECT * FROM stores WHERE username = ?').get(username),
  getAllStores: () => db.prepare('SELECT id, name, username FROM stores').all(),
  addStore: (id, name, username, password) => db.prepare('INSERT INTO stores (id, name, username, password) VALUES (?, ?, ?, ?)').run(id, name, username, password),
  deleteStore: (id) => db.prepare('DELETE FROM stores WHERE id = ?').run(id),
  updateStorePassword: (id, password) => db.prepare('UPDATE stores SET password = ? WHERE id = ?').run(password, id),

  // ===== EMPLOYEES =====
  findEmployeeById: (id) => db.prepare('SELECT * FROM employees WHERE id = ?').get(id),
  findEmployeeByUsername: (username) => db.prepare('SELECT * FROM employees WHERE username = ?').get(username),
  getEmployeesByStore: (storeId) => db.prepare('SELECT * FROM employees WHERE store_id = ?').all(storeId),
  getAllEmployees: () => db.prepare('SELECT * FROM employees').all(),
  addEmployee: (id, storeId, name, username, password, salary, debt, schedule, lastReq) => 
    db.prepare('INSERT INTO employees (id, store_id, name, username, password, salary, debt, schedule, last_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, storeId, name, username, password, salary, debt, schedule, lastReq),
  deleteEmployee: (id) => db.prepare('DELETE FROM employees WHERE id = ?').run(id),
  updateEmployee: (id, name, salary, debt, schedule, lastReq) => db.prepare('UPDATE employees SET name = ?, salary = ?, debt = ?, schedule = ?, last_request = ? WHERE id = ?').run(name, salary, debt, schedule, lastReq, id),
  updateEmployeePassword: (id, password) => db.prepare('UPDATE employees SET password = ? WHERE id = ?').run(password, id),

  // ===== PURCHASES =====
  getPurchasesByUsername: (username) => db.prepare('SELECT * FROM purchases WHERE username = ? ORDER BY date DESC').all(username),
  getAllPurchases: () => db.prepare('SELECT * FROM purchases ORDER BY created_at DESC').all(),
  addPurchase: (username, shop, total, paid, remaining, date) => db.prepare('INSERT INTO purchases (username, shop, total, paid, remaining, date) VALUES (?, ?, ?, ?, ?, ?)').run(username, shop, total, paid, remaining, date),
  deletePurchase: (id) => db.prepare('DELETE FROM purchases WHERE id = ?').run(id),

  // ===== ACTIVITY LOG =====
  logActivity: (userId, action, details) => db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details),
  getActivityLog: (limit = 100) => db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?').all(limit),

  // ===== DB CLOSE =====
  close: () => db.close(),
  db: db
};
