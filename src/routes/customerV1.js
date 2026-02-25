const express = require('express');
const db = require('../db');
const { requireJwt, requireCustomer } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();
router.use(requireJwt, requireCustomer);

function getCustomerId(userId) {
  const row = db.prepare('SELECT id FROM customers WHERE user_id = ? AND deleted_at IS NULL').get(userId);
  return row ? row.id : null;
}

// GET /api/v1/customer/profile
router.get('/profile', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const customer = db.prepare('SELECT id, user_id, name, phone, created_at FROM customers WHERE id = ?').get(customerId);
  res.json({ success: true, data: customer });
});

// PUT /api/v1/customer/profile
router.put('/profile', validateBody({ name: { type: 'string' }, phone: { type: 'string' } }), (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const { name, phone } = req.body;
  if (name !== undefined) db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name, customerId);
  if (phone !== undefined) db.prepare('UPDATE customers SET phone = ? WHERE id = ?').run(phone, customerId);
  const customer = db.prepare('SELECT id, user_id, name, phone, created_at FROM customers WHERE id = ?').get(customerId);
  res.json({ success: true, data: customer });
});

// GET /api/v1/customer/subscription - current subscription (active or latest)
router.get('/subscription', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const sub = db.prepare(`
    SELECT s.*, p.name AS pack_name, p.sku AS pack_sku, p.validity_months
    FROM subscriptions s
    JOIN subscription_packs p ON p.id = s.pack_id
    WHERE s.customer_id = ? AND p.deleted_at IS NULL
    ORDER BY s.created_at DESC LIMIT 1
  `).get(customerId);
  if (!sub) return res.json({ success: true, data: null });
  res.json({ success: true, data: sub });
});

// GET /api/v1/customer/subscriptions - list my subscriptions (paginated)
router.get('/subscriptions', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  const rows = db.prepare(`
    SELECT s.*, p.name AS pack_name, p.sku AS pack_sku
    FROM subscriptions s
    JOIN subscription_packs p ON p.id = s.pack_id
    WHERE s.customer_id = ? AND p.deleted_at IS NULL
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `).all(customerId, limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS c FROM subscriptions WHERE customer_id = ?').get(customerId).c;
  res.json({
    success: true,
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/v1/customer/subscriptions/request - request a new subscription (by pack SKU)
router.post('/subscriptions/request', validateBody({ sku: { required: true, type: 'string' } }), (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const pack = db.prepare('SELECT id FROM subscription_packs WHERE sku = ? AND deleted_at IS NULL').get(req.body.sku);
  if (!pack) return res.status(404).json({ success: false, message: 'Pack not found' });
  const active = db.prepare('SELECT id FROM subscriptions WHERE customer_id = ? AND status = ?').get(customerId, 'active');
  if (active) return res.status(400).json({ success: false, message: 'Already have an active subscription' });
  db.prepare('INSERT INTO subscriptions (customer_id, pack_id, status) VALUES (?, ?, ?)').run(customerId, pack.id, 'requested');
  const sub = db.prepare('SELECT * FROM subscriptions WHERE customer_id = ? ORDER BY id DESC LIMIT 1').get(customerId);
  res.status(201).json({ success: true, data: sub, message: 'Subscription requested' });
});

// GET /api/v1/customer/packs - list available subscription packs (for request)
router.get('/packs', (req, res) => {
  const rows = db.prepare('SELECT id, name, description, sku, price, validity_months FROM subscription_packs WHERE deleted_at IS NULL').all();
  res.json({ success: true, data: rows });
});

module.exports = router;
