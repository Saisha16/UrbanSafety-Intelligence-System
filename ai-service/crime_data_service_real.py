# REAL CRIME DATA SERVICE
# Drop-in replacement for crime_data_service.py using actual data

import json
import os
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

class RealCrimeDataService:
    """
    Service to work with REAL crime data from actual sources
    Replace crime_data_service.py import with this file once you have real data
    """
    
    def __init__(self, data_source="csv"):
        """
        Initialize with real data source
        
        Args:
            data_source: "csv", "json", "api", or "database"
        """
        self.data_source = data_source
        self.crime_database = []
        self.high_crime_zones = []
        
        # Load real data
        self._load_real_data()
    
    def _load_real_data(self):
        """Load crime data from real sources"""
        
        # OPTION 1: Load from CSV file
        csv_path = "crime_datasets/bangalore_crimes.csv"
        if os.path.exists(csv_path):
            print(f"✅ Loading REAL data from {csv_path}")
            self.crime_database = self._load_from_csv(csv_path)
            self.high_crime_zones = self._identify_hotspots()
            print(f"✅ Loaded {len(self.crime_database)} REAL crime incidents")
            return
        
        # OPTION 2: Load from JSON file
        json_path = "crime_datasets/bangalore_crimes.json"
        if os.path.exists(json_path):
            print(f"✅ Loading REAL data from {json_path}")
            with open(json_path, 'r') as f:
                self.crime_database = json.load(f)
            self.high_crime_zones = self._identify_hotspots()
            print(f"✅ Loaded {len(self.crime_database)} REAL crime incidents")
            return
        
        # OPTION 3: Load from SQLite database
        db_path = "crime_datasets/crimes.db"
        if os.path.exists(db_path):
            print(f"✅ Loading REAL data from database {db_path}")
            self.crime_database = self._load_from_database(db_path)
            self.high_crime_zones = self._identify_hotspots()
            return
        
        # FALLBACK: No real data available
        print("⚠️  WARNING: No real crime data found!")
        print("📂 Please add data to one of:")
        print(f"   - {csv_path}")
        print(f"   - {json_path}")
        print(f"   - {db_path}")
        print("\n💡 See real_crime_integration.py for data sources")
        
        # Use minimal example data
        self.crime_database = self._create_example_structure()
        self.high_crime_zones = []
    
    def _load_from_csv(self, filepath):
        """Load crimes from CSV file"""
        try:
            df = pd.read_csv(filepath)
            crimes = []
            
            for idx, row in df.iterrows():
                # Parse datetime
                if 'time' in row and pd.notna(row['time']):
                    hour = int(str(row['time']).split(':')[0])
                else:
                    hour = 12
                
                crime_date = pd.to_datetime(row['date'])
                
                crime = {
                    "id": idx + 1,
                    "type": str(row.get('crime_type', 'unknown')).lower(),
                    "lat": float(row['latitude']),
                    "lng": float(row['longitude']),
                    "timestamp": crime_date.isoformat(),
                    "hour": hour,
                    "severity": str(row.get('severity', 'medium')).lower(),
                    "location_name": str(row.get('location_name', 'Unknown'))
                }
                crimes.append(crime)
            
            return crimes
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return []
    
    def _load_from_database(self, db_path):
        """Load crimes from SQLite database"""
        try:
            import sqlite3
            conn = sqlite3.connect(db_path)
            
            query = """
                SELECT id, crime_type, latitude, longitude, 
                       datetime, severity, location_name
                FROM crimes
                ORDER BY datetime DESC
            """
            
            df = pd.read_sql_query(query, conn)
            conn.close()
            
            crimes = []
            for idx, row in df.iterrows():
                crime_date = pd.to_datetime(row['datetime'])
                
                crime = {
                    "id": row['id'],
                    "type": row['crime_type'].lower(),
                    "lat": float(row['latitude']),
                    "lng": float(row['longitude']),
                    "timestamp": crime_date.isoformat(),
                    "hour": crime_date.hour,
                    "severity": row['severity'].lower(),
                    "location_name": row.get('location_name', 'Unknown')
                }
                crimes.append(crime)
            
            return crimes
        except Exception as e:
            print(f"❌ Error loading database: {e}")
            return []
    
    def _identify_hotspots(self):
        """Automatically identify high-crime zones from real data"""
        if not self.crime_database:
            return []
        
        # Grid-based clustering
        grid_size = 0.01  # ~1km
        grid = {}
        
        for crime in self.crime_database:
            grid_key = (
                round(crime["lat"] / grid_size) * grid_size,
                round(crime["lng"] / grid_size) * grid_size
            )
            if grid_key not in grid:
                grid[grid_key] = []
            grid[grid_key].append(crime)
        
        # Find high-crime areas (>20 incidents)
        hotspots = []
        for (lat, lng), crimes in grid.items():
            if len(crimes) >= 20:
                crime_rate = min(len(crimes) / 100, 0.95)
                hotspots.append({
                    "name": f"Zone_{len(hotspots)+1}",
                    "lat": lat,
                    "lng": lng,
                    "crime_rate": crime_rate,
                    "incident_count": len(crimes)
                })
        
        # Sort by crime rate
        hotspots.sort(key=lambda x: x["crime_rate"], reverse=True)
        
        print(f"✅ Identified {len(hotspots)} high-crime zones from real data")
        return hotspots[:10]  # Top 10 hotspots
    
    def _create_example_structure(self):
        """Create example structure showing expected format"""
        return [
            {
                "id": 1,
                "type": "theft",
                "lat": 12.9716,
                "lng": 77.5946,
                "timestamp": "2024-01-15T14:30:00",
                "hour": 14,
                "severity": "medium",
                "location_name": "MG Road"
            }
        ]
    
    # ========================================
    # SAME API AS SIMULATED VERSION
    # (No changes needed in main_advanced.py)
    # ========================================
    
    def get_risk_score(self, lat, lon, hour, day_of_week):
        """Calculate risk score using REAL crime data"""
        base_risk = 0.1
        
        # Check proximity to identified hotspots
        for zone in self.high_crime_zones:
            distance = self._calculate_distance(lat, lon, zone["lat"], zone["lng"])
            if distance < 0.01:  # Within ~1km
                base_risk += zone["crime_rate"] * 0.4
        
        # Count nearby REAL crimes
        nearby = self.get_nearby_crimes(lat, lon, radius_km=2)
        
        # Recent crimes have more weight
        recent_crimes = 0
        for crime in nearby:
            crime_date = datetime.fromisoformat(crime["timestamp"])
            days_ago = (datetime.now() - crime_date).days
            
            if days_ago < 7:
                recent_crimes += 2  # High weight
            elif days_ago < 30:
                recent_crimes += 1
            else:
                recent_crimes += 0.5
        
        # Add density factor
        density_factor = min(recent_crimes * 0.03, 0.5)
        base_risk += density_factor
        
        # Time-based adjustment (only if we have hour data)
        if hour >= 22 or hour <= 5:
            base_risk += 0.3
        elif 6 <= hour <= 8:
            base_risk += 0.1
        
        # Weekend adjustment
        if day_of_week in [5, 6]:
            base_risk += 0.1
        
        return min(base_risk, 1.0)
    
    def get_nearby_crimes(self, lat, lon, radius_km=2):
        """Get REAL crime incidents near a location"""
        nearby = []
        radius_deg = radius_km / 111  # Convert km to degrees
        
        for crime in self.crime_database:
            distance = self._calculate_distance(lat, lon, crime["lat"], crime["lng"])
            if distance < radius_deg:
                crime_copy = crime.copy()
                crime_copy["distance_km"] = round(distance * 111, 2)
                nearby.append(crime_copy)
        
        return sorted(nearby, key=lambda x: x["distance_km"])[:30]
    
    def get_crime_hotspots(self):
        """Get REAL crime hotspots for heatmap"""
        hotspots = []
        
        # Add identified high-crime zones
        for zone in self.high_crime_zones:
            hotspots.append({
                "lat": zone["lat"],
                "lng": zone["lng"],
                "intensity": zone["crime_rate"],
                "incident_count": zone.get("incident_count", 0),
                "area_name": zone["name"]
            })
        
        # Add recent crime clusters
        recent_crimes = [
            c for c in self.crime_database 
            if (datetime.now() - datetime.fromisoformat(c["timestamp"])).days < 60
        ]
        
        # Cluster recent crimes
        clusters = self._cluster_crimes(recent_crimes)
        for cluster in clusters[:20]:
            hotspots.append({
                "lat": cluster["lat"],
                "lng": cluster["lng"],
                "intensity": cluster["intensity"],
                "incident_count": cluster["count"],
                "area_name": "Recent Cluster"
            })
        
        return hotspots
    
    def _cluster_crimes(self, crimes):
        """Cluster crime locations"""
        if not crimes:
            return []
        
        grid_size = 0.008  # ~800m
        grid = {}
        
        for crime in crimes:
            grid_key = (
                round(crime["lat"] / grid_size) * grid_size,
                round(crime["lng"] / grid_size) * grid_size
            )
            if grid_key not in grid:
                grid[grid_key] = []
            grid[grid_key].append(crime)
        
        clusters = []
        for (lat, lng), crimes_in_cell in grid.items():
            if len(crimes_in_cell) >= 3:
                clusters.append({
                    "lat": lat,
                    "lng": lng,
                    "count": len(crimes_in_cell),
                    "intensity": min(len(crimes_in_cell) / 15, 1.0)
                })
        
        return sorted(clusters, key=lambda x: x["count"], reverse=True)
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points"""
        return np.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)
    
    def get_stats(self):
        """Get statistics about the real crime data"""
        if not self.crime_database:
            return {
                "total_incidents": 0,
                "data_source": "none",
                "message": "No real data loaded"
            }
        
        # Calculate date range
        dates = [datetime.fromisoformat(c["timestamp"]) for c in self.crime_database]
        
        # Crime type distribution
        crime_types = {}
        for crime in self.crime_database:
            ctype = crime["type"]
            crime_types[ctype] = crime_types.get(ctype, 0) + 1
        
        return {
            "total_incidents": len(self.crime_database),
            "data_source": self.data_source,
            "date_range": {
                "from": min(dates).strftime("%Y-%m-%d"),
                "to": max(dates).strftime("%Y-%m-%d"),
                "days": (max(dates) - min(dates)).days
            },
            "crime_types": crime_types,
            "hotspots_identified": len(self.high_crime_zones),
            "data_quality": "REAL" if len(self.crime_database) > 10 else "INSUFFICIENT"
        }
    
    def get_hotspots(self):
        """Alias for get_crime_hotspots() for compatibility"""
        return self.high_crime_zones
    
    def get_all_crimes(self):
        """Get all crime incidents"""
        return self.crime_database


# Create global instance
crime_service = RealCrimeDataService()

# Print stats on load
if __name__ == "__main__":
    stats = crime_service.get_stats()
    print("\n" + "=" * 60)
    print("REAL CRIME DATA SERVICE - STATUS")
    print("=" * 60)
    print(json.dumps(stats, indent=2))
    print("=" * 60)
