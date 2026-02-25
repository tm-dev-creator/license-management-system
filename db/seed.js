const bcrypt = require('bcryptjs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'subscriptions.db');
const db = new Database(DB_PATH);

const hashPassword = (pwd) => bcrypt.hashSync(pwd, 10);

// Seed admin and customer users
const adminHash = hashPassword('admin123');
const customerHash = hashPassword('customer123');

db.exec(`
  DELETE FROM api_keys;
  DELETE FROM subscriptions;
  DELETE FROM customers;
  DELETE FROM subscription_packs;
  DELETE FROM users;
`);

db.prepare(`
  INSERT INTO users (email, password_hash, role) VALUES
  ('admin@example.com', ?, 'admin'),
  ('customer@example.com', ?, 'customer')
`).run(adminHash, customerHash);

const adminId = db.prepare("SELECT id FROM users WHERE email = 'admin@example.com'").get().id;
const customerUserId = db.prepare("SELECT id FROM users WHERE email = 'customer@example.com'").get().id;

db.prepare(`
  INSERT INTO customers (user_id, name, phone) VALUES (?, 'Jane Customer', '+1234567890')
`).run(customerUserId);
const customerId = db.prepare('SELECT id FROM customers WHERE user_id = ?').get(customerUserId).id;

db.prepare(`
  INSERT INTO subscription_packs (name, description, sku, price, validity_months) VALUES
  ('Basic Monthly', 'Basic plan, 1 month', 'SKU-BASIC-1M', 9.99, 1),
  ('Pro Quarterly', 'Pro plan, 3 months', 'SKU-PRO-3M', 24.99, 3),
  ('Premium Yearly', 'Premium plan, 12 months', 'SKU-PREMIUM-12M', 89.99, 12)
`).run();

const packBasic = db.prepare('SELECT id FROM subscription_packs WHERE sku = ?').get('SKU-BASIC-1M').id;

db.prepare(`
  INSERT INTO subscriptions (customer_id, pack_id, status, requested_at, approved_at, assigned_at, expires_at) VALUES
  (?, ?, 'active', datetime('now', '-2 days'), datetime('now', '-2 days'), datetime('now', '-2 days'), datetime('now', '+29 days'))
`).run(customerId, packBasic);

db.close();
console.log('Seed data loaded. Login: admin@example.com / admin123, customer@example.com / customer123');
