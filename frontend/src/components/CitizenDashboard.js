import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './CitizenDashboard.css';
import MapView from './MapView';

const CitizenDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('map');
  const [riskScore, setRiskScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [explainData, setExplainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [notice, setNotice] = useState('');
  const [showIncidentReport, setShowIncidentReport] = useState(false);
  const [incidentType, setIncidentType] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [sosSubmitting, setSosSubmitting] = useState(false);
  const [citizenDemands, setCitizenDemands] = useState([]);
  const [demandSubmitting, setDemandSubmitting] = useState(false);
  const [demandBadge, setDemandBadge] = useState(0);
  const [demandForm, setDemandForm] = useState({
    title: '',
    description: '',
    category: 'SAFETY',
    priority: 'MEDIUM'
  });

  const payload = useMemo(() => {
    if (!location) return null;
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      userRole: user?.role || 'CITIZEN'
    };
  }, [location, user]);

  const authConfig = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

  const parseTs = (val) => {
    const t = Date.parse(val || '');
    return Number.isFinite(t) ? t : 0;
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
        },
        () => {
          setLocation({ latitude: 12.9716, longitude: 77.5946 });
          setLocationError('Using default location (Bangalore).');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocation({ latitude: 12.9716, longitude: 77.5946 });
      setLocationError('Geolocation not supported. Using default location.');
    }
  }, []);

  useEffect(() => {
    if (payload) {
      fetchRiskAndExplain();
    }
  }, [payload]);

  useEffect(() => {
    if (activeTab === 'tips' && payload) {
      fetchRecommendations();
    }
    if (activeTab === 'demands') {
      fetchCitizenDemands();
    }
  }, [activeTab, payload]);

  useEffect(() => {
    if (activeTab === 'demands') {
      localStorage.setItem('citizen_demand_seen_ts', String(Date.now()));
      setDemandBadge(0);
    }
  }, [activeTab]);

  const normalizeRisk = (raw) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return n > 1 ? n / 100 : n;
  };

  const fetchRiskAndExplain = async () => {
    if (!payload) return;
    setLoading(true);
    try {
      const [riskRes, explainRes] = await Promise.all([
        axios.post('http://localhost:8080/api/predict', payload),
        axios.post('http://localhost:8080/api/explain', payload),
      ]);

      setRiskScore({
        ...riskRes.data,
        risk_score: normalizeRisk(riskRes.data?.risk_score),
      });
      setExplainData(explainRes.data);
      setNotice('');
    } catch (error) {
      const fallback = error?.response?.data;
      if (fallback && (fallback.risk_score !== undefined || fallback.risk_level)) {
        setRiskScore({
          ...fallback,
          risk_level: String(fallback.risk_level || 'MEDIUM').toUpperCase(),
          risk_score: normalizeRisk(fallback.risk_score ?? 0.5),
        });
        setNotice('AI service is temporarily unavailable. Showing fallback estimate.');
      } else {
        setNotice('Could not fetch live AI response right now.');
      }
      console.error('Citizen risk/explain fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!payload) return;
    try {
      const res = await axios.post('http://localhost:8080/api/recommendations', payload);
      const list =
        res.data?.recommendations ||
        res.data?.for_users ||
        res.data?.risk_assessment?.recommendations ||
        [];
      setRecommendations(Array.isArray(list) ? list : []);
    } catch (error) {
      const fallback = error?.response?.data?.recommendations;
      setRecommendations(
        Array.isArray(fallback)
          ? fallback
          : [
              'Stay in well-lit areas',
              'Travel in groups when possible',
              'Keep emergency contacts ready',
            ]
      );
      console.error('Citizen recommendations fetch error:', error);
    }
  };

  const featureImportance = useMemo(() => {
    const source =
      explainData?.explanation?.feature_importance ||
      explainData?.explanation?.global_feature_importance;
    if (!source) return [];
    if (Array.isArray(source)) return source;
    return Object.entries(source).map(([feature, impact]) => ({ feature, impact }));
  }, [explainData]);

  const explainContext = explainData?.explanation?.input_context;

  const handleSOS = async () => {
    if (!location || sosSubmitting) return;
    setSosSubmitting(true);
    try {
      const res = await axios.post('http://localhost:8080/api/sos', {
        userId: user?.email || 'citizen',
        latitude: location.latitude,
        longitude: location.longitude,
      }, authConfig);
      setNotice(`SOS sent successfully (Alert ID: ${res.data?.alertId || 'N/A'})`);
    } catch (err) {
      console.error('SOS failed:', err);
      setNotice('Failed to send SOS. Please try again.');
    } finally {
      setSosSubmitting(false);
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!location || !incidentType || !incidentDescription.trim() || incidentSubmitting) return;
    setIncidentSubmitting(true);
    try {
      const res = await axios.post('http://localhost:8080/api/incidents', {
        incidentType,
        description: incidentDescription,
        latitude: location.latitude,
        longitude: location.longitude,
        reportedBy: user?.email || 'citizen',
      }, authConfig);
      setNotice(`Incident reported successfully (ID: ${res.data?.incidentId || 'N/A'})`);
      setShowIncidentReport(false);
      setIncidentType('');
      setIncidentDescription('');
    } catch (err) {
      console.error('Incident report failed:', err);
      setNotice('Failed to report incident. Please try again.');
    } finally {
      setIncidentSubmitting(false);
    }
  };

  const fetchCitizenDemands = async () => {
    try {
      const res = await axios.get('http://localhost:8080/api/demands?fromRole=CITIZEN&limit=30', authConfig);
      const list = Array.isArray(res.data?.demands) ? res.data.demands : [];
      setCitizenDemands(list);

      const seenTs = Number(localStorage.getItem('citizen_demand_seen_ts') || 0);
      const updates = list.filter((d) => d.status !== 'SUBMITTED' && parseTs(d.updatedAt) > seenTs).length;
      setDemandBadge(updates);
    } catch (err) {
      console.error('Failed to fetch citizen demands:', err);
    }
  };

  const submitCitizenDemand = async (e) => {
    e.preventDefault();
    if (demandSubmitting || !demandForm.title || !demandForm.description) return;
    setDemandSubmitting(true);
    try {
      await axios.post('http://localhost:8080/api/demands', {
        title: demandForm.title,
        description: demandForm.description,
        fromRole: 'CITIZEN',
        fromUser: user?.email || user?.name || 'citizen',
        category: demandForm.category,
        priority: demandForm.priority
      }, authConfig);
      setDemandForm({ title: '', description: '', category: 'SAFETY', priority: 'MEDIUM' });
      fetchCitizenDemands();
      setNotice('Demand submitted to government successfully.');
    } catch (err) {
      console.error('Demand submit failed:', err);
      setNotice('Failed to submit demand. Please try again.');
    } finally {
      setDemandSubmitting(false);
    }
  };

  return (
    <div className="citizen-dashboard">
      <div className="dashboard-header">
        <h1>👥 Citizen Safety Dashboard</h1>
        <p>Welcome, {user?.name}! AI-powered route planning and risk awareness.</p>

        {location && (
          <div className="location-status">
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            <button onClick={fetchRiskAndExplain} className="refresh-location">Refresh AI</button>
          </div>
        )}
        {locationError && <div className="location-error">⚠️ {locationError}</div>}
        {notice && <div className="location-error">ℹ️ {notice}</div>}
        <div className="emergency-controls">
          <button className="sos-button" onClick={handleSOS} disabled={sosSubmitting}>
            {sosSubmitting ? 'Sending SOS...' : '🚨 SOS EMERGENCY'}
          </button>
          <button className="report-button" onClick={() => setShowIncidentReport(true)}>
            📝 Report Incident
          </button>
        </div>
      </div>

      {showIncidentReport && (
        <div className="modal-overlay" onClick={() => setShowIncidentReport(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>📝 Report Incident</h2>
            <form onSubmit={handleIncidentSubmit}>
              <div className="form-group">
                <label>Incident Type</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} required>
                  <option value="">Select incident type</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="harassment">Harassment</option>
                  <option value="vandalism">Vandalism</option>
                  <option value="suspicious_activity">Suspicious Activity</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  rows="4"
                  placeholder="Describe what happened"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="submit-button" disabled={incidentSubmitting}>
                  {incidentSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button type="button" className="cancel-button" onClick={() => setShowIncidentReport(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-tabs">
        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => setActiveTab('map')}>
          🗺️ Safe Routes
        </button>
        <button className={activeTab === 'risk' ? 'active' : ''} onClick={() => setActiveTab('risk')}>
          ⚠️ Current Risk
        </button>
        <button className={activeTab === 'xai' ? 'active' : ''} onClick={() => setActiveTab('xai')}>
          🧠 Explainable AI
        </button>
        <button className={activeTab === 'tips' ? 'active' : ''} onClick={() => setActiveTab('tips')}>
          💡 Safety Tips
        </button>
        <button className={activeTab === 'demands' ? 'active' : ''} onClick={() => setActiveTab('demands')}>
          📨 Raise Demand {demandBadge > 0 && <span className="tab-badge">{demandBadge}</span>}
        </button>
        <button className={activeTab === 'emergency' ? 'active' : ''} onClick={() => setActiveTab('emergency')}>
          🚨 Emergency
        </button>
      </div>

      <div className="dashboard-content fullscreen">
        {activeTab === 'map' && (
          <div className="tab-content fullscreen map-tab-content">
            <MapView user={user} />
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="tab-content">
            <h2>Your Current Location Risk</h2>
            {loading ? (
              <div className="loading-container"><p>Loading risk analysis...</p></div>
            ) : riskScore ? (
              <div className="risk-card">
                <div
                  className="risk-score"
                  style={{
                    background:
                      riskScore.risk_level === 'HIGH'
                        ? '#f44336'
                        : riskScore.risk_level === 'MEDIUM'
                        ? '#ff9800'
                        : '#4caf50',
                  }}
                >
                  <h3>{(normalizeRisk(riskScore.risk_score) * 100).toFixed(0)}%</h3>
                  <p>{riskScore.risk_level || 'MEDIUM'} Risk</p>
                </div>
                <div className="risk-details">
                  <p><strong>Method:</strong> {riskScore.prediction_method || 'ML Model'}</p>
                  <p><strong>Nearby incidents:</strong> {riskScore.nearby_incidents ?? 'N/A'}</p>
                  <p><strong>Top factors:</strong> {(riskScore.factors || []).slice(0, 2).join(', ') || 'Normal conditions'}</p>
                </div>
              </div>
            ) : (
              <div className="error-container"><p>Unable to load risk data.</p></div>
            )}
          </div>
        )}

        {activeTab === 'xai' && (
          <div className="tab-content">
            <h2>Explainable AI Insights</h2>
            {explainData?.explanation ? (
              <div className="xai-panel">
                <p className="xai-method"><strong>Method:</strong> {explainData.explanation.method}</p>
                <p className="xai-method">{explainData.explanation.interpretation}</p>
                {explainContext && (
                  <p className="xai-method">
                    <strong>Context:</strong> hour {explainContext.hour}, nearby incidents {explainContext.nearby_incidents_700m ?? 'n/a'}, night {String(explainContext.is_night)}
                  </p>
                )}

                <div className="xai-features">
                  {featureImportance.slice(0, 6).map((item, idx) => {
                    const pct = Math.max(0, Math.min(100, Math.round(Number(item.impact || 0) * 100)));
                    return (
                      <div key={`${item.feature}-${idx}`} className="xai-feature-item">
                        <div className="xai-row">
                          <span>{String(item.feature).replaceAll('_', ' ')}</span>
                          <strong>{pct}%</strong>
                        </div>
                        <div className="xai-bar-track">
                          <div className="xai-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="error-container"><p>Explainability data is not available yet.</p></div>
            )}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="tab-content">
            <h2>AI Safety Recommendations</h2>
            <div className="recommendations-list">
              {(recommendations.length ? recommendations : ['Stay alert', 'Prefer well-lit routes', 'Share live location']).map((tip, idx) => (
                <div key={`${idx}-${tip}`} className="recommendation-card">
                  <h4>Tip {idx + 1}</h4>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'demands' && (
          <div className="tab-content">
            <h2>Raise Safety Demands to Government</h2>
            <p className="tab-description">Citizens can submit demands and track approval progress.</p>

            <form className="demand-panel" onSubmit={submitCitizenDemand}>
              <input
                placeholder="Demand title"
                value={demandForm.title}
                onChange={(e) => setDemandForm({ ...demandForm, title: e.target.value })}
                required
              />
              <textarea
                placeholder="Describe your demand"
                rows="3"
                value={demandForm.description}
                onChange={(e) => setDemandForm({ ...demandForm, description: e.target.value })}
                required
              />
              <div className="demand-row">
                <select value={demandForm.category} onChange={(e) => setDemandForm({ ...demandForm, category: e.target.value })}>
                  <option value="SAFETY">Safety</option>
                  <option value="LIGHTING">Street Lighting</option>
                  <option value="TRANSPORT">Transport Security</option>
                  <option value="SURVEILLANCE">Surveillance</option>
                </select>
                <select value={demandForm.priority} onChange={(e) => setDemandForm({ ...demandForm, priority: e.target.value })}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <button className="submit-button" type="submit" disabled={demandSubmitting}>
                  {demandSubmitting ? 'Submitting...' : 'Submit Demand'}
                </button>
              </div>
            </form>

            <div className="demand-history">
              {citizenDemands.length === 0 && <p className="tab-description">No demands submitted yet.</p>}
              {citizenDemands.map((demand) => (
                <div key={`cdemand-${demand.id}`} className="demand-history-card">
                  <h4>{demand.title}</h4>
                  <p>{demand.description}</p>
                  <p><strong>Status:</strong> {demand.status} | <strong>Priority:</strong> {demand.priority}</p>
                  {demand.governmentNote && <p><strong>Gov Note:</strong> {demand.governmentNote}</p>}
                  <div className="audit-timeline">
                    <strong>Audit Timeline</strong>
                    {(demand.audit || []).slice().reverse().slice(0, 3).map((ev, idx) => (
                      <p key={`ca-${demand.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action} | {ev.user}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="tab-content emergency-tab">
            <h2>🚨 Emergency Resources & Safety</h2>
            <div className="emergency-resource-grid">
              {/* Emergency Hotlines */}
              <div className="resource-card emergency-hotlines">
                <h3>📞 Emergency Hotlines</h3>
                <div className="hotline-buttons">
                  <button className="hotline-btn police" onClick={() => window.location.href = 'tel:100'} title="Call Police">
                    <span className="number">100</span>
                    <span className="label">🚨 Police</span>
                  </button>
                  <button className="hotline-btn ambulance" onClick={() => window.location.href = 'tel:102'} title="Call Ambulance">
                    <span className="number">102</span>
                    <span className="label">🏥 Ambulance</span>
                  </button>
                  <button className="hotline-btn fire" onClick={() => window.location.href = 'tel:101'} title="Call Fire">
                    <span className="number">101</span>
                    <span className="label">🔥 Fire</span>
                  </button>
                  <button className="hotline-btn women" onClick={() => window.location.href = 'tel:1091'} title="Call Women Helpline">
                    <span className="number">1091</span>
                    <span className="label">👩 Women</span>
                  </button>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="resource-card safety-tips">
                <h3>💡 Safety Tips</h3>
                <ul>
                  <li>✓ Always inform someone of your travel plans</li>
                  <li>✓ Keep your phone charged and location sharing enabled</li>
                  <li>✓ Travel in groups, especially after dark</li>
                  <li>✓ Use well-lit and populated routes</li>
                  <li>✓ Trust your instincts and alter your route if uncomfortable</li>
                  <li>✓ Keep emergency contacts saved in your phone</li>
                </ul>
              </div>

              {/* Document Important Info */}
              <div className="resource-card important-docs">
                <h3>📋 Important Documents</h3>
                <p>Keep copies of:</p>
                <ul>
                  <li>Identity proof (Aadhar/Passport)</li>
                  <li>Address proof</li>
                  <li>Emergency contact information</li>
                  <li>Medical history and allergies</li>
                  <li>Insurance details</li>
                </ul>
              </div>

              {/* Quick Reporting */}
              <div className="resource-card incident-report">
                <h3>📝 Report Incident</h3>
                <p>If you witness any suspicious activity or crime, you can report it here.</p>
                <button 
                  className="report-btn"
                  onClick={() => setShowIncidentReport(true)}
                  style={{marginTop: '12px'}}
                >
                  📢 Report Incident
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;
