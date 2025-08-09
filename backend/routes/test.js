const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_BASE_URL = 'https://api.eloverblik.dk/customerapi/api';

// Test endpoint to fetch and return raw API data
router.get('/test-data', async (req, res) => {
    try {
        console.log('🔍 Test endpoint called - fetching API data...');
        
        const REFRESH_TOKEN = process.env.ELOVERBLIK_REFRESH_TOKEN;
        const METERING_POINT_ID = process.env.ELOVERBLIK_METERING_POINTS;

        if (!REFRESH_TOKEN || !METERING_POINT_ID) {
            return res.status(500).json({
                error: 'Missing required environment variables',
                details: {
                    hasRefreshToken: !!REFRESH_TOKEN,
                    hasMeteringPoint: !!METERING_POINT_ID
                }
            });
        }

        // Step 1: Get Access Token
        console.log('📡 Getting access token...');
        const tokenResponse = await axios.get(`${API_BASE_URL}/token`, {
            headers: { 'Authorization': `Bearer ${REFRESH_TOKEN}` }
        });
        
        const accessToken = tokenResponse.data.result;
        console.log('✅ Access token obtained');

        // Step 2: Get date range from query params or default to 9 days ago to 2 days ago
        let endDate, startDate;
        
        if (req.query.dateFrom && req.query.dateTo) {
            // Use exact dates from query parameters
            startDate = new Date(req.query.dateFrom);
            endDate = new Date(req.query.dateTo);
        } else {
            // Default to 9 days ago to 2 days ago if no dates provided
            endDate = new Date();
            endDate.setDate(endDate.getDate() - 2); // 2 days ago
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7); // 7 days before that (9 days ago total)
        }
        
        const formatDate = (date) => {
            // Ensure we're working with a Date object
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const dateFrom = formatDate(startDate);
        const dateTo = formatDate(endDate);
        
        console.log(`📊 Fetching meter data from ${dateFrom} to ${dateTo}...`);
        
        // Validate date range (max 30 days as per API limits)
        const maxDays = 30;
        const diffTime = Math.abs(new Date(dateTo) - new Date(dateFrom));
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > maxDays) {
            return res.status(400).json({
                error: `Date range too large. Maximum ${maxDays} days allowed.`,
                received: diffDays + 1 // +1 because both start and end dates are inclusive
            });
        }
        
        const dataResponse = await axios.post(
            `${API_BASE_URL}/meterdata/gettimeseries/${dateFrom}/${dateTo}/Hour`,
            {
                "meteringPoints": {
                    "meteringPoint": [METERING_POINT_ID]
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Meter data retrieved successfully');
        
        // Return the raw API response with some metadata
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            dateRange: { from: dateFrom, to: dateTo },
            meteringPoint: METERING_POINT_ID,
            ...dataResponse.data
        });

    } catch (error) {
        console.error('❌ API Test Failed:', error.response?.data || error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
