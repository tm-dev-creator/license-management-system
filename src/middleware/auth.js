const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('../db');

function requireJwt(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing or invalid Authorization header' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

function requireCustomer(req, res, next) {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'Customer access required' });
  }
  next();
}

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !apiKey.startsWith(config.apiKeyPrefix)) {
    return res.status(401).json({ success: false, message: 'Missing or invalid X-API-Key' });
  }
  const prefix = apiKey.slice(0, 20);
  const row = db.prepare('SELECT * FROM api_keys WHERE key_prefix = ?').get(prefix);
  if (!row || !bcrypt.compareSync(apiKey, row.key_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }
  const user = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(row.user_id);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }
  req.user = { id: user.id, email: user.email, role: user.role };
  req.apiKeyId = row.id;
  next();
}

module.exports = {
  requireJwt,
  requireAdmin,
  requireCustomer,
  requireApiKey,
};
