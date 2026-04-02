import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './PoliceDashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PoliceDashboard = ({ user }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [demands, setDemands] = useState([]);
  const [activeTab, setActiveTab] = useState('heatmap');
  const [patrolForm, setPatrolForm] = useState({ title: '', zone: '', latitude: '', longitude: '', assignedUnit: '' });
  const [demandForm, setDemandForm] = useState({ title: '', description: '', category: 'PATROL_SUPPORT', priority: 'HIGH' });
  const [patrolBadge, setPatrolBadge] = useState(0);
  const [demandBadge, setDemandBadge] = useState(0);

  const authConfig = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

  const parseTs = (val) => {
    const t = Date.parse(val || '');
    return Number.isFinite(t) ? t : 0;
  };

  const coordToZone = (lat, lon) => `Zone ${Number(lat).toFixed(3)}, ${Number(lon).toFixed(3)}`;

  const getTopHotspots = () => {
    return [...heatmapData]
      .sort((a, b) => (b.risk_score || b.intensity || 0) - (a.risk_score || a.intensity || 0))
      .slice(0, 10);
  };

  const trendInsight = useMemo(() => {
    if (!trendsData.length) return null;
    const arr = trendsData.map((t) => ({ hour: Number(t.hour || 0), risk: Number(t.avg_risk || 0) }));
    const peak = arr.reduce((a, b) => (a.risk >= b.risk ? a : b));
    const safest = arr.reduce((a, b) => (a.risk <= b.risk ? a : b));
    return {
      peak,
      safest,
      recommendation: peak.risk > 0.7 ? 'Deploy additional units during peak hours and overlap shifts by 1 hour.' : 'Maintain balanced patrol and monitor spike windows.'
    };
  }, [trendsData]);

  const deploymentBuckets = useMemo(() => {
    const hotspots = getTopHotspots();
    const high = hotspots.filter((s) => (s.risk_score || s.intensity || 0) >= 0.75).slice(0, 3);
    const medium = hotspots.filter((s) => (s.risk_score || s.intensity || 0) >= 0.45 && (s.risk_score || s.intensity || 0) < 0.75).slice(0, 3);
    const low = hotspots.filter((s) => (s.risk_score || s.intensity || 0) < 0.45).slice(0, 3);
    return { high, medium, low };
  }, [heatmapData]);

  const fetchPoliceData = async () => {
    try {
      const [heatmapResponse, trendsResponse] = await Promise.all([
        axios.get('http://localhost:8080/api/heatmap'),
        axios.get('http://localhost:8080/api/analytics/trends')
      ]);

      const heatmap =
        heatmapResponse.data.heatmap ||
        heatmapResponse.data.heatmap_points ||
        heatmapResponse.data.hotspots ||
        [];
      setHeatmapData(heatmap);

      const trends = trendsResponse.data.trends || trendsResponse.data.hourly_trends || [];
      setTrendsData(trends);

      await Promise.all([fetchAlertsData(), fetchPatrolData(), fetchDemandsData()]);
    } catch (error) {
      console.error('Error fetching police data:', error);
    }
  };

  const fetchAlertsData = async () => {
    try {
      const [sosRes, incidentRes] = await Promise.all([
        axios.get('http://localhost:8080/api/sos?status=ACTIVE', authConfig),
        axios.get('http://localhost:8080/api/incidents?limit=25', authConfig),
      ]);
      setSosAlerts(Array.isArray(sosRes.data?.alerts) ? sosRes.data.alerts : []);
      setIncidentReports(Array.isArray(incidentRes.data?.incidents) ? incidentRes.data.incidents : []);
    } catch (error) {
      console.error('Error fetching alerts/incidents:', error);
    }
  };

  const fetchPatrolData = async () => {
    try {
      const patrolRes = await axios.get('http://localhost:8080/api/patrols?limit=50', authConfig);
      const list = Array.isArray(patrolRes.data?.patrols) ? patrolRes.data.patrols : [];
      setPatrols(list);
      const seenTs = Number(localStorage.getItem('police_patrol_seen_ts') || 0);
      setPatrolBadge(list.filter((p) => parseTs(p.updatedAt) > seenTs).length);
    } catch (error) {
      console.error('Error fetching patrols:', error);
    }
  };

  const fetchDemandsData = async () => {
    try {
      const demandRes = await axios.get('http://localhost:8080/api/demands?fromRole=POLICE&limit=30', authConfig);
      const list = Array.isArray(demandRes.data?.demands) ? demandRes.data.demands : [];
      setDemands(list);
      const seenTs = Number(localStorage.getItem('police_demand_seen_ts') || 0);
      setDemandBadge(list.filter((d) => d.status !== 'SUBMITTED' && parseTs(d.updatedAt) > seenTs).length);
    } catch (error) {
      console.error('Error fetching police demands:', error);
    }
  };

  useEffect(() => {
    fetchPoliceData();
    const interval = setInterval(fetchPoliceData, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'patrols') {
      localStorage.setItem('police_patrol_seen_ts', String(Date.now()));
      setPatrolBadge(0);
    }
    if (activeTab === 'demands') {
      localStorage.setItem('police_demand_seen_ts', String(Date.now()));
      setDemandBadge(0);
    }
  }, [activeTab]);

  const markIncidentInProgress = async (id) => {
    try {
      await axios.patch(`http://localhost:8080/api/incidents/${id}/status?status=IN_PROGRESS`, {}, authConfig);
      fetchAlertsData();
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const createPatrol = async () => {
    if (!patrolForm.title || !patrolForm.zone || !patrolForm.latitude || !patrolForm.longitude) {
      alert('Please fill patrol title, zone and coordinates.');
      return;
    }
    try {
      await axios.post('http://localhost:8080/api/patrols', {
        title: patrolForm.title,
        zone: patrolForm.zone,
        latitude: Number(patrolForm.latitude),
        longitude: Number(patrolForm.longitude),
        assignedUnit: patrolForm.assignedUnit,
        createdBy: user?.email || user?.name || 'police'
      }, authConfig);
      setPatrolForm({ title: '', zone: '', latitude: '', longitude: '', assignedUnit: '' });
      fetchPatrolData();
    } catch (error) {
      console.error('Failed to create patrol:', error);
      alert('Could not create patrol right now.');
    }
  };

  const updatePatrolProgress = async (id, progress) => {
    const status = progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'ASSIGNED';
    try {
      await axios.patch(`http://localhost:8080/api/patrols/${id}/progress?progress=${progress}&status=${status}`, {}, authConfig);
      fetchPatrolData();
    } catch (error) {
      console.error('Failed to update patrol progress:', error);
    }
  };

  const sendLivePatrolPing = async (patrol) => {
    const postPing = async (lat, lon, sourceLabel) => {
      try {
        await axios.post(
          `http://localhost:8080/api/patrols/${patrol.id}/ping`,
          {
            latitude: Number(lat),
            longitude: Number(lon),
            source: sourceLabel,
          },
          authConfig
        );
        fetchPatrolData();
      } catch (error) {
        console.error('Failed to send live patrol ping:', error);
        alert('Unable to send live patrol ping.');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => postPing(pos.coords.latitude, pos.coords.longitude, 'GPS_DEVICE'),
        () => postPing(patrol.latitude, patrol.longitude, 'TARGET_FALLBACK'),
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
      );
      return;
    }

    await postPing(patrol.latitude, patrol.longitude, 'TARGET_FALLBACK');
  };

  const submitPoliceDemand = async () => {
    if (!demandForm.title || !demandForm.description) {
      alert('Please fill demand title and description.');
      return;
    }
    try {
      await axios.post('http://localhost:8080/api/demands', {
        title: demandForm.title,
        description: demandForm.description,
        fromRole: 'POLICE',
        fromUser: user?.email || user?.name || 'police',
        category: demandForm.category,
        priority: demandForm.priority
      }, authConfig);
      setDemandForm({ title: '', description: '', category: 'PATROL_SUPPORT', priority: 'HIGH' });
      fetchDemandsData();
      alert('Demand submitted to government.');
    } catch (error) {
      console.error('Failed to submit demand:', error);
      alert('Could not submit demand right now.');
    }
  };

  return (
    <div className="police-dashboard">
      <div className="dashboard-header police-header">
        <h1>🚔 Police Command Center</h1>
        <p>Welcome, {user?.name}! Predictive policing and dynamic resource allocation dashboard.</p>
      </div>

      <div className="dashboard-tabs">
        <button className={activeTab === 'heatmap' ? 'active police-active' : ''} onClick={() => setActiveTab('heatmap')}>🗺️ Crime Hotspots</button>
        <button className={activeTab === 'trends' ? 'active police-active' : ''} onClick={() => setActiveTab('trends')}>📊 24h Trends</button>
        <button className={activeTab === 'deployment' ? 'active police-active' : ''} onClick={() => setActiveTab('deployment')}>🚓 Resource Deployment</button>
        <button className={activeTab === 'alerts' ? 'active police-active' : ''} onClick={() => setActiveTab('alerts')}>🚨 Live Alerts</button>
        <button className={activeTab === 'patrols' ? 'active police-active' : ''} onClick={() => setActiveTab('patrols')}>🛡️ Real Patrols {patrolBadge > 0 && <span className="tab-badge">{patrolBadge}</span>}</button>
        <button className={activeTab === 'demands' ? 'active police-active' : ''} onClick={() => setActiveTab('demands')}>📨 Police Demands {demandBadge > 0 && <span className="tab-badge">{demandBadge}</span>}</button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'heatmap' && (
          <div className="tab-content">
            <h2>Top Crime Hotspots (Real-Time)</h2>
            <p className="tab-description">High-risk areas requiring immediate attention based on live AI predictions.</p>
            <div className="hotspots-grid">
              {getTopHotspots().map((spot, index) => (
                <div key={index} className="hotspot-card">
                  <div className="hotspot-rank">#{index + 1}</div>
                  <div className="hotspot-info">
                    <p><strong>Location:</strong> {(spot.latitude || spot.lat).toFixed(4)}, {(spot.longitude || spot.lng).toFixed(4)}</p>
                    <div className="risk-bar">
                      <div
                        className="risk-fill"
                        style={{
                          width: `${((spot.risk_score || spot.intensity || 0) * 100)}%`,
                          background: (spot.risk_score || spot.intensity || 0) > 0.7 ? '#f44336' : (spot.risk_score || spot.intensity || 0) > 0.4 ? '#ff9800' : '#4caf50'
                        }}
                      />
                    </div>
                    <p className="risk-value">Risk: {(((spot.risk_score || spot.intensity || 0) * 100)).toFixed(1)}%</p>
                  </div>
                  <button
                    className="deploy-btn"
                    onClick={() => {
                      setPatrolForm({
                        ...patrolForm,
                        title: patrolForm.title || `Hotspot Patrol #${index + 1}`,
                        zone: patrolForm.zone || coordToZone(spot.latitude || spot.lat, spot.longitude || spot.lng),
                        latitude: String((spot.latitude || spot.lat).toFixed(6)),
                        longitude: String((spot.longitude || spot.lng).toFixed(6))
                      });
                      setActiveTab('patrols');
                    }}
                  >
                    Deploy Patrol
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="tab-content">
            <h2>24-Hour Crime Risk Trends</h2>
            <p className="tab-description">Hourly risk patterns to optimize patrol scheduling.</p>
            {trendsData.length > 0 && (
              <div className="charts-container">
                <ResponsiveContainer width="100%" height={380}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avg_risk" stroke="#2196F3" strokeWidth={3} name="Average Risk" />
                  </LineChart>
                </ResponsiveContainer>

                {trendInsight && (
                  <div className="insights-panel">
                    <h3>AI Insights (Live)</h3>
                    <div className="insight-card"><strong>Peak Risk Hour:</strong> {String(trendInsight.peak.hour).padStart(2, '0')}:00 ({(trendInsight.peak.risk * 100).toFixed(1)}%)</div>
                    <div className="insight-card"><strong>Safest Hour:</strong> {String(trendInsight.safest.hour).padStart(2, '0')}:00 ({(trendInsight.safest.risk * 100).toFixed(1)}%)</div>
                    <div className="insight-card"><strong>Recommendation:</strong> {trendInsight.recommendation}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deployment' && (
          <div className="tab-content">
            <h2>Recommended Resource Deployment</h2>
            <p className="tab-description">AI-optimized patrol allocation generated from current hotspots.</p>
            <div className="deployment-grid">
              <div className="deployment-card high-priority">
                <h3>High Priority Zones ({deploymentBuckets.high.length} units)</h3>
                <ul>
                  {deploymentBuckets.high.length === 0 && <li>No high priority zone right now</li>}
                  {deploymentBuckets.high.map((z, idx) => (
                    <li key={`high-${idx}`}>{coordToZone(z.latitude || z.lat, z.longitude || z.lng)} - {(100 * (z.risk_score || z.intensity || 0)).toFixed(1)}%</li>
                  ))}
                </ul>
              </div>
              <div className="deployment-card medium-priority">
                <h3>Medium Priority Zones ({deploymentBuckets.medium.length} units)</h3>
                <ul>
                  {deploymentBuckets.medium.length === 0 && <li>No medium priority zone right now</li>}
                  {deploymentBuckets.medium.map((z, idx) => (
                    <li key={`med-${idx}`}>{coordToZone(z.latitude || z.lat, z.longitude || z.lng)} - {(100 * (z.risk_score || z.intensity || 0)).toFixed(1)}%</li>
                  ))}
                </ul>
              </div>
              <div className="deployment-card low-priority">
                <h3>Standard Patrol ({deploymentBuckets.low.length} units)</h3>
                <ul>
                  {deploymentBuckets.low.length === 0 && <li>No low-risk zone available</li>}
                  {deploymentBuckets.low.map((z, idx) => (
                    <li key={`low-${idx}`}>{coordToZone(z.latitude || z.lat, z.longitude || z.lng)} - {(100 * (z.risk_score || z.intensity || 0)).toFixed(1)}%</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="tab-content">
            <h2>Live SOS Alerts and Incident Reports</h2>
            <p className="tab-description">Connected to backend incident store for active policing actions.</p>
            <div className="alerts-grid">
              <div className="alerts-column">
                <h3>🚨 Active SOS Alerts ({sosAlerts.length})</h3>
                {sosAlerts.length === 0 && <p className="empty-state">No active SOS alerts.</p>}
                {sosAlerts.map((alert) => (
                  <div key={`sos-${alert.id}`} className="alert-card critical">
                    <p><strong>Alert ID:</strong> {alert.id}</p>
                    <p><strong>User:</strong> {alert.userId}</p>
                    <p><strong>Location:</strong> {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}</p>
                    <p><strong>Status:</strong> {alert.status}</p>
                  </div>
                ))}
              </div>
              <div className="alerts-column">
                <h3>📝 Incident Reports ({incidentReports.length})</h3>
                {incidentReports.length === 0 && <p className="empty-state">No incidents reported.</p>}
                {incidentReports.map((incident) => (
                  <div key={`inc-${incident.id}`} className="alert-card">
                    <p><strong>ID:</strong> {incident.id} | <strong>Type:</strong> {incident.type}</p>
                    <p><strong>Severity:</strong> {incident.severity} | <strong>Status:</strong> {incident.status}</p>
                    <p><strong>Description:</strong> {incident.description}</p>
                    <p><strong>Location:</strong> {Number(incident.latitude).toFixed(4)}, {Number(incident.longitude).toFixed(4)}</p>
                    {incident.status !== 'IN_PROGRESS' && incident.status !== 'RESOLVED' && (
                      <button className="deploy-btn" onClick={() => markIncidentInProgress(incident.id)}>Mark In Progress</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patrols' && (
          <div className="tab-content">
            <h2>Real Patrol Planning and Progress</h2>
            <p className="tab-description">Create patrols and track progress as teams execute ground operations.</p>
            <div className="patrol-create-grid">
              <input placeholder="Patrol title" value={patrolForm.title} onChange={(e) => setPatrolForm({ ...patrolForm, title: e.target.value })} />
              <input placeholder="Zone" value={patrolForm.zone} onChange={(e) => setPatrolForm({ ...patrolForm, zone: e.target.value })} />
              <input placeholder="Latitude" type="number" value={patrolForm.latitude} onChange={(e) => setPatrolForm({ ...patrolForm, latitude: e.target.value })} />
              <input placeholder="Longitude" type="number" value={patrolForm.longitude} onChange={(e) => setPatrolForm({ ...patrolForm, longitude: e.target.value })} />
              <input placeholder="Assigned unit (optional)" value={patrolForm.assignedUnit} onChange={(e) => setPatrolForm({ ...patrolForm, assignedUnit: e.target.value })} />
              <button className="deploy-btn" onClick={createPatrol}>Create Patrol</button>
            </div>
            <div className="patrol-list">
              {patrols.length === 0 && <p className="empty-state">No patrol tasks yet.</p>}
              {patrols.map((patrol) => (
                <div key={`patrol-${patrol.id}`} className="patrol-card">
                  <div className="patrol-head">
                    <h4>{patrol.title}</h4>
                    <span className="patrol-status">{patrol.status}</span>
                  </div>
                  <p><strong>Zone:</strong> {patrol.zone}</p>
                  <p><strong>Unit:</strong> {patrol.assignedUnit || 'Not assigned'}</p>
                  <p><strong>Progress:</strong> {patrol.progress || 0}%</p>
                  {patrol.lastPingAt && (
                    <p>
                      <strong>Last Live Ping:</strong> {patrol.lastPingAt}
                      {patrol.distanceToTargetKm !== undefined ? ` | ${patrol.distanceToTargetKm} km to target` : ''}
                    </p>
                  )}
                  <div className="audit-timeline">
                    <strong>Audit Timeline</strong>
                    {(patrol.audit || []).slice().reverse().slice(0, 3).map((ev, idx) => (
                      <p key={`pa-${patrol.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action} | {ev.user}</p>
                    ))}
                  </div>
                  <button className="deploy-btn" onClick={() => sendLivePatrolPing(patrol)}>
                    Send Live GPS Ping
                  </button>
                  <input type="range" min="0" max="100" value={Number(patrol.progress || 0)} onChange={(e) => updatePatrolProgress(patrol.id, Number(e.target.value))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'demands' && (
          <div className="tab-content">
            <h2>Raise Demands to Government</h2>
            <p className="tab-description">Police requirements can be submitted and tracked for approval.</p>
            <div className="demand-form">
              <input placeholder="Demand title" value={demandForm.title} onChange={(e) => setDemandForm({ ...demandForm, title: e.target.value })} />
              <textarea rows="3" placeholder="Describe the requirement" value={demandForm.description} onChange={(e) => setDemandForm({ ...demandForm, description: e.target.value })} />
              <div className="demand-inline">
                <select value={demandForm.category} onChange={(e) => setDemandForm({ ...demandForm, category: e.target.value })}>
                  <option value="PATROL_SUPPORT">Patrol Support</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="STAFFING">Staffing</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                </select>
                <select value={demandForm.priority} onChange={(e) => setDemandForm({ ...demandForm, priority: e.target.value })}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <button className="deploy-btn" onClick={submitPoliceDemand}>Submit Demand</button>
              </div>
            </div>
            <div className="demand-list">
              {demands.length === 0 && <p className="empty-state">No police demands raised yet.</p>}
              {demands.map((d) => (
                <div key={`pdemand-${d.id}`} className="demand-card">
                  <p><strong>{d.title}</strong></p>
                  <p>{d.description}</p>
                  <p><strong>Status:</strong> {d.status} | <strong>Priority:</strong> {d.priority}</p>
                  {d.governmentNote && <p><strong>Gov Note:</strong> {d.governmentNote}</p>}
                  <div className="audit-timeline">
                    <strong>Audit Timeline</strong>
                    {(d.audit || []).slice().reverse().slice(0, 3).map((ev, idx) => (
                      <p key={`da-${d.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action} | {ev.user}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliceDashboard;
