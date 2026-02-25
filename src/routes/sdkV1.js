const express = require('express');
const db = require('../db');
const { requireApiKey } = require('../middleware/auth');

const router = express.Router();
router.use(requireApiKey);

function getCustomerId(userId) {
  const row = db.prepare('SELECT id FROM customers WHERE user_id = ? AND deleted_at IS NULL').get(userId);
  return row ? row.id : null;
}

// GET /sdk/v1/subscription - current subscription for the SDK user
router.get('/subscription', (req, res) => {
  const customerId = getCustomerId(req.user.id);
  if (!customerId) return res.status(404).json({ success: false, message: 'Customer not found' });
  const sub = db.prepare(`
    SELECT s.id, s.status, s.requested_at, s.assigned_at, s.expires_at,
           p.name AS pack_name, p.sku AS pack_sku, p.price, p.validity_months
    FROM subscriptions s
    JOIN subscription_packs p ON s.pack_id = p.id
    WHERE s.customer_id = ?
    ORDER BY s.created_at DESC LIMIT 1
  `).get(customerId);
  res.json({ success: true, data: sub || null });
});

module.exports = router;
