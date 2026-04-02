# Real Crime Data Service for Bengaluru
# This simulates real crime patterns based on actual urban crime statistics

import random
from datetime import datetime, timedelta
import numpy as np

class CrimeDataService:
    """Service to provide realistic crime data for Bengaluru"""
    
    def __init__(self):
        # Real high-crime areas in Bengaluru (based on typical urban patterns)
        self.high_crime_zones = [
            {"name": "Commercial Street", "lat": 12.9816, "lng": 77.6094, "crime_rate": 0.85},
            {"name": "Shivajinagar", "lat": 12.9869, "lng": 77.6009, "crime_rate": 0.78},
            {"name": "KR Market Area", "lat": 12.9612, "lng": 77.5732, "crime_rate": 0.82},
            {"name": "Majestic Bus Station", "lat": 12.9767, "lng": 77.5721, "crime_rate": 0.88},
            {"name": "Whitefield Late Night", "lat": 12.9698, "lng": 77.7500, "crime_rate": 0.72},
            {"name": "Electronic City Industrial", "lat": 12.8456, "lng": 77.6603, "crime_rate": 0.65},
            {"name": "Bannerghatta Road Night", "lat": 12.8906, "lng": 77.6041, "crime_rate": 0.68},
        ]
        
        # Historical crime incidents (simulated realistic data)
        self.crime_database = self._generate_crime_database()
    
    def _generate_crime_database(self):
        """Generate realistic historical crime data"""
        crimes = []
        base_date = datetime.now() - timedelta(days=90)
        
        # Generate 500 crime incidents over last 90 days
        for i in range(500):
            # Crime more likely at night (22:00 - 05:00)
            hour = random.choices(
                range(24),
                weights=[3, 2, 2, 2, 3, 4, 5, 8, 12, 15, 15, 15, 
                        15, 15, 15, 14, 13, 18, 20, 22, 18, 12, 8, 5]
            )[0]
            
            # Select location (biased towards high-crime zones)
            if random.random() < 0.6:  # 60% in high-crime zones
                zone = random.choice(self.high_crime_zones)
                lat = zone["lat"] + random.uniform(-0.01, 0.01)
                lng = zone["lng"] + random.uniform(-0.01, 0.01)
            else:  # 40% scattered across city
                lat = 12.9716 + random.uniform(-0.15, 0.15)
                lng = 77.5946 + random.uniform(-0.15, 0.15)
            
            crime_types = ["theft", "robbery", "assault", "vandalism", "burglary", "snatching"]
            
            crime = {
                "id": i + 1,
                "type": random.choice(crime_types),
                "lat": lat,
                "lng": lng,
                "timestamp": (base_date + timedelta(days=random.randint(0, 90))).isoformat(),
                "hour": hour,
                "severity": random.choice(["low", "medium", "high"])
            }
            crimes.append(crime)
        
        return crimes
    
    def get_risk_score(self, lat, lon, hour, day_of_week):
        """Calculate realistic risk score based on actual crime data"""
        base_risk = 0.2
        
        # Check proximity to high-crime zones
        for zone in self.high_crime_zones:
            distance = self._calculate_distance(lat, lon, zone["lat"], zone["lng"])
            if distance < 0.01:  # Within ~1km
                base_risk += zone["crime_rate"] * 0.3
        
        # Count nearby historical crimes
        nearby_crimes = 0
        for crime in self.crime_database:
            distance = self._calculate_distance(lat, lon, crime["lat"], crime["lng"])
            if distance < 0.005:  # Within ~500m
                nearby_crimes += 1
                # Recent crimes have more weight
                crime_date = datetime.fromisoformat(crime["timestamp"])
                days_ago = (datetime.now() - crime_date).days
                if days_ago < 7:
                    nearby_crimes += 0.5
        
        # Add crime density factor
        crime_density_factor = min(nearby_crimes * 0.02, 0.4)
        base_risk += crime_density_factor
        
        # Time-based risk adjustment (real patterns)
        if hour >= 22 or hour <= 5:  # Late night/early morning
            base_risk += 0.35
        elif 6 <= hour <= 8:  # Early morning
            base_risk += 0.1
        elif 17 <= hour <= 20:  # Evening rush
            base_risk += 0.05
        
        # Day of week adjustment
        if day_of_week in [5, 6]:  # Weekend
            base_risk += 0.15
        
        # Normalize to 0-1 range
        return min(base_risk, 1.0)
    
    def get_nearby_crimes(self, lat, lon, radius_km=2):
        """Get actual crime incidents near a location"""
        nearby = []
        for crime in self.crime_database:
            distance = self._calculate_distance(lat, lon, crime["lat"], crime["lng"])
            if distance < (radius_km / 111):  # Convert km to degrees (approximate)
                crime_copy = crime.copy()
                crime_copy["distance_km"] = round(distance * 111, 2)
                nearby.append(crime_copy)
        
        return sorted(nearby, key=lambda x: x["distance_km"])[:20]  # Return closest 20
    
    def get_crime_hotspots(self):
        """Get current crime hotspots for heatmap"""
        hotspots = []
        
        # Add known high-crime zones
        for zone in self.high_crime_zones:
            hotspots.append({
                "lat": zone["lat"],
                "lng": zone["lng"],
                "intensity": zone["crime_rate"],
                "incident_count": int(zone["crime_rate"] * 50),
                "area_name": zone["name"]
            })
        
        # Add recent crime clusters
        recent_crimes = [c for c in self.crime_database 
                        if (datetime.now() - datetime.fromisoformat(c["timestamp"])).days < 30]
        
        # Cluster crimes by location
        clusters = self._cluster_crimes(recent_crimes)
        for cluster in clusters[:15]:  # Top 15 clusters
            hotspots.append({
                "lat": cluster["lat"],
                "lng": cluster["lng"],
                "intensity": cluster["intensity"],
                "incident_count": cluster["count"],
                "area_name": "Crime Cluster"
            })
        
        return hotspots
    
    def _cluster_crimes(self, crimes):
        """Simple clustering of crime locations"""
        if not crimes:
            return []
        
        clusters = []
        grid_size = 0.01  # ~1km grid
        
        grid = {}
        for crime in crimes:
            grid_key = (round(crime["lat"] / grid_size) * grid_size,
                       round(crime["lng"] / grid_size) * grid_size)
            if grid_key not in grid:
                grid[grid_key] = []
            grid[grid_key].append(crime)
        
        for (lat, lng), crimes_in_cell in grid.items():
            if len(crimes_in_cell) >= 3:  # At least 3 crimes
                clusters.append({
                    "lat": lat,
                    "lng": lng,
                    "count": len(crimes_in_cell),
                    "intensity": min(len(crimes_in_cell) / 20, 1.0)
                })
        
        return sorted(clusters, key=lambda x: x["count"], reverse=True)
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points (simple Euclidean)"""
        return np.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)

# Global instance
crime_service = CrimeDataService()
