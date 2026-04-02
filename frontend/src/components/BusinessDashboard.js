import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BusinessDashboard.css';

const BusinessDashboard = ({ user }) => {
  const [sourceLocation, setSourceLocation] = useState({ lat: '', lng: '' });
  const [destLocation, setDestLocation] = useState({ lat: '', lng: '' });
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [businessDemands, setBusinessDemands] = useState([]);
  const [approvedDemands, setApprovedDemands] = useState([]);
  const [demandForm, setDemandForm] = useState({
    title: '',
    description: '',
    category: 'INFRASTRUCTURE',
    priority: 'MEDIUM'
  });
  const [operationsBadge, setOperationsBadge] = useState(0);
  const [activeTab, setActiveTab] = useState('routing');
  const [fleetMetrics, setFleetMetrics] = useState({
    totalTrips: 0,
    safeRoutePercentage: 0,
    avgRiskScore: 0,
    incidentsAvoided: 0,
    loading: false
  });

  const authConfig = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

  const parseTs = (val) => {
    const t = Date.parse(val || '');
    return Number.isFinite(t) ? t : 0;
  };

  // Fetch fleet metrics from backend
  const fetchFleetMetrics = async () => {
    setFleetMetrics(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.get('http://localhost:8080/api/analytics/fleet-metrics', authConfig);
      const data = response.data || {};
      setFleetMetrics({
        totalTrips: data.totalTrips || data.total_trips_today || 0,
        safeRoutePercentage: data.safeRoutePercentage || data.safe_routes_percentage || 0,
        avgRiskScore: data.avgRiskScore || data.average_risk_score || 0,
        incidentsAvoided: data.incidentsAvoided || data.incidents_prevented || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching fleet metrics:', error);
      // Fallback to default values if API fails
      setFleetMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  React.useEffect(() => {
    if (activeTab === 'operations') {
      fetchBusinessDemands();
      localStorage.setItem('business_operations_seen_ts', String(Date.now()));
      setOperationsBadge(0);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab === 'analytics') {
      fetchFleetMetrics();
      // Refresh metrics every 30 seconds when on analytics tab
      const interval = setInterval(fetchFleetMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const calculateRoutes = async () => {
    if (!sourceLocation.lat || !sourceLocation.lng || !destLocation.lat || !destLocation.lng) {
      alert('Please enter all location coordinates');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/safe-route', {
        startLat: parseFloat(sourceLocation.lat),
        startLon: parseFloat(sourceLocation.lng),
        endLat: parseFloat(destLocation.lat),
        endLon: parseFloat(destLocation.lng),
        hour: new Date().getHours()
      });
      setRoutes(response.data.routes || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      alert('Failed to calculate routes');
    }
    setLoading(false);
  };

  const getRiskColor = (score) => {
    if (score > 0.7) return '#f44336';
    if (score > 0.4) return '#ff9800';
    return '#4caf50';
  };

  const fetchBusinessDemands = async () => {
    try {
      const [mine, approved] = await Promise.all([
        axios.get('http://localhost:8080/api/demands?fromRole=BUSINESS&limit=30', authConfig),
        axios.get('http://localhost:8080/api/demands?status=APPROVED&limit=50', authConfig)
      ]);
      setBusinessDemands(Array.isArray(mine.data?.demands) ? mine.data.demands : []);
      const approvedList = (Array.isArray(approved.data?.demands) ? approved.data.demands : []).filter((d) =>
          ['BUSINESS', 'CITIZEN', 'POLICE'].includes(String(d.fromRole || '').toUpperCase())
        );
      setApprovedDemands(approvedList);

      const seenTs = Number(localStorage.getItem('business_operations_seen_ts') || 0);
      const updates = approvedList.filter((d) => parseTs(d.updatedAt) > seenTs).length;
      setOperationsBadge(updates);
    } catch (error) {
      console.error('Error fetching business demands:', error);
    }
  };

  const submitBusinessDemand = async () => {
    if (!demandForm.title || !demandForm.description) {
      alert('Please enter title and description.');
      return;
    }

    try {
      await axios.post('http://localhost:8080/api/demands', {
        title: demandForm.title,
        description: demandForm.description,
        fromRole: 'BUSINESS',
        fromUser: user?.email || user?.name || 'business',
        category: demandForm.category,
        priority: demandForm.priority
      }, authConfig);
      setDemandForm({ title: '', description: '', category: 'INFRASTRUCTURE', priority: 'MEDIUM' });
      fetchBusinessDemands();
      alert('Business demand submitted to government.');
    } catch (error) {
      console.error('Error submitting business demand:', error);
      alert('Failed to submit business demand.');
    }
  };

  return (
    <div className="business-dashboard">
      <div className="dashboard-header business-header">
        <h1>🚗 Business API Portal</h1>
        <p>Welcome, {user.name}! Fleet management and safe routing for your business.</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'routing' ? 'active business-active' : ''} 
          onClick={() => setActiveTab('routing')}
        >
          🗺️ Route Planning
        </button>
        <button 
          className={activeTab === 'api' ? 'active business-active' : ''} 
          onClick={() => setActiveTab('api')}
        >
          🔌 API Integration
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active business-active' : ''} 
          onClick={() => setActiveTab('analytics')}
        >
          📊 Fleet Analytics
        </button>
        <button
          className={activeTab === 'operations' ? 'active business-active' : ''}
          onClick={() => setActiveTab('operations')}
        >
          🏢 Real Operations {operationsBadge > 0 && <span className="tab-badge">{operationsBadge}</span>}
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'routing' && (
          <div className="tab-content">
            <h2>Safe Route Calculator</h2>
            <p className="tab-description">
              Calculate the safest routes for your fleet vehicles
            </p>
            
            <div className="route-calculator">
              <div className="location-inputs">
                <div className="input-group">
                  <h3>📍 Pickup Location</h3>
                  <div className="coordinates">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Latitude"
                      value={sourceLocation.lat}
                      onChange={(e) => setSourceLocation({...sourceLocation, lat: e.target.value})}
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Longitude"
                      value={sourceLocation.lng}
                      onChange={(e) => setSourceLocation({...sourceLocation, lng: e.target.value})}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <h3>🎯 Drop-off Location</h3>
                  <div className="coordinates">
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Latitude"
                      value={destLocation.lat}
                      onChange={(e) => setDestLocation({...destLocation, lat: e.target.value})}
                    />
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="Longitude"
                      value={destLocation.lng}
                      onChange={(e) => setDestLocation({...destLocation, lng: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <button 
                className="calculate-btn" 
                onClick={calculateRoutes}
                disabled={loading}
              >
                {loading ? 'Calculating...' : 'Calculate Safe Routes'}
              </button>

              {routes.length > 0 && (
                <div className="routes-results">
                  <h3>Available Routes (Ranked by Safety)</h3>
                  <div className="routes-grid">
                    {routes.map((route, index) => (
                      <div key={index} className="route-option">
                        <div className="route-header">
                          <h4>Route {index + 1}</h4>
                          <span 
                            className="route-badge"
                            style={{ background: getRiskColor(route.risk_score) }}
                          >
                            {route.risk_score < 0.4 ? 'Safest' : 
                             route.risk_score < 0.7 ? 'Moderate' : 'Caution'}
                          </span>
                        </div>
                        <div className="route-details">
                          <p>📊 Risk Score: {(route.risk_score * 100).toFixed(1)}%</p>
                          <p>📏 Distance: {route.distance_km.toFixed(2)} km</p>
                          <p>⏱️ Est. Time: {route.estimated_time || `${Number(route.time_minutes || 0).toFixed(0)} min`}</p>
                        </div>
                        <button className="select-route-btn">Select Route</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="tab-content">
            <h2>API Integration Guide</h2>
            <p className="tab-description">
              Integrate SafeGuard AI into your business applications
            </p>
            
            <div className="api-section">
              <div className="api-card">
                <h3>🔑 Your API Key</h3>
                <code className="api-key">sk_live_9x8y7z6w5v4u3t2s1r0q</code>
                <button className="copy-btn">Copy</button>
              </div>

              <div className="api-endpoints">
                <h3>Available Endpoints</h3>
                
                <div className="endpoint-card">
                  <div className="method">POST</div>
                  <code>/api/predict</code>
                  <p>Predict crime risk for a location</p>
                </div>

                <div className="endpoint-card">
                  <div className="method">POST</div>
                  <code>/api/safe-route</code>
                  <p>Get safest routes between two points</p>
                </div>

                <div className="endpoint-card">
                  <div className="method">GET</div>
                  <code>/api/heatmap</code>
                  <p>Retrieve crime heatmap data</p>
                </div>
              </div>

              <div className="code-example">
                <h3>Example Integration (JavaScript)</h3>
                <pre><code>{`fetch('http://localhost:8080/api/safe-route', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_live_9x8y7z6w5v4u3t2s1r0q'
  },
  body: JSON.stringify({
    start_lat: 12.97,
    start_lon: 77.59,
    end_lat: 12.98,
    end_lon: 77.60
  })
})
.then(response => response.json())
.then(data => console.log(data.routes));`}</code></pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="tab-content">
            <h2>Fleet Safety Analytics</h2>
            <p className="tab-description">
              Monitor your fleet's safety performance
            </p>
            
            <div className="analytics-overview">
              <div className="metric-card">
                <h3>Total Trips Today</h3>
                <p className="metric-value">{fleetMetrics.loading ? '...' : fleetMetrics.totalTrips}</p>
              </div>
              <div className="metric-card">
                <h3>Safe Routes Used</h3>
                <p className="metric-value success">{fleetMetrics.loading ? '...' : `${fleetMetrics.safeRoutePercentage.toFixed(1)}%`}</p>
              </div>
              <div className="metric-card">
                <h3>Avg Risk Score</h3>
                <p className="metric-value">{fleetMetrics.loading ? '...' : `${(fleetMetrics.avgRiskScore * 100).toFixed(0)}%`}</p>
              </div>
              <div className="metric-card">
                <h3>Incidents Avoided</h3>
                <p className="metric-value success">{fleetMetrics.loading ? '...' : fleetMetrics.incidentsAvoided}</p>
              </div>
            </div>

            <div className="benefits-section">
              <h3>Business Benefits</h3>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon">🛡️</div>
                  <h4>Driver Safety</h4>
                  <p>Reduce incidents by routing through safer areas</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">💰</div>
                  <h4>Lower Insurance</h4>
                  <p>Demonstrate safety measures for better rates</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">⭐</div>
                  <h4>Customer Trust</h4>
                  <p>Provide customers with safer ride experiences</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon">📈</div>
                  <h4>Data Insights</h4>
                  <p>Make data-driven operational decisions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="tab-content">
            <h2>Business-Government Operations</h2>
            <p className="tab-description">Raise real operational demands and track approved actions.</p>

            <div className="business-ops-grid">
              <div className="ops-card">
                <h3>Raise Business Demand</h3>
                <input
                  placeholder="Demand title"
                  value={demandForm.title}
                  onChange={(e) => setDemandForm({ ...demandForm, title: e.target.value })}
                />
                <textarea
                  rows="3"
                  placeholder="Describe what your operations need"
                  value={demandForm.description}
                  onChange={(e) => setDemandForm({ ...demandForm, description: e.target.value })}
                />
                <div className="ops-inline">
                  <select value={demandForm.category} onChange={(e) => setDemandForm({ ...demandForm, category: e.target.value })}>
                    <option value="INFRASTRUCTURE">Infrastructure</option>
                    <option value="TRAFFIC_CONTROL">Traffic Control</option>
                    <option value="SECURITY_COVERAGE">Security Coverage</option>
                    <option value="POLICY_SUPPORT">Policy Support</option>
                  </select>
                  <select value={demandForm.priority} onChange={(e) => setDemandForm({ ...demandForm, priority: e.target.value })}>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <button className="calculate-btn" onClick={submitBusinessDemand}>Submit</button>
                </div>
              </div>

              <div className="ops-card">
                <h3>Your Submitted Demands</h3>
                <div className="ops-list">
                  {businessDemands.length === 0 && <p>No business demands yet.</p>}
                  {businessDemands.map((d) => (
                    <div key={`bd-${d.id}`} className="ops-item">
                      <strong>{d.title}</strong>
                      <p>{d.description}</p>
                      <p>Status: {d.status} | Priority: {d.priority}</p>
                      {d.governmentNote && <p>Gov Note: {d.governmentNote}</p>}
                      <div className="audit-timeline">
                        {(d.audit || []).slice().reverse().slice(0, 3).map((ev, idx) => (
                          <p key={`ba-${d.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ops-card" style={{ marginTop: '16px' }}>
              <h3>Approved Actions Across City</h3>
              <div className="ops-list">
                {approvedDemands.length === 0 && <p>No approved demands yet.</p>}
                {approvedDemands.map((d) => (
                  <div key={`ad-${d.id}`} className="ops-item">
                    <strong>{d.title}</strong>
                    <p>From: {d.fromRole} | Category: {d.category}</p>
                    <p>{d.description}</p>
                    <div className="audit-timeline">
                      {(d.audit || []).slice().reverse().slice(0, 3).map((ev, idx) => (
                        <p key={`aa-${d.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessDashboard;
