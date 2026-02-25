const express = require('express');
const path = require('path');
const config = require('./src/config');

const apiAuth = require('./src/routes/apiAuth');
const apiV1 = require('./src/routes/v1');
const sdkAuth = require('./src/routes/sdkAuth');
const sdkV1 = require('./src/routes/sdkV1');

const app = express();
app.use(express.json());

// Frontend auth (no JWT)
app.use('/api', apiAuth);
// Frontend dashboard (JWT)
app.use('/api/v1', apiV1);

// SDK auth (returns API key)
app.use('/sdk/auth', sdkAuth);
// SDK endpoints (API key)
app.use('/sdk/v1', sdkV1);

// Health
app.get('/health', (req, res) => res.json({ success: true, message: 'OK' }));

// Serve minimal UI
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Only listen when run directly (not when required by Vercel serverless)
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    console.log('  Frontend auth: POST /api/customer/login, /api/admin/login, /api/customer/signup');
    console.log('  SDK auth:      POST /sdk/auth/login (returns API key)');
  });
}

module.exports = app;
