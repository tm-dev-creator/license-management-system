const Database = require('better-sqlite3');
const config = require('./config');
const path = require('path');
const fs = require('fs');

const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(config.dbPath);
db.pragma('foreign_keys = ON');

module.exports = db;
