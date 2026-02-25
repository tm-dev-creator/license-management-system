const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const loginSchema = { email: { required: true, type: 'email' }, password: { required: true, type: 'string' } };
const signupSchema = { email: { required: true, type: 'email' }, password: { required: true, type: 'string' }, name: { required: true, type: 'string' } };

// POST /api/customer/login
router.post('/customer/login', validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'customer');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  res.json({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
});

// POST /api/admin/login
router.post('/admin/login', validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'admin');
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  res.json({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
});

// POST /api/customer/signup
router.post('/customer/signup', validateBody(signupSchema), (req, res) => {
  const { email, password, name } = req.body;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const insertUser = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
  insertUser.run(email, hash, 'customer');
  const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);
  db.prepare('INSERT INTO customers (user_id, name) VALUES (?, ?)').run(user.id, name);
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, role: user.role } } });
});

module.exports = router;
