# 🎯 Feature Testing Guide - SafeGuard AI

## ✅ All Services Running
- **Backend**: http://localhost:8080 
- **AI Service**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Debug Page**: http://localhost:3000/debug

---

## 🔍 STEP 1: Debug Page (Check Everything Works)

### Go to: http://localhost:3000/debug

This will test all APIs and show you what's working:
- ✅ Backend connectivity
- ✅ AI Service connectivity  
- ✅ Authentication
- ✅ Prediction API
- ✅ Safe Route API

**If anything shows ❌**, check the browser console (F12 → Console tab) for error details.

---

## 🎯 STEP 2: Main App (Auto-Login Enabled)

### Go to: http://localhost:3000

### What Should Happen:

1. **Login Screen** - You'll see a green banner saying "⚡ Auto-login enabled"
2. **Auto-Login** - After 1 second, automatically logs in as citizen@safeguard.ai
3. **Dashboard** - Redirects to Citizen Dashboard

### Features to Test:

#### A. Geolocation (Automatic)
- Browser will ask permission to access your location
- Click **Allow** 
- Your real coordinates appear in header: `📍 Current: XX.XXXX, YY.YYYY`
- If denied, uses Bangalore default (12.97, 77.59)

**Look for in browser console:**
```
🌍 Initializing geolocation...
✅ Geolocation API available, requesting position...
✅ Geolocation success: { latitude: XX, longitude: YY }
```

#### B. Risk Prediction (Automatic)
After location is set, risk prediction runs automatically:

**Look for in browser console:**
```
🔄 Fetching citizen data for location: {...}
📡 Calling predict API...
✅ Risk prediction received: { risk_level: "MEDIUM", ... }
```

**On Dashboard:**
- Risk score card appears
- Color-coded: Green (LOW), Orange (MEDIUM), Red (HIGH)
- Shows risk percentage

#### C. Real-Time Auto-Refresh
- Every 5 minutes, data auto-refreshes
- Watch console for: `Auto-refreshing risk data...`
- Toast notification appears: `✅ Data updated successfully`

#### D. SOS Emergency Button
- Big RED pulsing button on dashboard
- Click it to test
- Toast shows: `🚨 SOS Alert Sent! Notifying emergency contacts...`
- Another toast: `✅ Emergency services notified`

**Look for in console:**
```
SOS Response: { alertId: "xxx", status: "sent", ... }
```

#### E. Incident Reporting
1. Click **"📝 Report Incident"** button
2. Modal opens with form
3. Select incident type (theft, assault, vandalism, etc.)
4. Enter description
5. Click Submit
6. Toast shows: `✅ Incident reported successfully - ID: xxx`

**Look for in console:**
```
Incident reported: { incidentId: "xxx", ... }
```

#### F. Map View & Safe Routes
1. Click **"Map"** tab
2. Map loads showing Bangalore
3. **Set Start Point**: Click on map OR use search box
4. **Set End Point**: Click on map OR use search box  
5. Click **"Find Safe Routes"** button

**What should happen:**
- Loading spinner appears
- 3 routes displayed (safest, balanced, fastest)
- Routes color-coded:
  - Green = LOW risk
  - Orange = MEDIUM risk
  - Red = HIGH risk
- Click route to see details
- Explainability section shows AI reasoning

**Look for in console:**
```
📡 Calling safe-route API...
✅ Route data received
```

**Common Issue:** "Error fetching routes"
- Check Network tab (F12 → Network)
- Look for failed `/api/safe-route` request
- Check error response for validation details

---

## 🐛 TROUBLESHOOTING

### Features Not Showing?

#### 1. Check Browser Console (F12)
Look for these success messages:
- ✅ Auto-login successful!
- ✅ Geolocation success
- ✅ Risk prediction received
- ✅ Citizen data fetch complete

#### 2. Check Network Tab (F12 → Network)
Filter by "localhost:8080":
- `/api/auth/login` → Should be 200 OK
- `/api/predict` → Should be 200 OK
- `/api/safe-route` → Should be 200 OK

**If 400 Bad Request:**
- Click on request → Preview tab
- Look for validation errors
- Common: Missing `userRole` (should be fixed now)

**If 500 Internal Server Error:**
- Check backend terminal for Java stack traces
- Backend might have crashed

#### 3. Common Issues

**"Cannot read property 'role' of undefined"**
- Auto-login failed
- Check console for auto-login error
- Manually login with citizen@safeguard.ai / citizen123

**"Error fetching routes. Make sure backend is running!"**
- API validation error (should be fixed)
- Check Network tab for actual error
- Verify all parameters sent correctly

**Location stuck on "Loading..."**
- Geolocation permission denied
- OR browser doesn't support geolocation
- Should fallback to Bangalore coordinates

**Nothing happens after login**
- Check if `user` object exists in console: `console.log(user)`
- Check AuthContext for errors

---

## 📊 Expected Console Output (Normal Flow)

```
🔄 Auto-login enabled, logging in as: citizen@safeguard.ai
✅ Auto-login successful!
🌍 Initializing geolocation...
✅ Geolocation API available, requesting position...
✅ Geolocation success: { latitude: XX.XXXX, longitude: YY.YYYY }
🔄 Fetching citizen data for location: {...} Silent: false
📡 Calling predict API...
✅ Risk prediction received: { risk_level: "MEDIUM", risk_score: 0.65, ... }
📡 Calling recommendations API...
⚠️ Recommendations unavailable: Error: Request failed with status code 404
✅ Citizen data fetch complete
```

The recommendations 404 is normal (endpoint not implemented yet).

---

## 🎨 Visual Features to See

### Dashboard Header
- 🛡️ SafeGuard AI logo
- Role badge (CITIZEN)
- 👤 User name (John Doe)
- 📍 Current coordinates
- 🔄 Refresh location button

### Risk Panel
- Large risk score card
- Color-coded background
- Risk level text (LOW/MEDIUM/HIGH)
- Percentage

### Action Buttons
- 🚨 SOS (red, pulsing animation)
- 📝 Report Incident (blue)
- 🗺️ Map tab

### Map View
- Interactive Leaflet map
- Click to set points
- Search boxes for start/end
- Mode indicator banner
- Route list with risk levels
- Explainability tooltips

---

## 🔄 Quick Reset

If things break:

1. **Hard Refresh**: Ctrl + Shift + R (clears cache)
2. **Clear Storage**: F12 → Application → Clear storage
3. **Restart Frontend**: 
   ```powershell
   # Kill frontend terminal (Ctrl+C)
   cd frontend
   npm start
   ```

---

## 📝 Notes

### Auto-Login
- Enabled by default in `config.js`
- Can be disabled: `AUTO_LOGIN_ENABLED: false`
- Switch users by changing `AUTO_LOGIN_USER` email/password

### API Parameters
All fixed to include required fields:
- ✅ `userRole` added to predict API
- ✅ `userRole` added to safe-route API  
- ✅ Parameter names corrected (startLat vs start_lat)

### Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| citizen@safeguard.ai | citizen123 | CITIZEN |
| police@safeguard.ai | police123 | POLICE |
| govt@safeguard.ai | govt123 | GOVERNMENT |
| business@safeguard.ai | business123 | BUSINESS |

---

## ✅ Success Checklist

After following this guide, you should see:

- ✅ Auto-login works (1 second delay)
- ✅ Geolocation permission prompt appears
- ✅ Coordinates show in header
- ✅ Risk score displays with color
- ✅ SOS button pulses red
- ✅ Incident report modal opens
- ✅ Map loads and accepts clicks
- ✅ Routes display after "Find Safe Routes"
- ✅ Toast notifications appear
- ✅ Auto-refresh console log every 5 min
- ✅ No red errors in console

**If all checked, all features are working! 🎉**
