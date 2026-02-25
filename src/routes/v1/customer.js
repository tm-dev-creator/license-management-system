const express = require('express');
const db = require('../../db');
const { requireJwt, requireCustomer } = require('../../middleware/auth');
const { validateBody } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });
router.use(requireJwt, requireCustomer);

function getCustomerId(userId) {
  const row = db.prepare('SELECT id FROM customers WHERE user_id = ? AND deleted_at IS NULL').get(userId);
  return row ? row.id : null;
}

// GET /api/v1/customer/profile
router.get('/profile', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer profile not found' });
  const customer = db.prepare(`
    SELECT c.id, c.name, c.phone, c.created_at, u.email
    FROM customers c JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(customerId);
  res.json({ success: true, data: customer });
});

// GET /api/v1/customer/subscription - current (active or most recent) subscription
router.get('/subscription', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer not found' });
  const sub = db.prepare(`
    SELECT s.id, s.status, s.requested_at, s.approved_at, s.assigned_at, s.expires_at, s.deactivated_at,
           p.name AS pack_name, p.sku AS pack_sku, p.price, p.validity_months
    FROM subscriptions s
    JOIN subscription_packs p ON s.pack_id = p.id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC LIMIT 1
  `).get(customerId);
  if (!sub) return res.json({ success: true, data: null });
  res.json({ success: true, data: sub });
});

// POST /api/v1/customer/subscription/request - request a new subscription by pack SKU
router.post('/subscription/request', validateBody({ sku: { required: true, type: 'string' } }), (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer not found' });
  const pack = db.prepare('SELECT id FROM subscription_packs WHERE sku = ? AND deleted_at IS NULL').get(req.body.sku);
  if (!pack) return res.status(404).json({ success: false, message: 'Pack not found' });
  const active = db.prepare('SELECT id FROM subscriptions WHERE customer_id = ? AND status = ?').get(customerId, 'active');
  if (active) return res.status(400).json({ success: false, message: 'Already have an active subscription' });
  db.prepare(`
    INSERT INTO subscriptions (customer_id, pack_id, status) VALUES (?, ?, 'requested')
  `).run(customerId, pack.id);
  const created = db.prepare(`
    SELECT s.id, s.status, s.requested_at, p.name AS pack_name, p.sku AS pack_sku
    FROM subscriptions s JOIN subscription_packs p ON s.pack_id = p.id
    WHERE s.customer_id = ? ORDER BY s.id DESC LIMIT 1
  `).get(customerId);
  res.status(201).json({ success: true, data: created, message: 'Subscription requested' });
});

module.exports = router;
