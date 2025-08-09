const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/consumption/data - Get stored consumption data
router.get('/data', async (req, res) => {
  try {
    const { meteringPoint, dateFrom, dateTo, aggregation = 'Hour' } = req.query;
    
    let query = `
      SELECT 
        metering_point_id,
        timestamp,
        aggregation_level,
        quantity,
        quality,
        measurement_unit
      FROM consumption_data 
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (meteringPoint) {
      paramCount++;
      query += ` AND metering_point_id = $${paramCount}`;
      params.push(meteringPoint);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND timestamp >= $${paramCount}`;
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND timestamp <= $${paramCount}`;
      params.push(dateTo);
    }

    if (aggregation) {
      paramCount++;
      query += ` AND aggregation_level = $${paramCount}`;
      params.push(aggregation);
    }

    query += ` ORDER BY timestamp DESC LIMIT 1000`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get consumption data error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/consumption/store - Store consumption data from eloverblik
router.post('/store', async (req, res) => {
  try {
    const { meteringPointId, timeSeriesData, aggregation } = req.body;
    
    if (!meteringPointId || !timeSeriesData) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Process time series data
      for (const series of timeSeriesData) {
        if (series.Period && series.Period.length > 0) {
          for (const period of series.Period) {
            if (period.Point && period.Point.length > 0) {
              for (const point of period.Point) {
                const timestamp = new Date(period.timeInterval.start);
                timestamp.setHours(timestamp.getHours() + (point.position - 1));

                const rawQuantity = point['out_Quantity.quantity'];
                const quantity = rawQuantity != null ? parseFloat(rawQuantity) : null;

                await client.query(`
                  INSERT INTO consumption_data 
                  (metering_point_id, timestamp, aggregation_level, quantity, quality, business_type)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  ON CONFLICT (metering_point_id, timestamp, aggregation_level) 
                  DO UPDATE SET 
                    quantity = EXCLUDED.quantity,
                    quality = EXCLUDED.quality,
                    updated_at = CURRENT_TIMESTAMP
                `, [
                  meteringPointId,
                  timestamp,
                  aggregation || 'Hour',
                  quantity,
                  point['out_Quantity.quality'],
                  series.businessType
                ]);
              }
            }
          }
        }
      }
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Data stored successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Store consumption data error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/consumption/summary - Get consumption summary
router.get('/summary', async (req, res) => {
  try {
    const { meteringPoint, period = '30' } = req.query;
    
    const query = `
      SELECT 
        DATE(timestamp) as date,
        SUM(quantity) as total_consumption,
        AVG(quantity) as avg_consumption,
        COUNT(*) as data_points
      FROM consumption_data 
      WHERE timestamp >= CURRENT_DATE - INTERVAL '${period} days'
      ${meteringPoint ? 'AND metering_point_id = $1' : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `;
    
    const params = meteringPoint ? [meteringPoint] : [];
    const result = await pool.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get consumption summary error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
