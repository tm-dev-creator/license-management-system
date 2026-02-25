module.exports = {
  port: process.env.PORT || 8080,
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  apiKeyPrefix: 'sk-sdk-',
  dbPath: process.env.DB_PATH || require('path').join(__dirname, '..', 'data', 'subscriptions.db'),
};
