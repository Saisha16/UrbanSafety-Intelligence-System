
import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import LocationSearch from "./LocationSearch";
import EmergencyPanel from "./EmergencyPanel";
import { useAuth } from "../context/AuthContext";
import "./MapView.css";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const journeyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function toMinutes(estimatedTime) {
  if (!estimatedTime) return 0;
  const match = String(estimatedTime).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function interpolateTrack(waypoints, stepsPerSegment = 18) {
  if (!waypoints || waypoints.length < 2) return [];
  const track = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const fromLat = from.lat || from.latitude;
    const fromLng = from.lng || from.lon || from.longitude;
    const toLat = to.lat || to.latitude;
    const toLng = to.lng || to.lon || to.longitude;
    
    for (let step = 0; step < stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      track.push({
        lat: fromLat + (toLat - fromLat) * t,
        lng: fromLng + (toLng - fromLng) * t
      });
    }
  }
  const last = waypoints[waypoints.length - 1];
  const lastLat = last.lat || last.latitude;
  const lastLng = last.lng || last.lon || last.longitude;
  track.push({ lat: lastLat, lng: lastLng });
  return track;
}

function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestWaypointIndex(route, point) {
  if (!route?.waypoints?.length) return 0;
  let idx = 0;
  let best = Number.POSITIVE_INFINITY;
  route.waypoints.forEach((wp, i) => {
    const d = haversineKm(point, { lat: wp.lat, lng: wp.lon });
    if (d < best) {
      best = d;
      idx = i;
    }
  });
  return idx;
}

function remainingDistanceKm(route, point) {
  if (!route?.waypoints?.length) return 0;
  const idx = nearestWaypointIndex(route, point);
  let total = 0;

  const current = { lat: point.lat, lng: point.lng };
  const firstNext = route.waypoints[idx];
  total += haversineKm(current, { lat: firstNext.lat, lng: firstNext.lon });

  for (let i = idx; i < route.waypoints.length - 1; i += 1) {
    total += haversineKm(
      { lat: route.waypoints[i].lat, lng: route.waypoints[i].lon },
      { lat: route.waypoints[i + 1].lat, lng: route.waypoints[i + 1].lon }
    );
  }
  return total;
}

function minDistanceToRouteKm(route, point) {
  if (!route?.waypoints?.length) return Number.POSITIVE_INFINITY;
  return Math.min(
    ...route.waypoints.map((wp) => haversineKm(point, { lat: wp.lat, lng: wp.lon }))
  );
}

function LocationSelector({ onLocationSelect, startPoint, endPoint }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function MapView({ user }) {
  const { logout } = useAuth();
  const position = [12.9716, 77.5946];
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const [routes, setRoutes] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('start'); // 'start' or 'end'
  const [expandedExplanation, setExpandedExplanation] = useState(null); // Track which route's explanation is expanded
  const [journeyRoute, setJourneyRoute] = useState(null);
  const [journeyTrack, setJourneyTrack] = useState([]);
  const [livePosition, setLivePosition] = useState(null);
  const [journeyRunning, setJourneyRunning] = useState(false);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [journeyMode, setJourneyMode] = useState('gps');
  const [snapToRoadEnabled, setSnapToRoadEnabled] = useState(true);
  const [snappedPaths, setSnappedPaths] = useState({});
  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const timerRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastGpsRef = useRef(null);
  const speedKmhRef = useRef(18);
  const rerouteLockRef = useRef(false);
  const rerouteCooldownRef = useRef(0);
  const activeRouteRef = useRef(null);

  const speakAlert = (text) => {
    if (!window.speechSynthesis) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis not available:', e);
    }
  };

  const notifyAlert = (title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
      return;
    }
    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  };

  const triggerRerouteAlert = (distanceMeters) => {
    const msg = `Rerouting triggered. You are ${Math.round(distanceMeters)} meters off the selected route.`;
    notifyAlert('SafeGuard Reroute', msg);
    speakAlert('You are off route. Recomputing the safest path now.');
  };

  const fetchSnappedPath = async (route) => {
    if (!route?.waypoints?.length) return null;
    try {
      const coords = route.waypoints
        .map((wp) => `${wp.lon},${wp.lat}`)
        .join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const response = await axios.get(url);
      const geometry = response?.data?.routes?.[0]?.geometry?.coordinates;
      if (!geometry || !Array.isArray(geometry)) return null;
      return geometry.map(([lon, lat]) => [lat, lon]);
    } catch (e) {
      console.warn(`Snap-to-road failed for route ${route.route_id}:`, e?.message || e);
      return null;
    }
  };

  const buildSnappedPaths = async (routeBundle) => {
    if (!routeBundle?.routes?.length) {
      setSnappedPaths({});
      return;
    }

    const entries = await Promise.all(
      routeBundle.routes.map(async (route) => [route.route_id, await fetchSnappedPath(route)])
    );

    const next = {};
    entries.forEach(([id, path]) => {
      if (path?.length) next[id] = path;
    });
    setSnappedPaths(next);
  };

  const stopSimulatedTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
    setGpsTracking(false);
    setGpsStatus('idle');
  };

  const selectedJourney = journeyRoute || selectedRoute;
  const hasRouteSelected = Boolean(selectedJourney && selectedJourney.waypoints && selectedJourney.waypoints.length > 1);

  useEffect(() => {
    return () => {
      stopSimulatedTimer();
      stopGpsTracking();
    };
  }, []);

  const handleLocationSelect = (latlng) => {
    if (mode === 'start') {
      setStartPoint(latlng);
      setStartName(''); // Clear name when clicking on map
      setMode('end');
      setRoutes(null);
      setSelectedRoute(null);
    } else {
      setEndPoint(latlng);
      setEndName(''); // Clear name when clicking on map
    }
  };

  const handleStartLocationSearch = (latlng, name) => {
    setStartPoint(latlng);
    setStartName(name);
    setMode('end');
    setRoutes(null);
    setSelectedRoute(null);
  };

  const useCurrentLocationForStart = () => {
    if (!navigator.geolocation || currentLocationLoading) {
      return;
    }

    setCurrentLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setStartPoint(latlng);
        setStartName('My Current Location');
        setMode('end');
        setRoutes(null);
        setSelectedRoute(null);
        setJourneyRoute(null);
        setCurrentLocationLoading(false);
      },
      (error) => {
        console.error('Unable to get current location:', error);
        setCurrentLocationLoading(false);
        alert('Unable to fetch current location. Please allow location permission and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const handleEndLocationSearch = (latlng, name) => {
    setEndPoint(latlng);
    setEndName(name);
  };

  const findSafeRoutes = async () => {
    if (!startPoint || !endPoint) {
      alert("Please select both start and end points on the map!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post("http://localhost:8080/api/safe-route", {
        startLat: startPoint.lat,
        startLon: startPoint.lng,
        endLat: endPoint.lat,
        endLon: endPoint.lng,
        hour: new Date().getHours(),
        userRole: user?.role || 'CITIZEN'
      });
      setRoutes(response.data);
      setSelectedRoute(response.data.recommended);
      setJourneyRoute(response.data.recommended);
      activeRouteRef.current = response.data.recommended;
      buildSnappedPaths(response.data);
    } catch (error) {
      console.error("Error fetching routes:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.errors || "Error fetching routes. Make sure the backend is running!";
      alert(errorMsg);
    }
    setLoading(false);
  };

  const resetSelection = () => {
    setStartPoint(null);
    setEndPoint(null);
    setStartName('');
    setEndName('');
    setRoutes(null);
    setSelectedRoute(null);
    setJourneyRoute(null);
    activeRouteRef.current = null;
    setSnappedPaths({});
    setJourneyTrack([]);
    setLivePosition(null);
    setJourneyRunning(false);
    setJourneyProgress(0);
    setEtaSeconds(0);
    stopSimulatedTimer();
    stopGpsTracking();
    lastGpsRef.current = null;
    speedKmhRef.current = 18;
    rerouteLockRef.current = false;
    rerouteCooldownRef.current = 0;
    setMode('start');
  };

  const chooseRoute = (route) => {
    setSelectedRoute(route);
    setJourneyRoute(route);
    activeRouteRef.current = route;
    setJourneyRunning(false);
    setJourneyProgress(0);
    setLivePosition(null);
    setEtaSeconds(toMinutes(route.estimated_time) * 60);
    stopSimulatedTimer();
    stopGpsTracking();
  };

  const startSelectedJourney = () => {
    console.log('🚀 Starting journey in mode:', journeyMode);
    if (journeyMode === 'gps') {
      console.log('📡 Launching GPS tracking');
      startLiveGpsJourney();
      return;
    }
    console.log('🎬 Launching simulation');
    startJourney();
  };

  const handleSOS = async (data) => {
    try {
      const token = user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const sosData = {
        latitude: data.latitude,
        longitude: data.longitude,
        description: `SOS triggered during travel. Route: ${data.route}`,
        incidentType: 'SOS_EMERGENCY',
        severity: 'CRITICAL',
        status: 'OPEN'
      };
      
      await axios.post('http://localhost:8080/api/incidents', sosData, { headers });
      
      // Dial emergency number
      window.location.href = 'tel:100';
      
      return true;
    } catch (err) {
      console.error('SOS error:', err);
      alert('Failed to send SOS. Calling 100...');
      window.location.href = 'tel:100';
      return false;
    }
  };

  const getRouteTypeLabel = () => {
    if (!selectedRoute || !selectedRoute.route_id) return 'Journey';
    const id = String(selectedRoute.route_id || '').toLowerCase();
    if (id.includes('safest')) return '🛡️ Safest Route';
    if (id.includes('direct')) return '⚡ Direct Route';
    if (id.includes('balanced')) return '⚖️ Balanced Route';
    return '📍 Route';
  };

  const recalcEtaAndProgress = (route, position) => {
    const remaining = remainingDistanceKm(route, position);
    const routeDistance = Number(route.distance_km || 0);
    const progress = routeDistance > 0
      ? Math.max(0, Math.min(100, Math.round(((routeDistance - remaining) / routeDistance) * 100)))
      : 0;

    setJourneyProgress(progress);

    const speed = Math.max(5, speedKmhRef.current || 18);
    const eta = Math.round((remaining / speed) * 3600);
    setEtaSeconds(Math.max(0, eta));
  };

  const rerouteFromLivePosition = async (currentPos, offRouteKm = 0) => {
    if (!endPoint || !journeyRoute || rerouteLockRef.current) return;

    const now = Date.now();
    if (now - rerouteCooldownRef.current < 20000) return;

    rerouteLockRef.current = true;
    setGpsStatus('rerouting');

    try {
      const response = await axios.post('http://localhost:8080/api/safe-route', {
        startLat: currentPos.lat,
        startLon: currentPos.lng,
        endLat: endPoint.lat,
        endLon: endPoint.lng,
        hour: new Date().getHours(),
        userRole: user?.role || 'CITIZEN'
      });

      setRoutes(response.data);
      setSelectedRoute(response.data.recommended);
      setJourneyRoute(response.data.recommended);
      activeRouteRef.current = response.data.recommended;
      buildSnappedPaths(response.data);
      triggerRerouteAlert(offRouteKm * 1000);
      recalcEtaAndProgress(response.data.recommended, currentPos);
      setGpsStatus('tracking');
      rerouteCooldownRef.current = Date.now();
    } catch (e) {
      console.error('Live reroute failed:', e);
      setGpsStatus('error');
    } finally {
      rerouteLockRef.current = false;
    }
  };

  const startLiveGpsJourney = () => {
    const routeToTrack = journeyRoute || selectedRoute;
    if (!routeToTrack || !routeToTrack.waypoints || routeToTrack.waypoints.length < 2) {
      alert('Please choose a route first.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported on this device/browser.');
      return;
    }

    stopSimulatedTimer();
    stopGpsTracking();
    activeRouteRef.current = routeToTrack;
    setJourneyRunning(true);
    setGpsTracking(true);
    setGpsStatus('waiting');
    rerouteLockRef.current = false;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setLivePosition(point);
        setGpsStatus('tracking');

        const now = Date.now();
        if (lastGpsRef.current) {
          const dtHours = (now - lastGpsRef.current.t) / 3600000;
          if (dtHours > 0) {
            const dist = haversineKm(lastGpsRef.current.p, point);
            const instant = dist / dtHours;
            if (Number.isFinite(instant) && instant > 1 && instant < 120) {
              speedKmhRef.current = (speedKmhRef.current * 0.7) + (instant * 0.3);
            }
          }
        }
        lastGpsRef.current = { p: point, t: now };

        const routeNow = activeRouteRef.current || routeToTrack;
        recalcEtaAndProgress(routeNow, point);

        const offRouteKm = minDistanceToRouteKm(routeNow, point);
        if (offRouteKm > 0.12) {
          rerouteFromLivePosition(point, offRouteKm);
        }

        const destination = routeNow.waypoints[routeNow.waypoints.length - 1];
        const toDestination = haversineKm(point, { lat: destination.lat, lng: destination.lon });
        if (toDestination < 0.05) {
          stopGpsTracking();
          setJourneyRunning(false);
          setJourneyProgress(100);
          setEtaSeconds(0);
          setGpsStatus('arrived');
        }
      },
      (err) => {
        console.error('GPS tracking error:', err);
        setGpsStatus('error');
        setGpsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1500
      }
    );
  };

  const startJourney = () => {
    const routeToStart = journeyRoute || selectedRoute;
    if (!routeToStart || !routeToStart.waypoints || routeToStart.waypoints.length < 2) {
      alert('Please choose a valid route first.');
      return;
    }

    const track = interpolateTrack(routeToStart.waypoints, 20);
    console.log('🎬 Simulation starting with track length:', track.length, 'waypoints:', routeToStart.waypoints.length);
    
    const plannedEtaSeconds = Math.max(60, toMinutes(routeToStart.estimated_time) * 60);
    const msPerStep = Math.max(350, Math.floor((plannedEtaSeconds * 1000) / track.length));

    console.log('⏱️ Planned ETA:', plannedEtaSeconds, 'sec | Step interval:', msPerStep, 'ms');

    setJourneyTrack(track);
    setLivePosition(track[0]);
    setJourneyRunning(true);
    setJourneyProgress(0);
    setEtaSeconds(plannedEtaSeconds);

    stopGpsTracking();
    stopSimulatedTimer();

    let step = 0;
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      step += 1;
      const nextPoint = track[Math.min(step, track.length - 1)];
      setLivePosition(nextPoint);
      setJourneyProgress(Math.round((Math.min(step, track.length - 1) / (track.length - 1)) * 100));

      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      setEtaSeconds(Math.max(0, plannedEtaSeconds - elapsedSec));

      if (step >= track.length - 1) {
        console.log('✅ Simulation complete');
        stopSimulatedTimer();
        setJourneyRunning(false);
        setJourneyProgress(100);
        setEtaSeconds(0);
      }
    }, msPerStep);
  };

  const formatEta = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  const toggleMode = () => {
    setMode(mode === 'start' ? 'end' : 'start');
  };

  const getRouteColor = (routeId, route) => {
    if (selectedRoute && selectedRoute.route_id === routeId) {
      return '#2196F3'; // Blue for selected
    }
    const level = String(route.risk_level || '').toLowerCase();
    if (level === 'low') return '#44ff44'; // Green
    if (level === 'medium') return '#ffaa00'; // Orange
    return '#ff4444'; // Red for HIGH
  };

  return (
    <div className="map-view-container">
      <div className="map-sidebar">
        {/* Mode Indicator Banner */}
        <div className={`mode-indicator ${mode}`}>
          <span className="mode-icon">{mode === 'start' ? '📍' : '🎯'}</span>
          <span className="mode-text">
            {mode === 'start' ? 'Select START point' : 'Select END point'}
          </span>
          {startPoint && !endPoint && (
            <button onClick={toggleMode} className="toggle-mode-btn">
              Set {mode === 'start' ? 'END' : 'START'}
            </button>
          )}
        </div>

        <div className="map-controls">
        <div className="control-header">
          <h2>🗺️ Route Planner</h2>
          <div className="header-actions">
            <button onClick={resetSelection} className="reset-btn">🔄 Reset</button>
          </div>
        </div>

        <div className="session-strip">
          <span className="session-user">👤 {user?.name || 'User'} ({user?.role || 'CITIZEN'})</span>
          <button className="session-logout" onClick={logout}>Logout</button>
        </div>

        <div className="tracking-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4>🚀 Journey Mode</h4>
            {(journeyRunning || gpsTracking) && (
              <button 
                onClick={() => setShowEmergency(!showEmergency)}
                className="emergency-toggle-btn"
                title="Emergency Features"
              >
                🚨 {showEmergency ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          
          {(journeyRunning || gpsTracking) && selectedRoute && (
            <div className="current-route-display">
              <strong>📍 Current Route:</strong> {getRouteTypeLabel()} 
              {journeyRunning && <span style={{marginLeft: '8px'}}>🎬 {journeyMode.toUpperCase()}</span>}
              {gpsTracking && <span style={{marginLeft: '8px'}}>📡 GPS Active</span>}
            </div>
          )}
          
          <div className="journey-mode-toggle">
            <button
              className={`mode-chip ${journeyMode === 'gps' ? 'active' : ''}`}
              onClick={() => setJourneyMode('gps')}
            >
              GPS Only
            </button>
            <button
              className={`mode-chip ${journeyMode === 'simulation' ? 'active' : ''}`}
              onClick={() => setJourneyMode('simulation')}
            >
              Simulation
            </button>
            <button
              className={`mode-chip ${snapToRoadEnabled ? 'active' : ''}`}
              onClick={() => setSnapToRoadEnabled((prev) => !prev)}
            >
              {snapToRoadEnabled ? 'Snap-to-road On' : 'Snap-to-road Off'}
            </button>
          </div>
          <div className="tracking-status-row">
            <span>Mode: {journeyMode.toUpperCase()}</span>
            <span>GPS: {gpsStatus}</span>
            <span>Speed: {speedKmhRef.current.toFixed(1)} km/h</span>
            {journeyRunning && <span style={{color: '#4CAF50', fontWeight: '700'}}>🟢 Journey Active</span>}
            {gpsTracking && <span style={{color: '#4CAF50', fontWeight: '700'}}>🟢 GPS Tracking</span>}
          </div>
          {!hasRouteSelected && (
            <small className="hint-text">Select start/end and choose a route to start journey tracking.</small>
          )}
          {hasRouteSelected && (
            <div className="tracking-actions">
              <button onClick={startSelectedJourney} className="find-routes-btn" disabled={journeyRunning || gpsTracking}>
                {journeyRunning ? 'Journey in Progress' : gpsTracking ? 'GPS Tracking Active' : `Start ${journeyMode === 'gps' ? 'Live GPS' : 'Simulation'}`}
              </button>
              {(gpsTracking || journeyRunning) && (
                <button onClick={resetSelection} className="reset-btn">
                  Stop Journey
                </button>
              )}
            </div>
          )}
        </div>

        <div className="location-inputs">
          <div className={`location-input-wrapper ${mode === 'start' ? 'active' : ''}`} onClick={() => setMode('start')}>
            <LocationSearch 
              onLocationSelect={handleStartLocationSearch}
              label="📍 Start Point:"
              placeholder="Search or click map..."
              enableCurrentLocation={true}
              currentLocation={startName || (startPoint ? `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}` : '')}
            />
            <button
              type="button"
              className="current-location-btn"
              onClick={(e) => {
                e.stopPropagation();
                useCurrentLocationForStart();
              }}
            >
              {currentLocationLoading ? 'Locating...' : 'Use Current Location'}
            </button>
            {startPoint && (
              <span className="point-status">✓ Set</span>
            )}
          </div>
          <div className={`location-input-wrapper ${mode === 'end' ? 'active' : ''}`} onClick={() => setMode('end')}>
            <LocationSearch 
              onLocationSelect={handleEndLocationSearch}
              label="🎯 End Point:"
              placeholder="Search or click map..."
              currentLocation={endName || (endPoint ? `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}` : '')}
            />
            {endPoint && (
              <span className="point-status">✓ Set</span>
            )}
          </div>
        </div>

        <button 
          onClick={findSafeRoutes} 
          disabled={!startPoint || !endPoint || loading}
          className="find-routes-btn"
        >
          {loading ? '⏳ Finding Routes...' : '🛣️ Find Safe Routes'}
        </button>

        {routes && (
          <div className="routes-list">
            <h3>🚦 Available Routes (with AI Explanations):</h3>
            {selectedJourney && (
              <div className="route-card selected" style={{ marginBottom: '12px' }}>
                <div className="route-header">
                  <h4>Selected Route: {selectedJourney.route_id}</h4>
                  <span className="recommended-badge">Ready</span>
                </div>
                <div className="route-stats">
                  <span>📏 {selectedJourney.distance_km} km</span>
                  <span>⏱️ ETA: {journeyRunning ? formatEta(etaSeconds) : selectedJourney.estimated_time}</span>
                  <span>📍 Progress: {journeyProgress}%</span>
                </div>
                <small style={{ color: '#5c6f82' }}>
                  Mode: {journeyMode.toUpperCase()} | GPS: {gpsStatus} | Speed: {speedKmhRef.current.toFixed(1)} km/h | Off-route reroute threshold: 120m
                </small>
              </div>
            )}
            {routes.routes.map((route) => (
              <div 
                key={route.route_id}
                className={`route-card ${selectedRoute?.route_id === route.route_id ? 'selected' : ''}`}
              >
                <div onClick={() => chooseRoute(route)} style={{cursor: 'pointer'}}>
                  <div className="route-header">
                    <h4>Route {route.route_id}</h4>
                    {route.route_id === routes.recommended.route_id && (
                      <span className="recommended-badge">✓ Recommended</span>
                    )}
                  </div>
                  <div className="route-stats">
                    <span>📏 {route.distance_km} km</span>
                    <span>⏱️ {route.estimated_time}</span>
                    <span style={{ 
                      color: route.risk_level === 'low' ? '#44ff44' : 
                             route.risk_level === 'medium' ? '#ffaa00' : '#ff4444',
                      fontWeight: 'bold'
                    }}>
                      🔒 {route.risk_level.toUpperCase()} ({(route.risk_score * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button onClick={() => chooseRoute(route)} className="toggle-mode-btn">
                    Choose This Route
                  </button>
                </div>
                
                {/* Explainability Section */}
                {route.explanation && (
                  <div className="explanation-section">
                    <button 
                      className="explain-toggle-btn"
                      onClick={() => setExpandedExplanation(expandedExplanation === route.route_id ? null : route.route_id)}
                    >
                      {expandedExplanation === route.route_id ? '🔺 Hide' : '🔻 Show'} AI Explanation
                    </button>
                    
                    {expandedExplanation === route.route_id && (
                      <div className="explanation-content">
                        {/* Summary */}
                        <div className="explanation-summary">
                          {route.explanation.summary}
                        </div>
                        
                        {/* Feature Importance */}
                        <div className="feature-importance-section">
                          <h5>🧠 AI Risk Factors:</h5>
                          {route.explanation.feature_importance.map((feature, idx) => (
                            <div key={idx} className="feature-item">
                              <div className="feature-header">
                                <span className="feature-name">{feature.feature}</span>
                                <span className={`feature-impact ${feature.impact >= 0 ? 'negative' : 'positive'}`}>
                                  {feature.impact >= 0 ? '+' : ''}{(feature.impact * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="feature-bar-container">
                                <div 
                                  className={`feature-bar ${feature.impact >= 0 ? 'risk' : 'safe'}`}
                                  style={{ width: `${Math.abs(feature.impact) * 100}%` }}
                                />
                              </div>
                              <p className="feature-desc">{feature.description}</p>
                            </div>
                          ))}
                        </div>
                        
                        {/* Crime Types */}
                        {route.explanation.top_crime_types && route.explanation.top_crime_types.length > 0 && (
                          <div className="crime-types-section">
                            <h5>🚨 Top Crime Types Nearby:</h5>
                            <div className="crime-types-list">
                              {route.explanation.top_crime_types.map((crime, idx) => (
                                <div key={idx} className="crime-type-item">
                                  <span className="crime-type-name">{crime.type}</span>
                                  <span className="crime-type-count">{crime.count} incidents</span>
                                </div>
                              ))}
                            </div>
                            <p className="total-crimes">
                              Total: {route.explanation.total_crimes_nearby} crimes recorded near this route
                            </p>
                          </div>
                        )}
                        
                        {/* Risk Distribution */}
                        {route.explanation.risk_distribution && (
                          <div className="risk-distribution-section">
                            <h5>📊 Risk Distribution:</h5>
                            <div className="risk-stats-grid">
                              <div className="risk-stat">
                                <span className="stat-label">Minimum:</span>
                                <span className="stat-value">{(route.explanation.risk_distribution.min * 100).toFixed(0)}%</span>
                              </div>
                              <div className="risk-stat">
                                <span className="stat-label">Average:</span>
                                <span className="stat-value">{(route.explanation.risk_distribution.avg * 100).toFixed(0)}%</span>
                              </div>
                              <div className="risk-stat">
                                <span className="stat-label">Maximum:</span>
                                <span className="stat-value">{(route.explanation.risk_distribution.max * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Recommendations */}
                        {route.explanation.recommendations && (
                          <div className="recommendations-section">
                            <h5>✅ Safety Recommendations:</h5>
                            <ul className="recommendations-list">
                              {route.explanation.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Model Info */}
                        <div className="model-info">
                          <small>🤖 Powered by: {route.explanation.model_method}</small>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="algorithm-info">
              <small>🧮 Algorithm: {routes.algorithm}</small>
            </div>
          </div>
        )}

        {/* Emergency Panel - Show in both GPS and Simulation modes */}
        {showEmergency && (journeyRunning || gpsTracking) && selectedRoute && (
          <EmergencyPanel 
            user={user}
            journeyActive={journeyRunning || gpsTracking}
            livePosition={livePosition}
            selectedRoute={selectedRoute}
            onSOS={handleSOS}
            showEmergency={showEmergency}
            trackingMode={journeyMode}
            isGpsActive={gpsTracking}
          />
        )}
      </div>
      </div>

      <div className="map-wrapper" style={{ cursor: 'crosshair' }}>
        <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          
          <LocationSelector 
            onLocationSelect={handleLocationSelect}
            startPoint={startPoint}
            endPoint={endPoint}
          />

          {startPoint && (
            <Marker position={startPoint} icon={startIcon}>
              <Popup>
                <strong>START</strong><br />
                {startName && <><strong>{startName}</strong><br /></>}
                {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}
              </Popup>
            </Marker>
          )}

          {endPoint && (
            <Marker position={endPoint} icon={endIcon}>
              <Popup>
                <strong>DESTINATION</strong><br />
                {endName && <><strong>{endName}</strong><br /></>}
                {endPoint.lat.toFixed(4)}, {endPoint.lng.toFixed(4)}
              </Popup>
            </Marker>
          )}

          {livePosition && (
            <Marker position={livePosition} icon={journeyIcon}>
              <Popup>
                <strong>Live Journey</strong><br />
                Route: {(journeyRoute || selectedRoute)?.route_id}<br />
                Progress: {journeyProgress}%<br />
                ETA: {formatEta(etaSeconds)}
              </Popup>
            </Marker>
          )}

          {journeyRunning && journeyTrack.length > 1 && (
            <Polyline
              positions={journeyTrack.map((p) => [p.lat, p.lng])}
              color="#1e88e5"
              weight={5}
              opacity={0.4}
              dashArray={'8, 6'}
            />
          )}

          {routes && routes.routes.map((route) => {
            const rawPositions = route.waypoints.map(wp => [wp.lat, wp.lon]);
            const positions = snapToRoadEnabled && snappedPaths[route.route_id]
              ? snappedPaths[route.route_id]
              : rawPositions;
            const isSelected = selectedRoute?.route_id === route.route_id;
            
            return (
              <Polyline
                key={route.route_id}
                positions={positions}
                color={getRouteColor(route.route_id, route)}
                weight={isSelected ? 6 : 3}
                opacity={isSelected ? 1 : 0.6}
                dashArray={route.route_id === routes.recommended.route_id ? null : '10, 5'}
              >
                <Popup>
                  <strong>Route {route.route_id}</strong><br />
                  Risk: {route.risk_level}<br />
                  Distance: {route.distance_km} km<br />
                  Time: {route.estimated_time}
                </Popup>
              </Polyline>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;
