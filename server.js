const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./db');

const app = express();

// ===== Trust Railway Proxy =====
app.set('trust proxy', 1);

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'suez-sons-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 8 },
    proxy: true
}));

// ===== Helper Functions =====
const genId = (prefix) => prefix + '_' + Date.now().toString(36);

// ===== Auth Middleware =====
const requireAdmin = (req, res, next) => req.session.adminUser ? next() : res.status(401).json({ error: 'غير مصرح' });
const requireStore = (req, res, next) => req.session.storeUser ? next() : res.status(401).json({ error: 'غير مصرح' });
const requireEmployee = (req, res, next) => req.session.empUser ? next() : res.status(401).json({ error: 'غير مصرح' });

// ===== Protect HTML pages =====
app.get('/dashboard.html', (req, res, next) => req.session.adminUser ? next() : res.redirect('/login.html?type=admin&error=1'));
app.get('/admin.html', (req, res, next) => req.session.adminUser === 'mo' ? next() : res.redirect('/login.html?type=admin&error=1'));
app.get('/store-dashboard.html', (req, res, next) => req.session.storeUser ? next() : res.redirect('/login.html?type=store&error=1'));
app.get('/employee-dashboard.html', (req, res, next) => req.session.empUser ? next() : res.redirect('/login.html?type=employee&error=1'));

// ===== LOGIN: Admin =====
app.post('/login/admin', async (req, res) => {
    const { username, password } = req.body;
    const user = db.findUserByUsername(username?.trim().toLowerCase());
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.regenerate(err => {
            if (err) return res.status(500).json({ error: 'خطأ في الجلسة' });
            req.session.adminUser = user.username;
            db.logActivity(user.username, 'LOGIN', 'تسجيل دخول أدمن');
            res.json({ redirect: '/dashboard.html' });
        });
    } else {
        res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
});

// ===== LOGIN: Store Owner =====
app.post('/login/store', async (req, res) => {
    const { username, password } = req.body;
    const store = db.findStoreByUsername(username?.trim().toLowerCase());
    if (store && await bcrypt.compare(password, store.password)) {
        req.session.regenerate(err => {
            if (err) return res.status(500).json({ error: 'خطأ في الجلسة' });
            req.session.storeUser = store.id;
            db.logActivity(store.id, 'LOGIN', 'تسجيل دخول صاحب محل');
            res.json({ redirect: '/store-dashboard.html' });
        });
    } else {
        res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
});

// ===== LOGIN: Employee =====
app.post('/login/employee', async (req, res) => {
    const { username, password } = req.body;
    const emp = db.findEmployeeByUsername(username?.trim().toLowerCase());
    if (emp && await bcrypt.compare(password, emp.password)) {
        req.session.regenerate(err => {
            if (err) return res.status(500).json({ error: 'خطأ في الجلسة' });
            req.session.empUser = emp.id;
            db.logActivity(emp.id, 'LOGIN', 'تسجيل دخول موظف');
            res.json({ redirect: '/employee-dashboard.html' });
        });
    } else {
        res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
});

// ===== API: Change Password =====
app.post('/api/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'بيانات ناقصة' });

    let user = null;
    let userType = null;
    let userId = null;

    if (req.session.adminUser) {
        user = db.findUserByUsername(req.session.adminUser);
        userType = 'admin';
        userId = req.session.adminUser;
    } else if (req.session.storeUser) {
        user = db.findStoreById(req.session.storeUser);
        userType = 'store';
        userId = req.session.storeUser;
    } else if (req.session.empUser) {
        user = db.findEmployeeById(req.session.empUser);
        userType = 'employee';
        userId = req.session.empUser;
    }

    if (!user) return res.status(401).json({ error: 'غير مصرح' });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });

    const hashedNew = await bcrypt.hash(newPassword, 10);

    if (userType === 'admin') {
        db.updateUserPassword(req.session.adminUser, hashedNew);
    } else if (userType === 'store') {
        db.updateStorePassword(req.session.storeUser, hashedNew);
    } else if (userType === 'employee') {
        db.updateEmployeePassword(req.session.empUser, hashedNew);
    }

    db.logActivity(userId, 'CHANGE_PASSWORD', 'تغيير كلمة المرور');
    res.json({ ok: true });
});

// ===== API: Admin — Suppliers =====
app.get('/api/my-purchases', requireAdmin, (req, res) => {
    const purchases = db.getPurchasesByUsername(req.session.adminUser);
    res.json({ username: req.session.adminUser, purchases });
});

app.post('/admin/add-purchase', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    const { username, shop, total, paid, remaining, date } = req.body;
    if (!username || !shop || isNaN(total) || !date) return res.status(400).json({ error: 'بيانات ناقصة' });
    const totalN = Number(total), paidN = Number(paid) || 0;
    if (paidN > totalN) return res.status(400).json({ error: 'المدفوع أكبر من الإجمالي' });

    db.addPurchase(username.trim().toLowerCase(), shop.trim(), totalN, paidN, Math.max(0, totalN - paidN), date);
    db.logActivity(req.session.adminUser, 'ADD_PURCHASE', `إضافة عملية توريد: ${shop}`);
    res.json({ ok: true });
});

// ===== API: Admin — Stores =====
app.get('/admin/stores', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    res.json(db.getAllStores());
});

app.post('/admin/add-store', requireAdmin, async (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    const { name, username, password } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'بيانات ناقصة' });

    if (db.findStoreByUsername(username.trim().toLowerCase())) return res.status(400).json({ error: 'اسم المستخدم موجود' });

    const hashed = await bcrypt.hash(password, 10);
    db.addStore(genId('store'), name.trim(), username.trim().toLowerCase(), hashed);
    db.logActivity(req.session.adminUser, 'ADD_STORE', `إضافة محل: ${name}`);
    res.json({ ok: true });
});

app.delete('/admin/delete-store/:id', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    db.deleteStore(req.params.id);
    db.logActivity(req.session.adminUser, 'DELETE_STORE', `حذف محل: ${req.params.id}`);
    res.json({ ok: true });
});

// ===== API: Admin — Employees =====
app.get('/admin/employees', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    res.json(db.getAllEmployees().map(({ password, ...e }) => e));
});

app.post('/admin/add-employee', requireAdmin, async (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    const { name, store_id, username, password, salary, debt, schedule, last_request } = req.body;
    if (!name || !store_id || !username || !password) return res.status(400).json({ error: 'بيانات ناقصة' });

    if (!db.findStoreById(store_id)) return res.status(400).json({ error: 'ID المحل غير موجود' });
    if (db.findEmployeeByUsername(username.trim().toLowerCase())) return res.status(400).json({ error: 'اسم المستخدم موجود' });

    const hashed = await bcrypt.hash(password, 10);
    db.addEmployee(genId('emp'), store_id, name.trim(), username.trim().toLowerCase(), hashed, Number(salary) || 0, Number(debt) || 0, schedule || '', last_request || 'لا يوجد');
    db.logActivity(req.session.adminUser, 'ADD_EMPLOYEE', `إضافة موظف: ${name}`);
    res.json({ ok: true });
});

app.put('/admin/edit-employee/:id', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    const { name, salary, debt, schedule, last_request } = req.body;
    if (!db.findEmployeeById(req.params.id)) return res.status(404).json({ error: 'الموظف غير موجود' });

    db.updateEmployee(req.params.id, name, Number(salary), Number(debt), schedule, last_request);
    db.logActivity(req.session.adminUser, 'EDIT_EMPLOYEE', `تعديل موظف: ${req.params.id}`);
    res.json({ ok: true });
});

app.delete('/admin/delete-employee/:id', requireAdmin, (req, res) => {
    if (req.session.adminUser !== 'mo') return res.status(403).json({ error: 'غير مصرح' });
    db.deleteEmployee(req.params.id);
    db.logActivity(req.session.adminUser, 'DELETE_EMPLOYEE', `حذف موظف: ${req.params.id}`);
    res.json({ ok: true });
});

// ===== API: Store Owner =====
app.get('/api/store/employees', requireStore, (req, res) => {
    const store = db.findStoreById(req.session.storeUser);
    if (!store) return res.status(404).json({ error: 'المحل غير موجود' });

    const employees = db.getEmployeesByStore(store.id).map(({ password, username, ...e }) => e);
    res.json({ storeName: store.name, employees });
});

// ===== API: Employee =====
app.get('/api/employee/my-data', requireEmployee, (req, res) => {
    const emp = db.findEmployeeById(req.session.empUser);
    if (!emp) return res.status(404).json({ error: 'الموظف غير موجود' });

    const store = db.findStoreById(emp.store_id);
    const { password, ...safeEmp } = emp;
    res.json({ ...safeEmp, storeName: store ? store.name : 'غير معروف' });
});

// ===== Logout =====
app.get('/logout', (req, res) => {
    const userId = req.session.adminUser || req.session.storeUser || req.session.empUser;
    if (userId) db.logActivity(userId, 'LOGOUT', 'تسجيل خروج');
    req.session.destroy(() => res.redirect('/'));
});

// ===== Static files =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== 404 =====
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ===== Start =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Suez Sons (SQLite) → http://localhost:${PORT}`);
    console.log(`📊 Database: suez.db\n`);
});
