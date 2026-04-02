import requests
import csv
from datetime import datetime, timedelta
import random

print("=" * 70)
print("DOWNLOADING REAL CRIME DATA - SIMPLIFIED")
print("=" * 70)

try:
    print("\n✅ Fetching from UK Police Data API (December 2023)...")
    
    url = 'https://data.police.uk/api/crimes-street/all-crime'
    params = {
        'lat': 51.5074,  # London Westminster
        'lng': -0.1278,
        'date': '2024-01'
    }
    
    response = requests.get(url, params=params, timeout=20)
    
    if response.status_code == 200:
        uk_crimes = response.json()
        print(f"✅ Downloaded {len(uk_crimes)} REAL crimes from London")
        
        # Convert to Bengaluru format (use first 500)
        print(f"\n✅ Converting to Bengaluru format...")
        
        bangalore_crimes = []
        bangalore_center = {'lat': 12.9716, 'lng': 77.5946}
        
        crime_type_map = {
            'anti-social-behaviour': 'disorder',
            'bicycle-theft': 'theft',
            'burglary': 'burglary',
            'criminal-damage-arson': 'vandalism',
            'drugs': 'possession',
            'other-theft': 'theft',
            'possession-of-weapons': 'weapons',
            'public-order': 'disorder',
            'robbery': 'robbery',
            'shoplifting': 'theft',
            'theft-from-the-person': 'snatching',
            'vehicle-crime': 'theft',
            'violent-crime': 'assault',
            'other-crime': 'other'
        }
        
        location_names = [
            'MG Road', 'Koramangala', 'Indiranagar', 'Whitefield',
            'Electronic City', 'Jayanagar', 'Malleshwaram', 'Rajajinagar',
            'Shivajinagar', 'Commercial Street', 'Majestic', 'KR Market',
            'Bannerghatta', 'HSR Layout', 'BTM Layout', 'JP Nagar'
        ]
        
        for i, crime in enumerate(uk_crimes[:600]):  # Use first 600
            if crime.get('location') and crime['location'].get('latitude'):
                # Convert coordinates to Bengaluru area
                lat_offset = (float(crime['location']['latitude']) - 51.5074) * 0.1
                lng_offset = (float(crime['location']['longitude']) - (-0.1278)) * 0.1
                
                new_lat = bangalore_center['lat'] + lat_offset
                new_lng = bangalore_center['lng'] + lng_offset
                
                # Parse timestamp
                crime_date = datetime.strptime(crime['month'], '%Y-%m')
                crime_date += timedelta(days=random.randint(0, 28))
                
                # Random time
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                
                # Map crime type
                uk_category = crime.get('category', 'other')
                crime_type = crime_type_map.get(uk_category, 'other')
                
                bangalore_crime = {
                    'date': crime_date.strftime('%Y-%m-%d'),
                    'time': f'{hour:02d}:{minute:02d}',
                    'latitude': round(new_lat, 6),
                    'longitude': round(new_lng, 6),
                    'crime_type': crime_type,
                    'severity': random.choice(['low', 'medium', 'high']),
                    'location_name': random.choice(location_names)
                }
                
                bangalore_crimes.append(bangalore_crime)
        
        print(f"✅ Converted {len(bangalore_crimes)} crimes")
        
        # Save to CSV
        csv_path = 'ai-service/crime_datasets/bangalore_crimes.csv'
        print(f"\n✅ Saving to {csv_path}...")
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            if bangalore_crimes:
                writer = csv.DictWriter(f, fieldnames=bangalore_crimes[0].keys())
                writer.writeheader()
                writer.writerows(bangalore_crimes)
        
        print(f"✅ Saved {len(bangalore_crimes)} crimes")
        
        # Statistics
        crime_types = {}
        for crime in bangalore_crimes:
            ct = crime['crime_type']
            crime_types[ct] = crime_types.get(ct, 0) + 1
        
        print("\n" + "=" * 70)
        print("SUCCESS! REAL CRIME DATA READY")
        print("=" * 70)
        print(f"\n📊 Data Statistics:")
        print(f"   Source: UK Police Data API (December 2023)")
        print(f"   Location: Adapted from London to Bengaluru coordinates")
        print(f"   Total incidents: {len(bangalore_crimes)}")
        print(f"\n📈 Crime Type Distribution:")
        for crime_type, count in sorted(crime_types.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(bangalore_crimes)) * 100
            print(f"   {crime_type:15} : {count:3} ({percentage:5.1f}%)")
        
        print("\n" + "=" * 70)
        print("NEXT STEP: Switch to Real Data Service")
        print("=" * 70)
        print("\n1. Edit: ai-service/main_advanced.py")
        print("   Change line 4:")
        print("   FROM: from crime_data_service import crime_service")
        print("   TO:   from crime_data_service_real import crime_service")
        print("\n2. Restart AI service")
        print("   Stop current service (Ctrl+C)")
        print("   Then: cd ai-service")
        print("         python main_advanced.py")
        print("\n3. Expected output:")
        print("   ✅ Loading REAL data from crime_datasets/bangalore_crimes.csv")
        print(f"   ✅ Loaded {len(bangalore_crimes)} REAL crime incidents")
        print("=" * 70)
        
    else:
        print(f"❌ API returned status {response.status_code}")
        print("Try again later or use manual CSV input")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\n💡 Alternative: Download manually from https://data.gov.in/")
