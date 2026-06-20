const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'suez.db');

// Delete old database if exists (for fresh start)
const fs = require('fs');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('🗑️  تم حذف قاعدة البيانات القديمة');
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔧 جاري إنشاء جداول قاعدة البيانات...\n');

// ===== USERS TABLE (ADMIN) =====
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ جدول المستخدمين (أدمن)');

// ===== STORES TABLE =====
db.exec(`
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ جدول المحلات');

// ===== EMPLOYEES TABLE =====
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salary REAL DEFAULT 0,
    debt REAL DEFAULT 0,
    schedule TEXT,
    last_request TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  )
`);
console.log('✅ جدول الموظفين');

// ===== PURCHASES TABLE =====
db.exec(`
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    shop TEXT NOT NULL,
    total REAL NOT NULL,
    paid REAL DEFAULT 0,
    remaining REAL DEFAULT 0,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ جدول الموردين/المشتريات');

// ===== ACTIVITY LOG TABLE =====
db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ جدول السجل النشاطي');

// ===== Insert default data =====
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

console.log('\n📦 إدراج البيانات الافتراضية...\n');

// Admin user
db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('mo', hash('123'));
console.log('  ✓ أدمن: mo / 123');

// Stores
db.prepare('INSERT INTO stores (id, name, username, password) VALUES (?, ?, ?, ?)').run('store_001', 'سوبر ماركت النيل', 'nile_market', hash('123'));
console.log('  ✓ محل: nile_market / 123');

db.prepare('INSERT INTO stores (id, name, username, password) VALUES (?, ?, ?, ?)').run('store_002', 'محل ملابس الأناقة', 'elegance_store', hash('123'));
console.log('  ✓ محل: elegance_store / 123');

// Employees
db.prepare('INSERT INTO employees (id, store_id, name, username, password, salary, debt, schedule, last_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'emp_001', 'store_001', 'أحمد محمد علي', 'ahmed_nile', hash('123'), 4500, 500, 'السبت - الخميس | 9ص - 5م', 'سلفة 500 جنيه'
);
console.log('  ✓ موظف: ahmed_nile / 123');

db.prepare('INSERT INTO employees (id, store_id, name, username, password, salary, debt, schedule, last_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'emp_002', 'store_001', 'محمد عبدالله حسن', 'mohamed_nile', hash('123'), 3800, 0, 'الأحد - الخميس | 10ص - 6م', 'لا يوجد'
);
console.log('  ✓ موظف: mohamed_nile / 123');

db.prepare('INSERT INTO employees (id, store_id, name, username, password, salary, debt, schedule, last_request) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
  'emp_003', 'store_002', 'سارة خالد إبراهيم', 'sara_elegance', hash('123'), 5000, 1200, 'السبت - الأربعاء | 11ص - 7م', 'إجازة 3 أيام'
);
console.log('  ✓ موظف: sara_elegance / 123');

// Sample purchases
db.prepare('INSERT INTO purchases (username, shop, total, paid, remaining, date) VALUES (?, ?, ?, ?, ?, ?)').run('mo', 'صيدلية الشفاء', 5000, 3000, 2000, '2025-06-10');
db.prepare('INSERT INTO purchases (username, shop, total, paid, remaining, date) VALUES (?, ?, ?, ?, ?, ?)').run('mo', 'مستودع الأدوية', 8000, 8000, 0, '2025-06-12');
console.log('  ✓ عمليات توريد');

db.close();
console.log('\n✅ اكتمل! قاعدة البيانات جاهزة في: suez.db');
console.log('🎯 الآن شغّل: npm start\n');
