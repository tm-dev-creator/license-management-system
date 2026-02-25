function validateBody(schema) {
  return (req, res, next) => {
    const { body } = req;
    for (const [key, rules] of Object.entries(schema)) {
      const value = body[key];
      if (rules.required && (value === undefined || value === null || value === '')) {
        return res.status(400).json({ success: false, message: `Missing or invalid: ${key}` });
      }
      if (value !== undefined && value !== null && rules.type) {
        const t = typeof value;
        if (rules.type === 'string' && t !== 'string') {
          return res.status(400).json({ success: false, message: `${key} must be a string` });
        }
        if (rules.type === 'number' && t !== 'number') {
          return res.status(400).json({ success: false, message: `${key} must be a number` });
        }
        if (rules.type === 'email' && (t !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
          return res.status(400).json({ success: false, message: `${key} must be a valid email` });
        }
      }
    }
    next();
  };
}

module.exports = { validateBody };
