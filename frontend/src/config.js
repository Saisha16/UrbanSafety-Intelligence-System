// SafeGuard AI - Configuration
const config = {
  // Auto-login settings
  AUTO_LOGIN_ENABLED: false, // Keep false for normal login/register flow
  AUTO_LOGIN_USER: {
    email: 'citizen@safeguard.ai',
    password: 'citizen123',
    role: 'CITIZEN'
  },

  // API settings
  BACKEND_URL: 'http://localhost:8080',
  AI_SERVICE_URL: 'http://localhost:8000',

  // Feature flags
  ENABLE_GEOLOCATION: true,
  ENABLE_REAL_TIME_UPDATES: true,
  AUTO_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes

  // Other demo accounts (for quick switching)
  DEMO_ACCOUNTS: [
    { email: 'citizen@safeguard.ai', password: 'citizen123', role: 'CITIZEN', name: 'Citizen User' },
    { email: 'police@safeguard.ai', password: 'police123', role: 'POLICE', name: 'Police Officer' },
    { email: 'govt@safeguard.ai', password: 'govt123', role: 'GOVERNMENT', name: 'Govt Official' },
    { email: 'business@safeguard.ai', password: 'business123', role: 'BUSINESS', name: 'Business User' }
  ]
};

export default config;
