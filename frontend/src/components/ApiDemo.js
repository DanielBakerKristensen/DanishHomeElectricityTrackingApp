import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ApiDemo.css';

const ApiDemo = () => {
    const [apiData, setApiData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Calculate date range (9 days ago to 2 days ago)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 2); // 2 days ago
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 7); // 7 days before that
            
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            console.log('Fetching data from', formatDate(startDate), 'to', formatDate(endDate));
            
            const response = await fetch(`/api/test-data?dateFrom=${formatDate(startDate)}&dateTo=${formatDate(endDate)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setApiData(data);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to fetch data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    // Process data for the chart
    const processChartData = (data) => {
        if (!data?.result?.[0]?.MyEnergyData_MarketDocument?.TimeSeries?.[0]) {
            return [];
        }

        const timeSeries = data.result[0].MyEnergyData_MarketDocument.TimeSeries[0];
        const periods = timeSeries.Period || [];
        const chartData = [];

        // Process all periods and points
        periods.forEach(period => {
            const points = period.Point || [];
            const periodStart = new Date(period.timeInterval.start);
            
            points.forEach((point, index) => {
                const pointDate = new Date(periodStart);
                pointDate.setHours(periodStart.getHours() + (point.position - 1));
                
                chartData.push({
                    timestamp: pointDate,
                    date: pointDate.toLocaleDateString('en-GB'),
                    time: pointDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
                    consumption: parseFloat(point['out_Quantity.quantity']),
                    quality: point['out_Quantity.quality']
                });
            });
        });

        // Sort by timestamp
        return chartData.sort((a, b) => a.timestamp - b.timestamp);
    };

    // Format X-axis tick (show date and time)
    const formatXAxis = (tickItem) => {
        const date = new Date(tickItem);
        return date.toLocaleDateString('en-GB', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-date">{data.date}</p>
                    <p className="tooltip-time">{data.time}</p>
                    <p className="tooltip-consumption">
                        <strong>Consumption:</strong> {data.consumption.toFixed(3)} kWh
                    </p>
                </div>
            );
        }
        return null;
    };

    const chartData = apiData ? processChartData(apiData) : [];

    return (
        <div className="api-demo">
            <div className="demo-header">
                <h2>📈 Electricity Consumption</h2>
                <p>Hourly consumption data for the past week</p>
                <button 
                    onClick={fetchData} 
                    disabled={loading}
                    className="fetch-button"
                >
                    {loading ? '⏳ Loading...' : '🔄 Refresh Data'}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <h3>❌ Error</h3>
                    <p>{error}</p>
                </div>
            )}

            <div className="chart-container">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={500}>
                        <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="timestamp"
                                tickFormatter={formatXAxis}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                            />
                            <YAxis 
                                label={{ 
                                    value: 'Consumption (kWh)', 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle' }
                                }}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="consumption"
                                name="Consumption (kWh)"
                                stroke="#8884d8"
                                dot={false}
                                activeDot={{ r: 4 }}
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="no-data">
                        {loading ? 'Loading data...' : 'No data available. Click "Refresh Data" to fetch consumption data.'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiDemo;
