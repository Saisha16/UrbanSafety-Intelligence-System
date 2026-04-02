# 🚨 Emergency Features - Complete Guide

## Overview
SafeGuard AI now provides comprehensive emergency and safety features accessible from **multiple locations** throughout the application, ensuring users always have quick access to emergency resources and safety information.

## Features Available

### 1. **Emergency During Active Journey** (MapView)
When you start a journey (either GPS Tracking or Simulation mode):
- **Show/Hide Button**: Toggle emergency panel visibility with `🚨 Show/Hide` button
- **SOS Button**: Pulsing red emergency button for immediate distress signal
  - Calls ambulance automatically
  - Sends location to backend
  - Shows "SOS Sent" confirmation

### 2. **Emergency Control Center** (Dedicated Tab)
New dedicated tab in CitizenDashboard - `🚨 Emergency`:
- **Emergency Hotlines**: One-tap calling for all services
  - 🚨 Police (100) - Blue button
  - 🏥 Ambulance (102) - Orange button  
  - 🔥 Fire (101) - Red button
  - 👩 Women Helpline (1091) - Purple button
  
- **Safety Tips**: 6 critical safety practices
  - Tell someone your plans
  - Keep phone charged & location sharing on
  - Travel in groups
  - Use well-lit routes
  - Trust your instincts
  - Keep emergency contacts saved

- **Important Documents**: What to keep handy
  - Identity proof
  - Address proof
  - Emergency contacts
  - Medical history
  - Insurance details

- **Quick Incident Reporting**: Report crimes directly from dashboard

### 3. **Journey Mode Enhancements** (MapView)
Enhanced tracking card now displays:
- **Real-time Mode Indicator**: Shows 📡 GPS Active or 🎬 Simulation
- **Route Type Badge**: 🛡️ Safest / ⚡ Direct / ⚖️ Balanced
- **Emergency Toggle**: Available in **BOTH GPS and Simulation** modes
- **Status Indicators**: Journey progress and speed

### 4. **Emergency Panel (During Journey)**
When emergency panel is shown during active journey:
- **SOS Button**: Central red pulsing button
- **Emergency Contacts**: 4 quick-dial buttons with golden highlights
- **Journey Info**: Current tracking mode, route type, coordinates, status
- **Live Tracking Share**: 
  - WhatsApp location sharing
  - SMS with coordinates
  - Email emergency alert
  - Copy link to clipboard
- **Security Tips**: Best practices panel
  - Stay aware
  - Keep distance
  - Avoid shortcuts
  - Trust instincts
  - Share ETA
  - Document issues

## How to Use

### Scenario 1: Navigate Safely to Destination
1. Select start/end points on map
2. Choose a route (Safest/Direct/Balanced)
3. Select tracking mode: GPS or Simulation
4. Click "Start" button
5. Click `🚨 Show` to reveal emergency panel
6. Keep app open with location sharing enabled

### Scenario 2: Quick Access to Emergency Hotlines
1. Go to `🚨 Emergency` tab in dashboard (no journey needed!)
2. Click desired service button:
   - Police, Ambulance, Fire, or Women Helpline
3. Phone app opens and dials automatically

### Scenario 3: Send Live Location to Trusted Contacts
1. During active journey, show emergency panel
2. Click "Share Tracking" button
3. Choose sharing method:
   - **WhatsApp**: Opens chat, recipient gets location link
   - **SMS**: Composes text with location
   - **Email**: Pre-fills emergency alert email
   - **Copy**: Clipboard ready to paste anywhere
4. Send to trusted contacts

### Scenario 4: Report an Incident or Crime
1. Go to `🚨 Emergency` tab
2. Click "Report Incident" button
3. Fill incident details (type, description, location)
4. Submit - stored in system for law enforcement

## Technical Details

### Backend Integration
- **SOS Endpoint**: `POST /api/incidents/report-sos`
  - Captures: lat, lng, route_id, timestamp
  - Notification sent to authorities
  - Incident logged with externalSource='SOS'

### Frontend Routes
- **Emergency Panel Component**: `EmergencyPanel.js` (now handles both modes)
- **MapView Integration**: Emergency button shows in GPS + Simulation
- **Dashboard Tab**: New emergency resource center in CitizenDashboard
- **Null-Safety**: All components protected against undefined states

### Location Data
- **Accuracy**: GPS provides meter-level precision
- **Fallback**: Simulation uses route coordinates
- **Sharing**: Direct Google Maps links via `tel:`, `sms:`, or web share
- **Privacy**: User controls all sharing, nothing shared without consent

## Safety Tips

### Before Journey
✅ Inform someone of your destination and ETA
✅ Ensure phone battery is 80%+ charged
✅ Enable location services and background location access
✅ Share your journey with trusted contacts
✅ Verify your emergency contacts are saved

### During Journey
✅ Keep phone accessible but not distracted
✅ Stay aware of surroundings
✅ Maintain safe distance from strangers
✅ Use well-lit and populated routes
✅ Trust your instincts - change route if uncomfortable
✅ Document any incidents with details

### After Journey
✅ Notify trusted contact of safe arrival
✅ Report any incidents to authorities immediately
✅ Keep incident details for insurance/legal purposes
✅ Update your safety feedback in the app

## Emergency Contacts (India)

| Service | Number | Description |
|---------|--------|-------------|
| Police | 100 | Crime, emergency assistance |
| Ambulance | 102 | Medical emergency |
| Fire | 101 | Fire, rescue, disaster |
| Women Helpline | 1091 | Women in distress |
| Cyber Crime | 1930 | Online fraud, hacking |
| Traffic Police | 100 | Road accidents, violations |
| Disaster Mgmt | 1011 | Natural disasters |

## Quick Start Checklist

- [ ] Updated app to latest version
- [ ] Enabled location permissions
- [ ] Saved emergency contacts in phone
- [ ] Tested emergency hotline buttons
- [ ] Shared a journey with trusted contact
- [ ] Verified location sharing works
- [ ] Bookmarked emergency tab for quick access
- [ ] Reviewed safety tips
- [ ] Set up automatic location sharing (optional)

## Troubleshooting

**Q: Emergency panel doesn't show?**
A: Ensure journey is active (GPS or Simulation) and you haven't reached destination yet.

**Q: Location sharing opens wrong app?**
A: Check default app settings in phone settings; SMS/Email may default to system messenger.

**Q: SOS button not working?**
A: Check backend is running; SOS logs incidents internally regardless of phone call.

**Q: Can't call emergency numbers?**
A: Verify phone has network connection; `tel:` links require active phone service.

**Q: Emergency tab not visible?**
A: Clear app cache or try reopening browser tab.

## Privacy & Data

- **No tracking without consent**: Emergency features only active when user enables them
- **Location data**: Never stored without explicit journey start
- **Sharing**: User controls all location sharing - no auto-transmission
- **Backend logs**: All emergency incidents logged for law enforcement analysis
- **GDPR compliant**: User can delete all emergency records on demand

## Future Enhancements

- 🔄 Automatic emergency contact notification (with consent)
- 📱 Wearable integration for fall detection
- 🎙️ Voice-activated SOS
- 🗺️ Offline emergency maps
- 🤖 AI-powered threat detection
- 🎵 Emergency alert sounds
- 📸 Photo/video evidence capture
- 🌐 International emergency numbers database

## Support

For issues or questions:
1. Check this guide first
2. Review troubleshooting section
3. Check browser console for errors
4. Contact SafeGuard support team

---

**Version**: 2.0 (Emergency + GPS Tracking)
**Last Updated**: 2024
**Status**: Production Ready ✅
