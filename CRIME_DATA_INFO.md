# Crime Dataset Information

## Overview
The SafeGuard AI system uses **simulated realistic crime data** based on actual urban crime patterns and statistical distributions. This is NOT real police data, but rather scientifically modeled data that mimics real-world crime behavior.

## Data Source: crime_data_service.py

### 1. Historical Crime Database
**Location:** `ai-service/crime_data_service.py`

**Dataset Size:** 500 crime incidents over the last 90 days

**Crime Types Included:**
- Theft
- Robbery
- Assault
- Vandalism
- Burglary
- Snatching

**Data Fields for Each Incident:**
```python
{
    "id": 1,
    "type": "theft",           # Crime category
    "lat": 12.9816,           # Latitude
    "lng": 77.6094,           # Longitude
    "timestamp": "2025-12-08T23:45:00",  # ISO format
    "hour": 23,               # Hour of day (0-23)
    "severity": "high"        # low/medium/high
}
```

### 2. High-Crime Zones (7 Areas)
Based on typical urban crime patterns in Bengaluru:

| Zone Name | Latitude | Longitude | Crime Rate |
|-----------|----------|-----------|------------|
| Commercial Street | 12.9816 | 77.6094 | 85% |
| Shivajinagar | 12.9869 | 77.6009 | 78% |
| KR Market Area | 12.9612 | 77.5732 | 82% |
| Majestic Bus Station | 12.9767 | 77.5721 | **88%** (highest) |
| Whitefield Late Night | 12.9698 | 77.7500 | 72% |
| Electronic City Industrial | 12.8456 | 77.6603 | 65% |
| Bannerghatta Road Night | 12.8906 | 77.6041 | 68% |

### 3. Crime Distribution Patterns

#### Temporal Distribution (24-hour)
The system uses **weighted probability** for crime occurrence by hour:

**High-Risk Hours (22:00 - 05:00):**
- 22:00-23:00: 22% probability
- 23:00-00:00: 18% probability
- 00:00-05:00: 2-4% probability each
- **Night crimes get +35% risk factor**

**Medium-Risk Hours:**
- 17:00-20:00 (Evening rush): +5% risk
- 06:00-08:00 (Early morning): +10% risk

**Low-Risk Hours:**
- 08:00-17:00 (Daytime): Base risk only

#### Spatial Distribution
- **60%** of crimes occur within high-crime zones (±1km radius)
- **40%** scattered across greater Bengaluru area
- Clustering algorithm groups crimes within ~1km grid cells

#### Weekly Patterns
- **Weekends (Fri-Sat):** +15% risk factor
- Weekdays: Base risk

### 4. Risk Calculation Algorithm

**Formula:**
```
Risk Score = Base(0.2) + Location Factor + Time Factor + Crime Density + Day Factor
```

**Components:**
1. **Base Risk:** 0.2 (20%)
2. **High-Crime Zone Proximity:** 
   - Within 1km of zone: +30% × zone's crime rate
3. **Crime Density:** 
   - +2% per historical incident within 500m (max 40%)
   - Recent crimes (< 7 days): +50% weight
4. **Time Factor:**
   - Late night (22:00-05:00): +35%
   - Early morning (06:00-08:00): +10%
   - Evening rush (17:00-20:00): +5%
5. **Day Factor:**
   - Weekends: +15%

**Result:** Normalized to 0-1 range (0% - 100% risk)

## Important Notes

### This is Simulated Data
⚠️ **The crime data is NOT from actual police records.** It is:
- Generated programmatically using statistical models
- Based on typical urban crime patterns
- Designed to mimic real-world distributions
- Useful for demonstration and testing

### For Production Use
To use **real crime data**, you would need to:

1. **Integrate Police Department APIs:**
   - Bengaluru Police Open Data Portal
   - National Crime Records Bureau (NCRB) API
   - City-specific crime databases

2. **Replace crime_data_service.py with:**
   ```python
   # Example production integration
   def get_real_crime_data():
       response = requests.get("https://police-api.gov.in/crimes")
       return response.json()
   ```

3. **Consider Privacy & Legal Requirements:**
   - Data anonymization
   - Access permissions
   - GDPR/data protection compliance

### Data Accuracy
Current simulated dataset provides:
- ✅ Realistic temporal patterns (night/day variations)
- ✅ Spatial clustering (high-crime zones)
- ✅ Crime type diversity (6 categories)
- ✅ Statistical validity for ML training
- ❌ NOT actual historical crime data
- ❌ NOT suitable for real law enforcement decisions

## Algorithm Performance

**Safe Route Calculation:**
- Evaluates 3 different routes
- Calculates cumulative risk for each waypoint
- Considers distance × risk trade-offs
- Recommends lowest-risk route

**Crime Heatmap:**
- Shows 7 known high-crime zones
- Displays top 15 recent crime clusters
- Updates based on last 30 days of data
- Intensity scaled 0-1

**Prediction Accuracy:**
- Searches 2km radius around query location
- Returns up to 20 nearest incidents
- Provides incident count and recent crime list
- Risk score accounts for proximity decay

## How to Verify Data

### View Raw Crime Database:
```python
# In Python console
from crime_data_service import crime_service

# Total incidents
print(len(crime_service.crime_database))  # 500

# Sample crimes
print(crime_service.crime_database[:5])

# High-crime zones
print(crime_service.high_crime_zones)
```

### Test Risk Calculation:
```python
# Calculate risk for Majestic area at 11 PM on Saturday
risk = crime_service.get_risk_score(
    lat=12.9767,
    lon=77.5721,
    hour=23,
    day_of_week=5  # Saturday
)
print(f"Risk: {risk * 100:.1f}%")  # Expected: ~70-90%
```

### Check Nearby Crimes:
```python
# Get crimes near MG Road
crimes = crime_service.get_nearby_crimes(
    lat=12.9746,
    lon=77.6144,
    radius_km=1
)
print(f"Found {len(crimes)} crimes within 1km")
```

## Summary

**Current System Uses:**
- 500 simulated historical crime incidents (90-day period)
- 7 designated high-crime zones with realistic rates
- Time-based crime probability weights (24-hour cycle)
- Spatial clustering algorithm
- Multi-factor risk scoring

**NOT Using:**
- Real police department data
- Actual crime reports
- Live incident feeds
- Government crime databases

**For Production:** Replace with real APIs from law enforcement agencies.
