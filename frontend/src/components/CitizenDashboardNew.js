import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MapPin,
  AlertCircle,
  Shield,
  LogOut,
  RefreshCw,
  Navigation2,
  Clock,
  TrendingUp,
  Zap,
  AlertTriangle,
  Check,
  ChevronDown,
} from 'lucide-react';
import axios from 'axios';

const CitizenDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('routes');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [journeyMode, setJourneyMode] = useState('gps');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [riskScore, setRiskScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const sidebarRef = useRef(null);

  // Initialize geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(false);
        },
        () => {
          setLocation({ latitude: 12.9716, longitude: 77.5946 });
          setLocationError(true);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocation({ latitude: 12.9716, longitude: 77.5946 });
      setLocationError(true);
    }
  }, []);

  // Fetch risk score
  useEffect(() => {
    if (location) {
      fetchRiskData();
    }
  }, [location]);

  const fetchRiskData = async () => {
    if (!location) return;
    try {
      const response = await axios.post('http://localhost:8080/api/risk/get-risk', {
        latitude: location.latitude,
        longitude: location.longitude,
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      });
      setRiskScore(response.data);
    } catch (error) {
      console.error('Risk fetch error:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!location) return;
    try {
      const response = await axios.post('http://localhost:8080/api/recommendations', {
        latitude: location.latitude,
        longitude: location.longitude,
        hour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      });
      const list = response.data.recommendations || response.data.for_users || [];
      setRecommendations(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Recommendations fetch error:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'tips') {
      fetchRecommendations();
    }
  }, [activeTab]);

  const getRiskColor = (level) => {
    if (!level) return 'bg-gray-100 text-gray-800';
    if (level === 'HIGH') return 'bg-red-50 border-red-200 text-red-900';
    if (level === 'MEDIUM') return 'bg-amber-50 border-amber-200 text-amber-900';
    return 'bg-green-50 border-green-200 text-green-900';
  };

  const getRiskBadgeColor = (level) => {
    if (!level) return 'bg-gray-200';
    if (level === 'HIGH') return 'bg-red-500';
    if (level === 'MEDIUM') return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex h-screen bg-gray-50 pt-16">
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center px-6 z-40">
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-6 h-6 text-blue-900" />
          <h1 className="text-xl font-bold text-blue-900">SafeGuard AI</h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-blue-50 text-blue-900 text-sm font-semibold rounded-full">
            CITIZEN
          </span>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <span className="text-sm text-gray-700">{user?.name || 'John Doe'}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Left Sidebar */}
      <div
        ref={sidebarRef}
        className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-sm"
      >
        <div className="p-6">
          {/* Greeting & Status */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.name?.split(' ')[0] || 'John'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>
                {location
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'Loading...'}
              </span>
              <button
                onClick={() => location && fetchRiskData()}
                className="ml-auto hover:text-gray-700 transition"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            {locationError && (
              <p className="text-xs text-amber-600 mt-1">
                📍 Using default location (Bangalore)
              </p>
            )}
          </div>

          {/* SOS Button */}
          <button className="w-full mb-6 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg animate-pulse-slow">
            🚨 SOS EMERGENCY
          </button>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {[
              { id: 'routes', label: 'Safe Routes', icon: Navigation2 },
              { id: 'risk', label: 'Current Risk', icon: AlertTriangle },
              { id: 'tips', label: 'Safety Tips', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`pb-3 px-3 text-sm font-medium transition flex items-center gap-1 ${
                  activeTab === id
                    ? 'text-blue-900 border-b-2 border-blue-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}

          {/* Safe Routes Tab */}
          {activeTab === 'routes' && (
            <div className="space-y-4">
              {/* Start Point Input */}
              <div className="relative">
                <div className="absolute left-3 top-3 text-green-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Start point"
                  value={startPoint}
                  onChange={(e) => setStartPoint(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Visual Connector */}
              <div className="flex justify-center">
                <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
              </div>

              {/* End Point Input */}
              <div className="relative">
                <div className="absolute left-3 top-3 text-red-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="End point"
                  value={endPoint}
                  onChange={(e) => setEndPoint(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Journey Mode Segmented Control */}
              <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                {['gps', 'simulation', 'snap'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setJourneyMode(mode)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition ${
                      journeyMode === mode
                        ? 'bg-white text-blue-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode === 'gps' && 'GPS Only'}
                    {mode === 'simulation' && 'Simulation'}
                    {mode === 'snap' && 'Snap-to-road'}
                  </button>
                ))}
              </div>

              {/* Settings Info */}
              <p className="text-xs text-gray-500">
                Mode: {journeyMode.toUpperCase()} | Speed: 18.0 km/h
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 py-2 px-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-950 transition text-sm">
                  Start Journey
                </button>
                <button className="flex-1 py-2 px-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition text-sm">
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Current Risk Tab */}
          {activeTab === 'risk' && riskScore && (
            <div
              className={`p-4 rounded-lg border ${getRiskColor(
                riskScore.risk_level
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">Current Risk Level</h3>
                <span
                  className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getRiskBadgeColor(
                    riskScore.risk_level
                  )}`}
                >
                  {riskScore.risk_level}
                </span>
              </div>
              <div className="text-2xl font-bold mb-2">
                {(riskScore.risk_score * 100).toFixed(0)}%
              </div>
              <p className="text-xs mb-3 opacity-75">
                Based on time, location, and crime patterns
              </p>
              {riskScore.factors && riskScore.factors.length > 0 && (
                <div className="text-xs">
                  <p className="font-semibold mb-1">Key Factors:</p>
                  <ul className="list-disc list-inside">
                    {riskScore.factors.slice(0, 3).map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Safety Tips Tab */}
          {activeTab === 'tips' && (
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.slice(0, 5).map((tip, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                    <p className="text-blue-900 font-medium">
                      {typeof tip === 'string' ? tip : tip.title || 'Safety Tip'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="space-y-2">
                  {[
                    { icon: '🌙', title: 'Night Safety', desc: 'Avoid isolated areas after dark.' },
                    { icon: '📍', title: 'Share Location', desc: 'Share your live location with trusted contacts.' },
                    { icon: '👥', title: 'Travel Together', desc: 'Travel with others when possible.' },
                  ].map((tip, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="font-semibold text-gray-900 text-xs mb-1">
                        {tip.icon} {tip.title}
                      </p>
                      <p className="text-gray-600 text-xs">{tip.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Map Area */}
      <div className="flex-1 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MapPin className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-gray-600 text-lg font-medium">Map View</p>
          <p className="text-gray-500 text-sm mt-1">Interactive map will appear here</p>
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default CitizenDashboard;
