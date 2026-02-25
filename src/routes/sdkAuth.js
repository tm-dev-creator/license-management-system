const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const loginSchema = { email: { required: true, type: 'email' }, password: { required: true, type: 'string' } };

// POST /sdk/auth/login - returns API key for SDK use
router.post('/login', validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'customer');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  const rawKey = config.apiKeyPrefix + uuidv4().replace(/-/g, '');
  const keyHash = bcrypt.hashSync(rawKey, 10);
  const keyPrefix = rawKey.slice(0, 20);
  db.prepare('INSERT INTO api_keys (user_id, key_hash, key_prefix) VALUES (?, ?, ?)').run(user.id, keyHash, keyPrefix);
  res.json({
    success: true,
    data: {
      api_key: rawKey,
      user: { id: user.id, email: user.email },
    },
  });
});

module.exports = router;
