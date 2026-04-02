import React, { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import "./Dashboard.css";

function Dashboard() {
    const [riskData, setRiskData] = useState(null);
    const [explanation, setExplanation] = useState(null);
    const [recommendations, setRecommendations] = useState(null);
    const [trends, setTrends] = useState(null);
    const [safeRoute, setSafeRoute] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all data
        const fetchData = async () => {
            try {
                // Get risk prediction with explanation
                const payload = {
                    latitude: 12.97,
                    longitude: 77.59,
                    hour: new Date().getHours(),
                    day_of_week: new Date().getDay()
                };

                const riskRes = await axios.post("http://localhost:8080/api/predict", payload);
                setRiskData(riskRes.data);

                const explainRes = await axios.post("http://localhost:8080/api/explain", payload);
                setExplanation(explainRes.data);

                const recRes = await axios.post("http://localhost:8080/api/recommendations", payload);
                setRecommendations(recRes.data);

                const trendRes = await axios.get("http://localhost:8080/api/analytics/trends");
                setTrends(trendRes.data);

                // Get safe route
                const routePayload = {
                    start_lat: 12.97,
                    start_lon: 77.59,
                    end_lat: 12.98,
                    end_lon: 77.60,
                    current_hour: new Date().getHours()
                };
                const routeRes = await axios.post("http://localhost:8080/api/safe-route", routePayload);
                setSafeRoute(routeRes.data);

                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="loading">Loading advanced analytics...</div>;
    }

    return (
        <div className="dashboard">
            {/* Risk Score Card */}
            <div className="risk-card" style={{ borderLeft: `5px solid ${riskData?.risk_color}` }}>
                <h2>Current Risk Assessment</h2>
                <div className="risk-score-large" style={{ color: riskData?.risk_color }}>
                    {(riskData?.risk_score * 100).toFixed(0)}%
                </div>
                <div className="risk-level">{riskData?.risk_level} RISK</div>
                <div className="confidence">Confidence: {(riskData?.confidence * 100).toFixed(0)}%</div>
                <div className="timestamp">Last updated: {new Date().toLocaleTimeString()}</div>
            </div>

            {/* AI Explanation Section */}
            {explanation && (
                <div className="explanation-card">
                    <h2>🔍 AI Explanation (XAI)</h2>
                    <p className="model-info">Model: {explanation.explanation?.model_type}</p>
                    <div className="feature-importance">
                        <h3>Feature Importance (SHAP-style)</h3>
                        {explanation.explanation?.feature_importance?.map((feature, idx) => (
                            <div key={idx} className="feature-item">
                                <span className="feature-name">{feature.feature}</span>
                                <span className="feature-impact" style={{ 
                                    color: feature.impact.includes('+') ? '#ff4444' : '#44ff44' 
                                }}>
                                    {feature.impact}
                                </span>
                                <p className="feature-desc">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Risk Factors */}
            <div className="factors-card">
                <h2>⚠️ Key Risk Factors</h2>
                <ul className="factors-list">
                    {riskData?.factors?.map((factor, idx) => (
                        <li key={idx}>{factor}</li>
                    ))}
                </ul>
            </div>

            {/* Safe Route Recommendation */}
            {safeRoute && (
                <div className="route-card">
                    <h2>🛣️ Safe Route Recommendations</h2>
                    <p className="algo-info">Algorithm: {safeRoute.algorithm}</p>
                    <div className="routes-container">
                        {safeRoute.routes?.map((route, idx) => (
                            <div 
                                key={idx} 
                                className={`route-option ${route.route_id === safeRoute.recommended?.route_id ? 'recommended' : ''}`}
                            >
                                <div className="route-header">
                                    <h3>Route {route.route_id}</h3>
                                    {route.route_id === safeRoute.recommended?.route_id && (
                                        <span className="recommended-badge">✓ Recommended</span>
                                    )}
                                </div>
                                <div className="route-details">
                                    <span>📍 {route.distance_km} km</span>
                                    <span>⏱️ {route.estimated_time}</span>
                                    <span style={{ color: route.risk_level === 'LOW' ? '#44ff44' : '#ff4444' }}>
                                        🔒 {route.risk_level} Risk ({(route.risk_score * 100).toFixed(0)}%)
                                    </span>
                                </div>
                                <p className="route-desc">{route.description}</p>
                                {route.safety_features && (
                                    <div className="safety-features">
                                        {route.safety_features.map((feature, i) => (
                                            <span key={i} className="feature-badge">✓ {feature}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hourly Trends Chart */}
            {trends && (
                <div className="trends-card">
                    <h2>📊 24-Hour Risk Trends</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends.hourly_trends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
                            <YAxis label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="average_risk" stroke="#8884d8" strokeWidth={2} name="Average Risk" />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="trend-insights">
                        <p>🌙 Peak Risk Hours: {trends.peak_risk_hours?.join(', ')}</p>
                        <p>☀️ Safest Hours: {trends.safest_hours?.join(', ')}</p>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {recommendations && (
                <div className="recommendations-section">
                    <div className="recommendations-card user-rec">
                        <h2>👤 For Users</h2>
                        <ul>
                            {recommendations.for_users?.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="recommendations-card authority-rec">
                        <h2>🚓 For Authorities</h2>
                        <ul>
                            {recommendations.for_authorities?.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
