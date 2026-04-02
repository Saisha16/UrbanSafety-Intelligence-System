import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GovtDashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const GovtDashboard = ({ user }) => {
  const [trendsData, setTrendsData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [demands, setDemands] = useState([]);
  const [patrols, setPatrols] = useState([]);
  const [govNote, setGovNote] = useState({});
  const [demandBadge, setDemandBadge] = useState(0);
  const [activeTab, setActiveTab] = useState('analytics');
  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [policySummary, setPolicySummary] = useState({});
  const [infrastructureProjects, setInfrastructureProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSummary, setProjectSummary] = useState({});

  const authConfig = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

  const parseTs = (val) => {
    const t = Date.parse(val || '');
    return Number.isFinite(t) ? t : 0;
  };

  useEffect(() => {
    fetchGovtData();
  }, []);

  useEffect(() => {
    if (activeTab === 'demands') {
      localStorage.setItem('gov_demand_seen_ts', String(Date.now()));
      setDemandBadge(0);
    }
  }, [activeTab]);

  const fetchGovtData = async () => {
    try {
      const trendsResponse = await axios.get('http://localhost:8080/api/analytics/trends');
      setTrendsData(trendsResponse.data.trends || trendsResponse.data.hourly_trends || []);

      const heatmapResponse = await axios.get('http://localhost:8080/api/heatmap');
      setHeatmapData(
        heatmapResponse.data.heatmap ||
        heatmapResponse.data.heatmap_points ||
        heatmapResponse.data.hotspots ||
        []
      );

      const [demandsRes, patrolRes, policiesRes, summaryRes, projectsRes, projectSummaryRes] = await Promise.all([
        axios.get('http://localhost:8080/api/demands?limit=100', authConfig),
        axios.get('http://localhost:8080/api/patrols?limit=100', authConfig),
        axios.get('http://localhost:8080/api/policies', authConfig),
        axios.get('http://localhost:8080/api/policies/analytics/summary', authConfig),
        axios.get('http://localhost:8080/api/infrastructure', authConfig),
        axios.get('http://localhost:8080/api/infrastructure/analytics/summary', authConfig)
      ]);
      const demandList = Array.isArray(demandsRes.data?.demands) ? demandsRes.data.demands : [];
      setDemands(demandList);
      setPatrols(Array.isArray(patrolRes.data?.patrols) ? patrolRes.data.patrols : []);
      setPolicies(Array.isArray(policiesRes.data?.policies) ? policiesRes.data.policies : []);
      setPolicySummary(summaryRes.data || {});
      setInfrastructureProjects(Array.isArray(projectsRes.data?.projects) ? projectsRes.data.projects : []);
      setProjectSummary(projectSummaryRes.data || {});

      const seenTs = Number(localStorage.getItem('gov_demand_seen_ts') || 0);
      const updates = demandList.filter((d) => d.status === 'SUBMITTED' && parseTs(d.updatedAt) > seenTs).length;
      setDemandBadge(updates);
    } catch (error) {
      console.error('Error fetching government data:', error);
    }
  };

  const updateDemandStatus = async (id, status) => {
    try {
      const note = govNote[id] || '';
      const query = `status=${status}${note ? `&governmentNote=${encodeURIComponent(note)}` : ''}`;
      await axios.patch(`http://localhost:8080/api/demands/${id}/status?${query}`, {}, authConfig);
      fetchGovtData();
    } catch (error) {
      console.error('Error updating demand status:', error);
      alert('Failed to update demand status.');
    }
  };

  const voteOnPolicy = async (policyId, approve) => {
    try {
      const userId = user?.email || 'anonymous';
      const response = await axios.put(
        `http://localhost:8080/api/policies/${policyId}/vote`,
        { userId, approve },
        authConfig
      );
      console.log('✅ Vote recorded', response.data);
      fetchGovtData();
    } catch (error) {
      console.error('Error voting on policy:', error);
      alert('Failed to vote on policy. You may have already voted.');
    }
  };

  const updatePolicyStatus = async (policyId, newStatus) => {
    try {
      await axios.put(
        `http://localhost:8080/api/policies/${policyId}/status`,
        { status: newStatus },
        authConfig
      );
      console.log('✅ Policy status updated to', newStatus);
      fetchGovtData();
    } catch (error) {
      console.error('Error updating policy status:', error);
      alert('Failed to update policy status.');
    }
  };

  const approveInfrastructureProject = async (projectId, approve) => {
    try {
      const userId = user?.email || 'anonymous';
      const response = await axios.put(
        `http://localhost:8080/api/infrastructure/${projectId}/approve`,
        { userId, approve },
        authConfig
      );
      console.log('✅ Approval recorded', response.data);
      fetchGovtData();
    } catch (error) {
      console.error('Error approving project:', error);
      alert('Failed to approve project. You may have already approved.');
    }
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      await axios.put(
        `http://localhost:8080/api/infrastructure/${projectId}/status`,
        { status: newStatus },
        authConfig
      );
      console.log('✅ Project status updated to', newStatus);
      fetchGovtData();
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Failed to update project status.');
    }
  };

  const getDistrictStats = () => {
    if (heatmapData.length === 0) return [];
    
    const high = heatmapData.filter(d => (d.risk_score || d.intensity || 0) > 0.7).length;
    const medium = heatmapData.filter(d => (d.risk_score || d.intensity || 0) > 0.4 && (d.risk_score || d.intensity || 0) <= 0.7).length;
    const low = heatmapData.filter(d => (d.risk_score || d.intensity || 0) <= 0.4).length;
    
    return [
      { name: 'High Risk', value: high, color: '#f44336' },
      { name: 'Medium Risk', value: medium, color: '#ff9800' },
      { name: 'Low Risk', value: low, color: '#4caf50' }
    ];
  };

  return (
    <div className="govt-dashboard">
      <div className="dashboard-header govt-header">
        <h1>🏛️ Government Analytics Portal</h1>
        <p>Welcome, {user.name}! Data-driven insights for urban planning and policy.</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'analytics' ? 'active govt-active' : ''} 
          onClick={() => setActiveTab('analytics')}
        >
          📊 Crime Analytics
        </button>
        <button 
          className={activeTab === 'infrastructure' ? 'active govt-active' : ''} 
          onClick={() => setActiveTab('infrastructure')}
        >
          🏗️ Infrastructure Planning
        </button>
        <button 
          className={activeTab === 'demands' ? 'active govt-active' : ''} 
          onClick={() => setActiveTab('demands')}
        >
          📨 Demand Approvals {demandBadge > 0 && <span className="tab-badge">{demandBadge}</span>}
        </button>
        <button
          className={activeTab === 'policy' ? 'active govt-active' : ''}
          onClick={() => setActiveTab('policy')}
        >
          📋 Policy Recommendations
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'analytics' && (
          <div className="tab-content">
            <h2>Crime Distribution Analytics</h2>
            <p className="tab-description">
              Comprehensive crime risk analysis across all districts
            </p>
            
            <div className="analytics-grid">
              <div className="chart-card">
                <h3>Risk Distribution by Area</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getDistrictStats()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getDistrictStats().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="stats-cards">
                <div className="stat-card">
                  <h3>Total Areas Analyzed</h3>
                  <p className="stat-value">{heatmapData.length}</p>
                </div>
                <div className="stat-card">
                  <h3>High Risk Zones</h3>
                  <p className="stat-value critical">{heatmapData.filter(d => (d.risk_score || d.intensity || 0) > 0.7).length}</p>
                </div>
                <div className="stat-card">
                  <h3>Safe Zones</h3>
                  <p className="stat-value safe">{heatmapData.filter(d => (d.risk_score || d.intensity || 0) <= 0.4).length}</p>
                </div>
              </div>
            </div>

            {trendsData.length > 0 && (
              <div className="chart-card full-width">
                <h3>24-Hour Risk Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_risk" fill="#FF9800" name="Average Risk Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'infrastructure' && (
          <div className="tab-content">
            <h2>AI-Recommended Infrastructure Improvements</h2>
            <p className="tab-description">
              Strategic infrastructure investments to improve public safety
            </p>

            {/* Project Summary Stats */}
            <div className="project-summary-stats">
              <div className="stat-box">
                <span className="stat-label">Total Projects</span>
                <span className="stat-value">{projectSummary.totalProjects || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Approved</span>
                <span className="stat-value">{projectSummary.approved || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{projectSummary.pending || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">In Progress</span>
                <span className="stat-value">{projectSummary.inProgress || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Total Approvals</span>
                <span className="stat-value">{projectSummary.totalApprovals || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Avg Approval %</span>
                <span className="stat-value">{projectSummary.avgApprovalPercentage || 0}%</span>
              </div>
            </div>

            <div className="infrastructure-recommendations">
              {infrastructureProjects.length === 0 ? (
                <p className="tab-description">Loading infrastructure projects...</p>
              ) : (
                infrastructureProjects.map((project) => (
                  <div key={`project-${project.id}`} className={`infra-card priority-${project.priority.toLowerCase()}`}>
                    <div className="infra-icon">{project.icon}</div>
                    <h3>{project.title}</h3>
                    <p><strong>Description:</strong> {project.description}</p>
                    <p><strong>Priority:</strong> {project.priority}</p>
                    <p><strong>Target Areas:</strong> {project.targetAreas?.join(', ')}</p>
                    <p><strong>Estimated Impact:</strong> {project.estimatedImpact}</p>
                    <p><strong>Budget:</strong> {project.budget}</p>

                    {/* Approval Section */}
                    <div className="approval-section">
                      <div className="approval-display">
                        <span className="approval-stat">
                          👍 {project.approvalsFor} approvals
                        </span>
                        <span className="approval-stat">
                          👎 {project.approvalsAgainst} objections
                        </span>
                        <span className="approval-percentage">
                          ✓ {project.approvalPercentage}% approval
                        </span>
                      </div>
                      <div className="approval-buttons">
                        <button 
                          className="approve-btn approve"
                          onClick={() => approveInfrastructureProject(project.id, true)}
                          title="Approve this project"
                        >
                          👍 Approve
                        </button>
                        <button 
                          className="approve-btn object"
                          onClick={() => approveInfrastructureProject(project.id, false)}
                          title="Object to this project"
                        >
                          👎 Object
                        </button>
                      </div>
                    </div>

                    {/* Project Status */}
                    <div className={`project-status ${project.status.toLowerCase()}`}>
                      Status: {project.status.replace(/_/g, ' ')}
                    </div>

                    {/* Status Update */}
                    <div className="project-actions">
                      <select 
                        className="status-select"
                        value={project.status}
                        onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'demands' && (
          <div className="tab-content">
            <h2>Citizen and Police Demands</h2>
            <p className="tab-description">Approve, reject, or move demands into implementation.</p>

            <div className="policy-list">
              {demands.length === 0 && <p className="tab-description">No demands submitted yet.</p>}
              {demands.map((demand) => (
                <div key={`gdemand-${demand.id}`} className="policy-card">
                  <div className="policy-number">{demand.id}</div>
                  <div className="policy-content">
                    <h3>{demand.title}</h3>
                    <p><strong>From:</strong> {demand.fromRole} ({demand.fromUser})</p>
                    <p><strong>Priority:</strong> {demand.priority} | <strong>Category:</strong> {demand.category}</p>
                    <p>{demand.description}</p>
                    <p><strong>Status:</strong> {demand.status}</p>
                    <input
                      type="text"
                      placeholder="Government note"
                      value={govNote[demand.id] || ''}
                      onChange={(e) => setGovNote({ ...govNote, [demand.id]: e.target.value })}
                      className="gov-note-input"
                    />
                    <div className="gov-actions">
                      <button className="approve-btn" onClick={() => updateDemandStatus(demand.id, 'IN_PROGRESS')}>Mark In Progress</button>
                      <button className="approve-btn" onClick={() => updateDemandStatus(demand.id, 'APPROVED')}>Approve</button>
                      <button className="approve-btn reject" onClick={() => updateDemandStatus(demand.id, 'REJECTED')}>Reject</button>
                    </div>
                    <div className="audit-timeline">
                      <strong>Audit Timeline</strong>
                      {(demand.audit || []).slice().reverse().slice(0, 4).map((ev, idx) => (
                        <p key={`ga-${demand.id}-${idx}`}>{ev.timestamp} | {ev.role} | {ev.action} | {ev.user}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'policy' && (
          <div className="tab-content">
            <h2>Evidence-Based Policy Recommendations</h2>
            <p className="tab-description">
              Data-driven policy suggestions from AI analysis with community voting
            </p>

            {/* Policy Summary Stats */}
            <div className="policy-summary-stats">
              <div className="stat-box">
                <span className="stat-label">Total Policies</span>
                <span className="stat-value">{policySummary.totalPolicies || 0}</span>
              </div>
              <div className="stat-box approved">
                <span className="stat-label">Approved</span>
                <span className="stat-value">{policySummary.approved || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Under Review</span>
                <span className="stat-value">{policySummary.underReview || 0}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Total Votes</span>
                <span className="stat-value">{policySummary.totalVotes || 0}</span>
              </div>
            </div>
            
            <div className="policy-list">
              {policies.length === 0 ? (
                <p className="tab-description">Loading policies...</p>
              ) : (
                policies.map((policy, index) => (
                  <div key={`policy-${policy.id}`} className="policy-card">
                    <div className="policy-number">{index + 1}</div>
                    <div className="policy-content">
                      <h3>{policy.title}</h3>
                      {policy.description && <p className="policy-desc">{policy.description}</p>}
                      <p><strong>📊 Evidence:</strong> {policy.evidence}</p>
                      <p><strong>✅ Recommendation:</strong> {policy.recommendation}</p>
                      <p><strong>🎯 Expected Outcome:</strong> {policy.expectedOutcome}</p>
                      
                      {/* Voting Section */}
                      <div className="voting-section">
                        <div className="vote-display">
                          <span className="vote-stat">
                            👍 {policy.votesFor} votes for
                          </span>
                          <span className="vote-stat">
                            👎 {policy.votesAgainst} votes against
                          </span>
                          <span className="approval-percentage">
                            ✓ {policy.getApprovalPercentage ? policy.getApprovalPercentage() : Math.round((policy.votesFor / (policy.votesFor + policy.votesAgainst)) * 100) || 0}% approval
                          </span>
                        </div>
                        <div className="vote-buttons">
                          <button 
                            className="vote-btn approve"
                            onClick={() => voteOnPolicy(policy.id, true)}
                            title="Vote to support this policy"
                          >
                            👍 Support
                          </button>
                          <button 
                            className="vote-btn reject"
                            onClick={() => voteOnPolicy(policy.id, false)}
                            title="Vote to oppose this policy"
                          >
                            👎 Oppose
                          </button>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`policy-status ${policy.status.toLowerCase()}`}>
                        Status: {policy.status.replace(/_/g, ' ')}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="policy-actions">
                        <select 
                          className="status-select"
                          value={policy.status}
                          onChange={(e) => updatePolicyStatus(policy.id, e.target.value)}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovtDashboard;
