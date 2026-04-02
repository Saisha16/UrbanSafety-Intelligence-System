import React, { useEffect, useState } from 'react';
import './LocationSearch.css';

// Predefined locations in Bengaluru
const BENGALURU_LOCATIONS = [
  { name: "MG Road", lat: 12.9716, lng: 77.5946 },
  { name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  { name: "Whitefield", lat: 12.9698, lng: 77.7500 },
  { name: "Electronic City", lat: 12.8456, lng: 77.6603 },
  { name: "Marathahalli", lat: 12.9591, lng: 77.7011 },
  { name: "JP Nagar", lat: 12.9080, lng: 77.5852 },
  { name: "BTM Layout", lat: 12.9165, lng: 77.6101 },
  { name: "Jayanagar", lat: 12.9250, lng: 77.5838 },
  { name: "HSR Layout", lat: 12.9121, lng: 77.6446 },
  { name: "Bannerghatta Road", lat: 12.8906, lng: 77.6041 },
  { name: "Hennur", lat: 13.0358, lng: 77.6394 },
  { name: "Yelahanka", lat: 13.1007, lng: 77.5963 },
  { name: "Rajajinagar", lat: 12.9916, lng: 77.5552 },
  { name: "Malleshwaram", lat: 13.0029, lng: 77.5707 },
  { name: "Hebbal", lat: 13.0358, lng: 77.5970 },
  { name: "Banashankari", lat: 12.9250, lng: 77.5482 },
  { name: "Kengeri", lat: 12.9075, lng: 77.4850 },
  { name: "Bellandur", lat: 12.9259, lng: 77.6766 },
  { name: "Sarjapur Road", lat: 12.9010, lng: 77.6874 },
  { name: "Yeshwanthpur", lat: 13.0280, lng: 77.5385 },
  { name: "Frazer Town", lat: 12.9880, lng: 77.6128 },
  { name: "Richmond Town", lat: 12.9698, lng: 77.6025 },
  { name: "Vijayanagar", lat: 12.9698, lng: 77.5350 },
  { name: "KR Puram", lat: 13.0110, lng: 77.6964 },
  { name: "Vidyaranyapura", lat: 13.0780, lng: 77.5590 },
  { name: "RT Nagar", lat: 13.0250, lng: 77.5950 },
  { name: "Basavanagudi", lat: 12.9426, lng: 77.5742 },
  { name: "Brigade Road", lat: 12.9716, lng: 77.6070 },
  { name: "Commercial Street", lat: 12.9816, lng: 77.6094 },
  { name: "Cubbon Park", lat: 12.9762, lng: 77.5929 },
  { name: "Ulsoor", lat: 12.9810, lng: 77.6208 },
  { name: "Shivajinagar", lat: 12.9869, lng: 77.6009 },
  { name: "CV Raman Nagar", lat: 12.9850, lng: 77.6750 },
  { name: "Bommanahalli", lat: 12.9055, lng: 77.6250 },
];

function LocationSearch({ onLocationSelect, placeholder, label, currentLocation, enableCurrentLocation = false }) {
  const [searchText, setSearchText] = useState(currentLocation || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [remoteLocations, setRemoteLocations] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);

  useEffect(() => {
    // Keep input synced with externally selected point, but do not interrupt live typing.
    if (!isFocused) {
      setSearchText(currentLocation || '');
    }
  }, [currentLocation, isFocused]);

  useEffect(() => {
    const q = searchText.trim();
    if (q.length < 3) {
      setRemoteLocations([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        // Primary provider: Photon (fast autocomplete)
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`);
        let mapped = [];
        if (photonRes.ok) {
          const photonData = await photonRes.json();
          mapped = Array.isArray(photonData?.features)
            ? photonData.features.map((f) => ({
                name: f?.properties?.name
                  ? `${f.properties.name}${f.properties.city ? `, ${f.properties.city}` : ''}`
                  : f?.properties?.label || 'Unknown place',
                lat: Number(f?.geometry?.coordinates?.[1]),
                lng: Number(f?.geometry?.coordinates?.[0]),
                source: 'Live',
              }))
            : [];
        }

        // Fallback provider: Nominatim when Photon has sparse results.
        if (mapped.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng)).length < 3) {
          const params = new URLSearchParams({
            q,
            format: 'jsonv2',
            addressdetails: '1',
            limit: '8',
          });
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
          if (nomRes.ok) {
            const nomData = await nomRes.json();
            const fallbackMapped = Array.isArray(nomData)
              ? nomData.map((item) => ({
                  name: item.display_name,
                  lat: Number(item.lat),
                  lng: Number(item.lon),
                  source: 'Live',
                }))
              : [];
            mapped = [...mapped, ...fallbackMapped];
          }
        }

        const unique = [];
        const seen = new Set();
        mapped.forEach((item) => {
          const key = `${item.name}|${item.lat}|${item.lng}`;
          if (!seen.has(key) && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
            seen.add(key);
            unique.push(item);
          }
        });

        setRemoteLocations(unique.slice(0, 10));
      } catch (err) {
        console.error('Live location search failed:', err);
        setRemoteLocations([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    
    if (value.trim() === '') {
      setFilteredLocations([]);
      setShowDropdown(false);
    } else {
      const filtered = BENGALURU_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8).map((loc) => ({ ...loc, source: 'Preset' }));
      
      setFilteredLocations(filtered);
      setShowDropdown(true);
    }
  };

  const handleLocationClick = (location) => {
    setSearchText(location.name);
    setShowDropdown(false);
    setIsFocused(false);
    onLocationSelect({ lat: location.lat, lng: location.lng }, location.name);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchText.trim() !== '') {
      setShowDropdown(true);
    } else {
      // Show all locations when focused with empty search
      setFilteredLocations(BENGALURU_LOCATIONS.slice(0, 8).map((loc) => ({ ...loc, source: 'Preset' })));
      setShowDropdown(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay to allow click on dropdown item
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleCurrentLocationClick = () => {
    if (!navigator.geolocation || isLocatingCurrent) return;
    setIsLocatingCurrent(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSearchText('My Current Location');
        setShowDropdown(false);
        setIsFocused(false);
        setIsLocatingCurrent(false);
        onLocationSelect({ lat, lng }, 'My Current Location');
      },
      (error) => {
        console.error('Current location fetch failed:', error);
        setIsLocatingCurrent(false);
        alert('Unable to fetch current location. Please allow location permission.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const mergedLocations = [
    ...remoteLocations,
    ...filteredLocations.filter((preset) => !remoteLocations.some((live) => live.name === preset.name)),
  ].slice(0, 12);

  return (
    <div className="location-search-container">
      {label && <label className="location-label">{label}</label>}
      <div className="search-input-wrapper">
        <input
          type="text"
          className="location-search-input"
          placeholder={placeholder || "Search location or click on map..."}
          value={searchText}
          onChange={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
        />
        <span className="search-icon">🔍</span>
        
        {showDropdown && (
          <div className="location-dropdown">
            {enableCurrentLocation && (
              <div
                className="location-dropdown-item location-current-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCurrentLocationClick();
                }}
              >
                <span className="location-icon">📡</span>
                <span className="location-name">
                  {isLocatingCurrent ? 'Getting current location...' : 'Use Current Location'}
                </span>
                <span className="location-coords">Live GPS</span>
              </div>
            )}
            {isSearching && <div className="location-dropdown-status">Searching live locations...</div>}
            {!isSearching && mergedLocations.length === 0 && (
              <div className="location-dropdown-status">No locations found</div>
            )}
            {mergedLocations.map((location, index) => (
              <div
                key={index}
                className="location-dropdown-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleLocationClick(location);
                }}
              >
                <span className="location-icon">📍</span>
                <span className="location-name">{location.name}</span>
                <span className="location-coords">
                  {location.source ? `${location.source} · ` : ''}{location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationSearch;
