const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../config/database');

const ELOVERBLIK_BASE_URL = 'https://api.eloverblik.dk/customerapi/api';

// Helper function to get access token
async function getAccessToken() {
  try {
    const result = await pool.query(
      'SELECT refresh_token, access_token, token_expires_at FROM app_config WHERE id = 1'
    );
    
    if (!result.rows[0]?.refresh_token) {
      throw new Error('No refresh token configured');
    }

    const config = result.rows[0];
    const now = new Date();
    
    // Check if current token is still valid (with 5 minute buffer)
    if (config.access_token && config.token_expires_at && 
        new Date(config.token_expires_at) > new Date(now.getTime() + 5 * 60 * 1000)) {
      return config.access_token;
    }

    // Get new access token
    const response = await axios.get(`${ELOVERBLIK_BASE_URL}/token`, {
      headers: {
        'Authorization': `Bearer ${config.refresh_token}`
      }
    });

    const accessToken = response.data.result;
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Save new token
    await pool.query(
      'UPDATE app_config SET access_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [accessToken, expiresAt]
    );

    return accessToken;
  } catch (error) {
    console.error('Token error:', error);
    throw error;
  }
}

// GET /api/eloverblik/metering-points - Get metering points
router.get('/metering-points', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios.get(`${ELOVERBLIK_BASE_URL}/meteringpoints/meteringpoints`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Metering points error:', error);
    res.status(500).json({ error: 'Failed to fetch metering points' });
  }
});

// POST /api/eloverblik/consumption - Get consumption data
router.post('/consumption', async (req, res) => {
  try {
    const { meteringPoints, dateFrom, dateTo, aggregation = 'Hour' } = req.body;
    
    if (!meteringPoints || !dateFrom || !dateTo) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const accessToken = await getAccessToken();
    
    const response = await axios.post(
      `${ELOVERBLIK_BASE_URL}/meterdata/gettimeseries/${dateFrom}/${dateTo}/${aggregation}`,
      {
        meteringPoints: {
          meteringPoint: Array.isArray(meteringPoints) ? meteringPoints : [meteringPoints]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Consumption data error:', error);
    res.status(500).json({ error: 'Failed to fetch consumption data' });
  }
});

module.exports = router;
