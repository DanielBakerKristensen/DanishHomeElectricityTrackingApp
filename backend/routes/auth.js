const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Simple auth for single-user app
// GET /api/auth/status - Check if app is configured
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT refresh_token FROM app_config WHERE id = 1');
    const isConfigured = result.rows[0]?.refresh_token ? true : false;
    res.json({ configured: isConfigured });
  } catch (error) {
    console.error('Auth status error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/auth/configure - Set initial configuration
router.post('/configure', async (req, res) => {
  try {
    const { refreshToken, meteringPoints } = req.body;
    
    if (!refreshToken || !meteringPoints) {
      return res.status(400).json({ error: 'Refresh token and metering points required' });
    }

    await pool.query(
      'UPDATE app_config SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [refreshToken]
    );

    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    console.error('Configure error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
