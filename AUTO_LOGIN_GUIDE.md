# Auto-Login Configuration Guide

## Quick Start

### Enable/Disable Auto-Login

Edit `frontend/src/config.js`:

```javascript
const config = {
  AUTO_LOGIN_ENABLED: true,  // Set to false to disable auto-login
  AUTO_LOGIN_USER: {
    email: 'citizen@safeguard.ai',
    password: 'citizen123',
    role: 'CITIZEN'
  },
  // ... rest of config
};
```

## Available Demo Accounts

You can set `AUTO_LOGIN_USER` to any of these accounts:

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| citizen@safeguard.ai | citizen123 | CITIZEN | Regular citizen user |
| police@safeguard.ai | police123 | POLICE | Police officer |
| govt@safeguard.ai | govt123 | GOVERNMENT | Government official |
| business@safeguard.ai | business123 | BUSINESS | Business user |

## How It Works

1. **Auto-Login Enabled**: The app will automatically log in with the specified credentials after 500ms
2. **Auto-Login Disabled**: Normal login screen appears, user must enter credentials manually
3. **Visual Indicator**: Green banner shows on login screen when auto-login is active

## Testing Different Roles

To quickly switch between different user roles:

1. Open `frontend/src/config.js`
2. Update the `AUTO_LOGIN_USER` email and password
3. Save the file (React dev server will auto-reload)
4. Refresh your browser

Example:
```javascript
// To test as Police Officer
AUTO_LOGIN_USER: {
  email: 'police@safeguard.ai',
  password: 'police123',
  role: 'POLICE'
}
```

## API Parameter Fixes

All API calls now include the required `userRole` parameter:

- ✅ `/api/predict` - Includes userRole
- ✅ `/api/safe-route` - Includes userRole with correct parameter names
- ✅ `/api/sos` - Uses user email
- ✅ `/api/incidents` - Uses user email

Parameter mapping fixed:
- `start_lat` → `startLat`
- `start_lon` → `startLon`
- `end_lat` → `endLat`
- `end_lon` → `endLon`
- `current_hour` → `hour`

## Troubleshooting

### Auto-login not working?
1. Check that `AUTO_LOGIN_ENABLED: true` in config.js
2. Verify credentials match one of the demo accounts
3. Check browser console for errors
4. Hard refresh browser (Ctrl+Shift+R)

### API errors?
All API calls have been fixed to include required validation fields. If you still see errors:
1. Check that backend is running on port 8080
2. Check browser Network tab for actual request/response
3. Verify demo users are initialized in backend

## Benefits

✅ **Faster Development**: No need to manually log in every time  
✅ **Easy Role Testing**: Switch roles by editing one line  
✅ **Quick Debugging**: Jump straight to the dashboard  
✅ **Demo Ready**: Perfect for presentations and demos  

## Production Deployment

**⚠️ IMPORTANT**: Before deploying to production:

1. Set `AUTO_LOGIN_ENABLED: false` in config.js
2. Remove hardcoded credentials
3. Use environment variables for sensitive data
4. Implement proper authentication flow

```javascript
// Production config example
const config = {
  AUTO_LOGIN_ENABLED: false,
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL,
  // ... production settings
};
```
