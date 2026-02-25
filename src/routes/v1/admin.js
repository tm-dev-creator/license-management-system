const express = require('express');
const db = require('../../db');
const { requireJwt, requireAdmin } = require('../../middleware/auth');
const { validateBody } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });
router.use(requireJwt, requireAdmin);

const defaultLimit = 20;
const maxLimit = 100;

// GET /api/v1/admin/customers
router.get('/customers', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  const list = db.prepare(`
    SELECT c.id, c.name, c.phone, c.created_at, u.email
    FROM customers c JOIN users u ON c.user_id = u.id
    WHERE c.deleted_at IS NULL
    ORDER BY c.id LIMIT ? OFFSET ?
  `).all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) AS n FROM customers WHERE deleted_at IS NULL').get().n;
  res.json({
    success: true,
    data: list,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/v1/admin/subscription-packs
router.get('/subscription-packs', (req, res) => {
  const list = db.prepare(`
    SELECT id, name, description, sku, price, validity_months, created_at
    FROM subscription_packs WHERE deleted_at IS NULL ORDER BY id
  `).all();
  res.json({ success: true, data: list });
});

// GET /api/v1/admin/subscriptions
router.get('/subscriptions', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;
  const status = req.query.status;
  let sql = `
    SELECT s.id, s.customer_id, s.pack_id, s.status, s.requested_at, s.approved_at, s.assigned_at, s.expires_at,
           c.name AS customer_name, u.email AS customer_email, p.name AS pack_name, p.sku AS pack_sku
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN users u ON c.user_id = u.id
    JOIN subscription_packs p ON s.pack_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const list = db.prepare(sql).all(...params);
  let countSql = 'SELECT COUNT(*) AS n FROM subscriptions s WHERE 1=1';
  const countParams = status ? [status] : [];
  if (status) countSql += ' AND s.status = ?';
  const total = db.prepare(countSql).get(...countParams).n;
  res.json({
    success: true,
    data: list,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// POST /api/v1/admin/subscriptions/:id/approve
router.post('/subscriptions/:id/approve', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
  if (sub.status !== 'requested') return res.status(400).json({ success: false, message: 'Only requested subscriptions can be approved' });
  db.prepare("UPDATE subscriptions SET status = 'approved', approved_at = datetime('now') WHERE id = ?").run(id);
  const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.json({ success: true, data: updated, message: 'Approved' });
});

// POST /api/v1/admin/subscriptions/:id/assign
router.post('/subscriptions/:id/assign', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
  if (sub.status !== 'approved') return res.status(400).json({ success: false, message: 'Only approved subscriptions can be assigned' });
  const pack = db.prepare('SELECT validity_months FROM subscription_packs WHERE id = ?').get(sub.pack_id);
  const expiresAt = pack ? new Date(Date.now() + pack.validity_months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') : null;
  const active = db.prepare('SELECT id FROM subscriptions WHERE customer_id = ? AND status = ?').get(sub.customer_id, 'active');
  if (active) return res.status(400).json({ success: false, message: 'Customer already has an active subscription' });
  db.prepare(`
    UPDATE subscriptions SET status = 'active', assigned_at = datetime('now'), expires_at = ?
    WHERE id = ?
  `).run(expiresAt, id);
  const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.json({ success: true, data: updated, message: 'Assigned' });
});

// POST /api/v1/admin/subscriptions/:id/deactivate
router.post('/subscriptions/:id/deactivate', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
  if (sub.status !== 'active' && sub.status !== 'inactive') return res.status(400).json({ success: false, message: 'Only active/inactive can be deactivated' });
  db.prepare("UPDATE subscriptions SET status = 'inactive', deactivated_at = datetime('now') WHERE id = ?").run(id);
  const updated = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.json({ success: true, data: updated, message: 'Deactivated' });
});

// POST /api/v1/admin/subscription-packs
router.post('/subscription-packs', validateBody({
  name: { required: true, type: 'string' },
  sku: { required: true, type: 'string' },
  price: { required: true, type: 'number' },
  validity_months: { required: true, type: 'number' },
}), (req, res) => {
  const { name, description, sku, price, validity_months } = req.body;
  if (validity_months < 1 || validity_months > 12) {
    return res.status(400).json({ success: false, message: 'validity_months must be between 1 and 12' });
  }
  const existing = db.prepare('SELECT id FROM subscription_packs WHERE sku = ?').get(sku);
  if (existing) return res.status(409).json({ success: false, message: 'SKU already exists' });
  db.prepare(`
    INSERT INTO subscription_packs (name, description, sku, price, validity_months) VALUES (?, ?, ?, ?, ?)
  `).run(name || '', description || null, sku, price, validity_months);
  const created = db.prepare('SELECT * FROM subscription_packs WHERE sku = ?').get(sku);
  res.status(201).json({ success: true, data: created });
});

module.exports = router;
