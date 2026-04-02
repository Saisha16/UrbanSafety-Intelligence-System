import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css';
import axios from 'axios';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState([]);
  
  const { login, register } = useAuth();

  useEffect(() => {
    fetchDemoCredentials();
  }, []);

  const fetchDemoCredentials = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/auth/demo-credentials');
      setDemoAccounts(response.data.demoAccounts);
    } catch (error) {
      console.error('Error fetching demo credentials:', error);
      // Fallback to hardcoded demo accounts
      setDemoAccounts([
        { role: 'CITIZEN', email: 'citizen@safeguard.ai', password: 'citizen123' },
        { role: 'POLICE', email: 'police@safeguard.ai', password: 'police123' },
        { role: 'GOVERNMENT', email: 'govt@safeguard.ai', password: 'govt123' },
        { role: 'BUSINESS', email: 'business@safeguard.ai', password: 'business123' }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || 'Invalid credentials');
      }
    } else {
      if (!name || !email || !password) {
        setError('All fields are required');
        return;
      }
      const result = await register(name, email, password);
      if (result.success) {
        setIsLogin(true);
        setError('');
        alert('Registration successful! Please login.');
      } else {
        setError(result.message || 'Registration failed');
      }
    }
  };

  const quickLogin = async (demoEmail, demoPassword) => {
    setError('');
    setEmail(demoEmail);
    setPassword(demoPassword);

    const result = await login(demoEmail, demoPassword);
    if (!result.success) {
      setError(result.message || 'Quick login failed');
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'CITIZEN': return '👥';
      case 'POLICE': return '🚔';
      case 'GOVERNMENT': return '🏛️';
      case 'BUSINESS': return '🚗';
      default: return '👤';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'CITIZEN': return '#4CAF50';
      case 'POLICE': return '#2196F3';
      case 'GOVERNMENT': return '#FF9800';
      case 'BUSINESS': return '#9C27B0';
      default: return '#757575';
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🛡️ SafeGuard AI</h1>
          <p>AI-Powered Crime Prevention Platform</p>
        </div>

        <div className="login-tabs">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        {isLogin && demoAccounts.length > 0 && (
          <div className="demo-section">
            <h3>Quick Login (Demo Accounts)</h3>
            <div className="demo-accounts">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  className="demo-account-btn"
                  style={{ borderColor: getRoleColor(account.role) }}
                  onClick={() => quickLogin(account.email, account.password)}
                >
                  <span className="role-icon">{getRoleIcon(account.role)}</span>
                  <div className="demo-account-info">
                    <strong>{account.role}</strong>
                    <small>{account.email}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
