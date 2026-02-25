-- SQLite-compatible schema (no ENUM; use TEXT + CHECK)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscription_packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    price REAL NOT NULL,
    validity_months INTEGER NOT NULL CHECK (validity_months BETWEEN 1 AND 12),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    pack_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'active', 'inactive', 'expired')),
    requested_at TEXT DEFAULT (datetime('now')),
    approved_at TEXT NULL,
    assigned_at TEXT NULL,
    expires_at TEXT NULL,
    deactivated_at TEXT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (pack_id) REFERENCES subscription_packs(id) ON DELETE CASCADE
);

-- API keys for SDK auth (one per user/session)
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pack_id ON subscriptions(pack_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_packs_sku ON subscription_packs(sku);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);

-- Trigger to update updated_at on users
CREATE TRIGGER IF NOT EXISTS users_updated_at AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS customers_updated_at AFTER UPDATE ON customers
BEGIN
    UPDATE customers SET updated_at = datetime('now') WHERE id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS subscription_packs_updated_at AFTER UPDATE ON subscription_packs
BEGIN
    UPDATE subscription_packs SET updated_at = datetime('now') WHERE id = NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS subscriptions_updated_at AFTER UPDATE ON subscriptions
BEGIN
    UPDATE subscriptions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
