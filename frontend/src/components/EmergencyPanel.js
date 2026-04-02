import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmergencyPanel.css';

const EmergencyPanel = ({ 
  user, 
  journeyActive, 
  livePosition, 
  selectedRoute,
  onSOS,
  showEmergency,
  trackingMode = 'simulation',
  isGpsActive = false
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: '🚨 Police', number: '100', icon: '👮' },
    { name: '🏥 Ambulance', number: '102', icon: '🚑' },
    { name: '🔥 Fire', number: '101', icon: '🚒' },
    { name: '📞 Woman Helpline', number: '1091', icon: '👩' }
  ]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const authConfig = user?.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {};

  // Fetch emergency contacts from backend on component mount
  useEffect(() => {
    const fetchEmergencyContacts = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/analytics/emergency-contacts', authConfig);
        if (Array.isArray(response.data) && response.data.length > 0) {
          setEmergencyContacts(response.data);
        }
      } catch (error) {
        console.error('Error fetching emergency contacts:', error);
        // Keep fallback contacts if API fails
      }
      setContactsLoading(false);
    };

    fetchEmergencyContacts();
  }, []);

  const emergencyCall = (number) => {
    window.location.href = `tel:${number}`;
    setAlertMessage(`📞 Calling ${number}...`);
    setTimeout(() => setAlertMessage(''), 3000);
  };

  const generateShareUrl = () => {
    if (!livePosition) return '';
    return `https://maps.google.com/?q=${livePosition.lat},${livePosition.lng}`;
  };

  const getPathTypeLabel = () => {
    if (!selectedRoute || !selectedRoute.route_id) return 'Journey Active';
    const id = String(selectedRoute.route_id || '').toLowerCase();
    if (id.includes('safest')) return '🛡️ Safest Route';
    if (id.includes('direct')) return '⚡ Direct Route';
    if (id.includes('balanced')) return '⚖️ Balanced Route';
    return '📍 Active Route';
  };

  const shareVia = (method) => {
    const url = generateShareUrl();
    const routeInfo = selectedRoute ? `Traveling on ${getPathTypeLabel()}` : '';
    const message = `I'm currently traveling. Track my live location: ${url}. ${routeInfo}`;

    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(message)}`);
        break;
      case 'email':
        window.open(`mailto:?subject=Live Tracking&body=${encodeURIComponent(message)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(message);
        setAlertMessage('✅ Link copied to clipboard!');
        setTimeout(() => setAlertMessage(''), 2000);
        break;
      default:
        break;
    }
  };

  const handleSOS = async () => {
    try {
      // Send SOS to backend
      if (onSOS) {
        await onSOS({
          latitude: livePosition?.lat,
          longitude: livePosition?.lng,
          route: selectedRoute?.route_id,
          timestamp: new Date().toISOString()
        });
      }
      setAlertMessage('🚨 SOS Sent! Emergency services notified');
      setTimeout(() => setAlertMessage(''), 3000);
    } catch (err) {
      console.error('SOS failed:', err);
      setAlertMessage('❌ Failed to send SOS');
    }
  };

  if (!showEmergency) return null;

  return (
    <div className="emergency-panel">
      {/* Alert Message */}
      {alertMessage && <div className="alert-banner">{alertMessage}</div>}

      {/* SOS Button */}
      <button className="sos-button" onClick={handleSOS} title="Send Emergency SOS">
        🚨 SOS
      </button>

      {/* Emergency Contacts */}
      <div className="emergency-contacts">
        <h4>📞 Emergency Contacts</h4>
        <div className="contacts-grid">
          {emergencyContacts.map((contact) => (
            <button
              key={contact.number}
              className="emergency-contact-btn"
              onClick={() => emergencyCall(contact.number)}
              title={contact.name}
            >
              <span className="contact-icon">{contact.icon}</span>
              <span className="contact-number">{contact.number}</span>
            </button>
          ))}
        </div>
        {contactsLoading && <p style={{ fontSize: '0.8em', color: '#999', marginTop: '4px' }}>Loading contacts...</p>}
      </div>

      {/* Journey Info */}
      {journeyActive && livePosition && (
        <div className="journey-info">
          <h4>🗺️ Current Journey</h4>
          <div className="journey-details">
            <p><strong>Mode:</strong> {isGpsActive ? '📡 GPS Tracking' : '🎬 Simulation'}</p>
            <p><strong>Route Type:</strong> {getPathTypeLabel()}</p>
            <p><strong>Location:</strong> {livePosition.lat.toFixed(4)}, {livePosition.lng.toFixed(4)}</p>
            <p><strong>Status:</strong> <span className="status-active">🟢 Active</span></p>
          </div>
        </div>
      )}

      {/* Live Tracking Share */}
      <div className="tracking-share">
        <h4>📍 Share Live Tracking</h4>
        <button 
          className="toggle-share-btn"
          onClick={() => setShareOpen(!shareOpen)}
        >
          {shareOpen ? '✕ Close' : '+ Share'} Tracking
        </button>
        
        {shareOpen && (
          <div className="share-options">
            <button 
              className="share-btn whatsapp"
              onClick={() => shareVia('whatsapp')}
            >
              💬 WhatsApp
            </button>
            <button 
              className="share-btn sms"
              onClick={() => shareVia('sms')}
            >
              📱 SMS
            </button>
            <button 
              className="share-btn email"
              onClick={() => shareVia('email')}
            >
              ✉️ Email
            </button>
            <button 
              className="share-btn copy"
              onClick={() => shareVia('copy')}
            >
              📋 Copy Link
            </button>
            {livePosition && (
              <div className="location-link">
                <small>Current: {livePosition.lat.toFixed(4)}, {livePosition.lng.toFixed(4)}</small>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Tips */}
      <div className="security-tips">
        <h4>🔒 Safety Tips</h4>
        <ul>
          <li>✅ Share your live location with trusted contacts</li>
          <li>✅ Keep phone battery above 20%</li>
          <li>✅ Use well-lit, populated routes</li>
          <li>✅ Keep emergency numbers handy</li>
          <li>✅ Avoid using phone while walking</li>
          <li>✅ Trust your instincts - change route if unsafe</li>
        </ul>
      </div>
    </div>
  );
};

export default EmergencyPanel;
