# Real Crime Data Integration Guide
# This module shows how to integrate REAL crime data sources

import requests
import pandas as pd
from datetime import datetime, timedelta
import json
import os

class RealCrimeDataIntegration:
    """
    Integration with real crime data sources.
    Choose one of the following methods based on data availability.
    """
    
    def __init__(self):
        self.data_dir = "crime_datasets"
        os.makedirs(self.data_dir, exist_ok=True)
    
    # ========================================
    # OPTION 1: India - NCRB Open Data
    # ========================================
    def fetch_ncrb_data(self):
        """
        National Crime Records Bureau (NCRB) - India
        Website: https://ncrb.gov.in/en/crime-in-india
        
        NCRB publishes annual crime statistics but doesn't have real-time API.
        Download datasets from: https://data.gov.in/
        """
        # Search for "crime" datasets on data.gov.in
        # Example datasets available:
        # - State-wise crime data
        # - City-wise crime statistics
        # - Type-wise crime records
        
        # Manual download required - place CSV files in crime_datasets/
        csv_path = f"{self.data_dir}/ncrb_crime_data.csv"
        
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            return self._process_ncrb_format(df)
        else:
            print(f"Download NCRB data from https://data.gov.in/ and place in {csv_path}")
            return None
    
    # ========================================
    # OPTION 2: Karnataka State Police Data
    # ========================================
    def fetch_karnataka_police_data(self):
        """
        Karnataka State Police
        Website: https://ksp.karnataka.gov.in/
        
        Check for:
        - Crime statistics reports
        - Open data initiatives
        - RTI (Right to Information) requests
        """
        # No public API currently available
        # Alternative: Web scraping (with permission) or data requests
        pass
    
    # ========================================
    # OPTION 3: Bengaluru Police Data
    # ========================================
    def fetch_bangalore_police_data(self):
        """
        Bengaluru City Police
        Website: https://bangalorepolice.gov.in/
        
        Options:
        1. Check for open data portal
        2. Submit RTI request for historical crime data
        3. Contact police department for API access
        """
        # Check if local cache exists
        json_path = f"{self.data_dir}/bangalore_crime_data.json"
        
        if os.path.exists(json_path):
            with open(json_path, 'r') as f:
                data = json.load(f)
            return self._process_bangalore_format(data)
        return None
    
    # ========================================
    # OPTION 4: International Open Data (for reference)
    # ========================================
    def fetch_uk_police_data(self, lat=51.5074, lng=-0.1278):
        """
        UK Police Data API (Example of how real API works)
        Free, no authentication required
        Documentation: https://data.police.uk/docs/
        
        This is just an example - use Indian data sources for production
        """
        try:
            # Last 12 months of crimes at specific location
            url = f"https://data.police.uk/api/crimes-street/all-crime"
            params = {
                'lat': lat,
                'lng': lng,
                'date': datetime.now().strftime('%Y-%m')
            }
            
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                crimes = response.json()
                print(f"✅ Fetched {len(crimes)} real crimes from UK Police API")
                return self._convert_uk_to_our_format(crimes)
            else:
                print(f"❌ API Error: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error fetching UK data: {e}")
            return None
    
    # ========================================
    # OPTION 5: Load from CSV/Excel Files
    # ========================================
    def load_from_csv(self, filepath):
        """
        Load crime data from CSV file
        
        Expected CSV format:
        date,time,latitude,longitude,crime_type,severity
        2024-01-15,14:30,12.9716,77.5946,theft,medium
        """
        try:
            df = pd.read_csv(filepath)
            required_cols = ['date', 'latitude', 'longitude', 'crime_type']
            
            if not all(col in df.columns for col in required_cols):
                print(f"❌ CSV must have columns: {required_cols}")
                return None
            
            crimes = []
            for _, row in df.iterrows():
                try:
                    crime_date = pd.to_datetime(row['date'])
                    hour = int(row.get('time', '00:00').split(':')[0]) if 'time' in row else 12
                    
                    crime = {
                        "id": len(crimes) + 1,
                        "type": row['crime_type'],
                        "lat": float(row['latitude']),
                        "lng": float(row['longitude']),
                        "timestamp": crime_date.isoformat(),
                        "hour": hour,
                        "severity": row.get('severity', 'medium')
                    }
                    crimes.append(crime)
                except Exception as e:
                    print(f"⚠️ Skipping row: {e}")
                    continue
            
            print(f"✅ Loaded {len(crimes)} crimes from CSV")
            return crimes
            
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return None
    
    # ========================================
    # OPTION 6: Scrape from Public Sources
    # ========================================
    def scrape_crime_news(self):
        """
        Scrape crime incidents from news websites (with permission)
        
        Sources:
        - Times of India Bengaluru Crime section
        - Deccan Herald crime reports
        - Local news aggregators
        
        ⚠️ Always respect robots.txt and terms of service
        ⚠️ Get permission before scraping
        """
        # Example structure - implement based on available sources
        pass
    
    # ========================================
    # Data Format Converters
    # ========================================
    
    def _process_ncrb_format(self, df):
        """Convert NCRB CSV format to our format"""
        crimes = []
        # Implement based on actual NCRB CSV structure
        return crimes
    
    def _process_bangalore_format(self, data):
        """Convert Bangalore Police JSON to our format"""
        crimes = []
        # Implement based on actual data structure
        return crimes
    
    def _convert_uk_to_our_format(self, uk_crimes):
        """Convert UK Police API format to our format (example)"""
        crimes = []
        for i, crime in enumerate(uk_crimes):
            crimes.append({
                "id": i + 1,
                "type": crime.get('category', 'unknown'),
                "lat": float(crime['location']['latitude']),
                "lng": float(crime['location']['longitude']),
                "timestamp": crime.get('month', '') + "-15T12:00:00",
                "hour": 12,  # UK data doesn't provide exact time
                "severity": "medium"
            })
        return crimes


# ========================================
# PRACTICAL STEPS TO GET REAL DATA
# ========================================
"""
STEP-BY-STEP GUIDE TO INTEGRATE REAL CRIME DATA:

1. CHECK DATA.GOV.IN:
   - Visit: https://data.gov.in/
   - Search: "crime Karnataka" or "crime Bengaluru"
   - Download available CSV/Excel files
   - Place in: ai-service/crime_datasets/

2. BENGALURU POLICE:
   - Visit: https://bangalorepolice.gov.in/
   - Look for "Statistics" or "Open Data" section
   - Contact: ksp.bangalore@nic.in for data access
   - File RTI request if needed

3. KARNATAKA STATE POLICE:
   - Visit: https://ksp.karnataka.gov.in/
   - Check annual reports (have statistics)
   - Request API access for real-time data

4. ACADEMIC/RESEARCH SOURCES:
   - Kaggle datasets (search "India crime")
   - Government research papers with data
   - University crime studies

5. ALTERNATIVE DATA SOURCES:
   - Google Dataset Search: https://datasetsearch.research.google.com/
   - Search: "Bengaluru crime statistics"
   - Check for publicly shared datasets

6. MANUAL DATA COLLECTION:
   - Collect from police reports (public domain)
   - Aggregate from news sources
   - Build over time with community reports

CSV FORMAT TO USE:
------------------
date,time,latitude,longitude,crime_type,severity,location_name
2024-01-15,14:30,12.9716,77.5946,theft,medium,MG Road
2024-01-16,22:45,12.9869,77.6009,robbery,high,Shivajinagar
2024-01-17,09:15,12.9767,77.5721,assault,medium,Majestic

Save as: crime_datasets/bangalore_crimes.csv
Then run: integration.load_from_csv('crime_datasets/bangalore_crimes.csv')
"""


# ========================================
# USAGE EXAMPLE
# ========================================
if __name__ == "__main__":
    integration = RealCrimeDataIntegration()
    
    print("=" * 60)
    print("REAL CRIME DATA INTEGRATION OPTIONS")
    print("=" * 60)
    
    # Try UK Police API (as example of working API)
    print("\n1. Testing UK Police API (example)...")
    uk_data = integration.fetch_uk_police_data(51.5074, -0.1278)
    
    # Check for local CSV
    print("\n2. Checking for local CSV data...")
    csv_file = "crime_datasets/bangalore_crimes.csv"
    if os.path.exists(csv_file):
        csv_data = integration.load_from_csv(csv_file)
    else:
        print(f"   ℹ️  Create {csv_file} with real data")
    
    # Instructions
    print("\n" + "=" * 60)
    print("TO USE REAL BANGALURU CRIME DATA:")
    print("=" * 60)
    print("1. Visit https://data.gov.in/")
    print("2. Search for 'crime Karnataka' datasets")
    print("3. Download CSV and place in crime_datasets/")
    print("4. OR create bangalore_crimes.csv manually")
    print("5. OR contact Bangalore Police for API access")
    print("=" * 60)
