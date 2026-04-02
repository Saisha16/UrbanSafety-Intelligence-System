import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DebugPage = () => {
  const [status, setStatus] = useState({
    backend: 'checking...',
    ai: 'checking...',
    auth: 'checking...',
    features: []
  });

  useEffect(() => {
    checkAllServices();
  }, []);

  const checkAllServices = async () => {
    const features = [];
    
    // Check Backend
    try {
      const backendHealth = await axios.get('http://localhost:8080/api/health');
      setStatus(prev => ({ ...prev, backend: '✅ Connected' }));
      features.push('✅ Backend API');
    } catch (error) {
      setStatus(prev => ({ ...prev, backend: `❌ Error: ${error.message}` }));
      features.push('❌ Backend API');
    }

    // Check AI Service
    try {
      const aiHealth = await axios.get('http://localhost:8000/health');
      setStatus(prev => ({ ...prev, ai: '✅ Connected' }));
      features.push('✅ AI Service');
    } catch (error) {
      setStatus(prev => ({ ...prev, ai: `❌ Error: ${error.message}` }));
      features.push('❌ AI Service');
    }

    // Check Auth
    try {
      const authTest = await axios.post('http://localhost:8080/api/auth/login', {
        email: 'citizen@safeguard.ai',
        password: 'citizen123'
      });
      if (authTest.data.success) {
        setStatus(prev => ({ ...prev, auth: '✅ Login works', features }));
        
        // Test prediction with token
        try {
          const predTest = await axios.post('http://localhost:8080/api/predict', {
            latitude: 12.97,
            longitude: 77.59,
            hour: 14,
            day_of_week: 1,
            userRole: 'CITIZEN'
          }, {
            headers: { Authorization: `Bearer ${authTest.data.token}` }
          });
          features.push('✅ Prediction API');
        } catch (error) {
          features.push(`❌ Prediction API: ${error.response?.data?.message || error.message}`);
        }

        // Test safe route
        try {
          const routeTest = await axios.post('http://localhost:8080/api/safe-route', {
            startLat: 12.97,
            startLon: 77.59,
            endLat: 12.96,
            endLon: 77.60,
            hour: 14,
            userRole: 'CITIZEN'
          }, {
            headers: { Authorization: `Bearer ${authTest.data.token}` }
          });
          features.push('✅ Safe Route API');
        } catch (error) {
          features.push(`❌ Safe Route API: ${error.response?.data?.message || error.message}`);
        }
        
        setStatus(prev => ({ ...prev, features }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, auth: `❌ Error: ${error.message}`, features }));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 SafeGuard AI - System Debug</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2>Service Status</h2>
        <div><strong>Backend (Spring Boot):</strong> {status.backend}</div>
        <div><strong>AI Service (FastAPI):</strong> {status.ai}</div>
        <div><strong>Authentication:</strong> {status.auth}</div>
      </div>

      <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px' }}>
        <h2>Feature Tests</h2>
        {status.features.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {status.features.map((feature, idx) => (
              <li key={idx} style={{ padding: '5px 0' }}>{feature}</li>
            ))}
          </ul>
        ) : (
          <p>Running tests...</p>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Browser Console</h3>
        <p>Open browser DevTools (F12) → Console tab to see detailed logs</p>
        <p>Open Network tab to see API requests/responses</p>
      </div>

      <button 
        onClick={checkAllServices}
        style={{
          marginTop: '20px',
          padding: '12px 24px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🔄 Re-test All Services
      </button>

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#2196F3', textDecoration: 'none', fontSize: '18px' }}>
          ← Back to Main App
        </a>
      </div>
    </div>
  );
};

export default DebugPage;
