// Vercel serverless: use writable /tmp for SQLite
if (!process.env.DB_PATH) {
  process.env.DB_PATH = '/tmp/subscriptions.db';
}

module.exports = require('../server');
