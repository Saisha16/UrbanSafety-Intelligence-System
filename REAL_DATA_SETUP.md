# 🔴 REAL CRIME DATA INTEGRATION GUIDE

## Quick Start - Get Real Data NOW

### Option 1: Download from Data.gov.in (RECOMMENDED) ✅

1. **Visit:** https://data.gov.in/
2. **Search:** "crime Karnataka" or "crime Bengaluru"
3. **Download** available CSV/Excel files
4. **Convert** to required format (see template below)
5. **Save as:** `crime_datasets/bangalore_crimes.csv`

### Option 2: Use Kaggle Datasets ✅

1. **Visit:** https://www.kaggle.com/datasets
2. **Search:** "India crime statistics" or "Bengaluru crime"
3. **Download** dataset
4. **Format** according to template
5. **Save** in `crime_datasets/`

### Option 3: Contact Bangalore Police 📧

**Email:** ksp.bangalore@nic.in  
**Website:** https://bangalorepolice.gov.in/

Request access to:
- Historical crime statistics
- Crime incident reports (anonymized)
- Public safety data
- API access for real-time data

### Option 4: RTI Request (Right to Information) 📝

File RTI online: https://rtionline.gov.in/

**Request:**
> "Crime statistics data for Bengaluru City for the past 12 months including:
> - Date and time of incident
> - Location (latitude/longitude or area name)
> - Type of crime
> - Severity classification"

**Timeline:** 30 days for response

---

## Required Data Format

### CSV Template
Save as: `crime_datasets/bangalore_crimes.csv`

```csv
date,time,latitude,longitude,crime_type,severity,location_name
2024-01-15,14:30,12.9716,77.5946,theft,medium,MG Road
2024-01-16,22:45,12.9869,77.6009,robbery,high,Shivajinagar
2024-01-17,09:15,12.9767,77.5721,assault,medium,Majestic
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `date` | Date | ✅ Yes | Date of incident | 2024-01-15 |
| `time` | Time | ⚠️ Optional | Time of incident (24hr) | 14:30 |
| `latitude` | Float | ✅ Yes | Location latitude | 12.9716 |
| `longitude` | Float | ✅ Yes | Location longitude | 77.5946 |
| `crime_type` | String | ✅ Yes | Type of crime | theft, robbery, assault |
| `severity` | String | ⚠️ Optional | Severity level | low, medium, high |
| `location_name` | String | ⚠️ Optional | Area/landmark name | MG Road |

### Crime Types Recognized
- `theft` - Property theft
- `robbery` - Armed robbery
- `assault` - Physical assault
- `burglary` - Breaking and entering
- `vandalism` - Property damage
- `snatching` - Chain/bag snatching
- `pickpocketing` - Pickpocketing
- `eve-teasing` - Harassment
- `kidnapping` - Abduction
- `murder` - Homicide

---

## Implementation Steps

### Step 1: Prepare Your Data

1. Download real crime data from any source above
2. Open in Excel/Google Sheets
3. Format according to template
4. Ensure latitude/longitude are correct
5. Save as CSV: `bangalore_crimes.csv`

### Step 2: Place Data File

```bash
# Create directory
mkdir crime_datasets

# Place your CSV file
crime_datasets/bangalore_crimes.csv
```

### Step 3: Switch to Real Data Service

**Edit:** `ai-service/main_advanced.py`

**Change Line 4 from:**
```python
from crime_data_service import crime_service
```

**To:**
```python
from crime_data_service_real import crime_service
```

### Step 4: Restart AI Service

```bash
cd ai-service
python main_advanced.py
```

You should see:
```
✅ Loading REAL data from crime_datasets/bangalore_crimes.csv
✅ Loaded XXX REAL crime incidents
✅ Identified X high-crime zones from real data
```

---

## Verify Real Data Integration

### Test 1: Check Data Stats

```bash
cd ai-service
python crime_data_service_real.py
```

Expected output:
```json
{
  "total_incidents": 523,
  "data_source": "csv",
  "date_range": {
    "from": "2023-03-01",
    "to": "2024-03-08",
    "days": 373
  },
  "crime_types": {
    "theft": 145,
    "robbery": 87,
    "assault": 112
  },
  "hotspots_identified": 8,
  "data_quality": "REAL"
}
```

### Test 2: API Request

```bash
# Test risk prediction with real data
curl "http://localhost:8000/predict?lat=12.9716&lng=77.5946&time=2024-03-08T22:00:00"
```

Response will include:
```json
{
  "risk_score": 0.74,
  "nearby_incidents": 23,
  "recent_crimes": [
    {"type": "theft", "distance_km": 0.5, "date": "2024-03-05"}
  ]
}
```

---

## Alternative Data Sources

### 1. Academic Datasets
- **IIT Research Papers** - Often include crime datasets
- **University Crime Studies** - Contact researchers
- **Published Research** - Request supplementary data

### 2. International Examples (for Testing)
While developing, you can use international open data:

```python
# UK Police Data API (no auth required)
import requests
response = requests.get(
    "https://data.police.uk/api/crimes-street/all-crime",
    params={"lat": 51.5074, "lng": -0.1278, "date": "2024-01"}
)
crimes = response.json()
```

### 3. Build Your Own Dataset
Start collecting data manually:
- Monitor police reports (public domain)
- News crime reports (with timestamps/locations)
- Community incident reports
- Build incrementally over time

---

## Data Privacy & Legal Considerations

### ⚠️ IMPORTANT

1. **Anonymization:** Ensure no personal information in data
2. **Compliance:** Follow data protection laws (IT Act 2000)
3. **Permission:** Get proper authorization for police data
4. **Usage Rights:** Verify data usage permissions
5. **Attribution:** Credit data sources appropriately

### What NOT to Include
- ❌ Victim names or identities
- ❌ Suspect information
- ❌ Case file numbers (unless public)
- ❌ Personal addresses
- ❌ Sensitive investigation details

### What to Include
- ✅ Date and time of incident
- ✅ Location (coordinates or area name)
- ✅ Crime type/category
- ✅ Severity level
- ✅ Outcome (if public record)

---

## Troubleshooting

### "No real crime data found"
**Solution:** Check file path `crime_datasets/bangalore_crimes.csv` exists

### "Error loading CSV"
**Solutions:**
- Verify CSV format matches template
- Check column names are exact
- Ensure no extra spaces in headers
- Validate date format (YYYY-MM-DD)

### "Invalid latitude/longitude"
**Solutions:**
- Ensure values are numeric
- Bengaluru range: Lat 12.8-13.2, Lng 77.4-77.8
- Check for missing values
- Remove any text in coordinate fields

### "No hotspots identified"
**Solution:** Need at least 20 crimes in ~1km area to create hotspot
- Add more data
- Verify coordinates are clustered
- Check date range (last 60 days get priority)

---

## Support & Resources

### Official Government Sources
- **Data.gov.in:** https://data.gov.in/
- **NCRB:** https://ncrb.gov.in/
- **Karnataka Police:** https://ksp.karnataka.gov.in/
- **Bangalore Police:** https://bangalorepolice.gov.in/

### Technical Support
- See `real_crime_integration.py` for detailed examples
- Check `crime_data_service_real.py` for implementation
- Template CSV in `crime_datasets/bangalore_crimes_TEMPLATE.csv`

### Need Help?
1. Check file exists: `crime_datasets/bangalore_crimes.csv`
2. Validate CSV format matches template exactly
3. Run test: `python crime_data_service_real.py`
4. Check AI service logs for error messages

---

## Summary

✅ **To use REAL data:**
1. Get CSV from data.gov.in or Bangalore Police
2. Format as template
3. Save to `crime_datasets/bangalore_crimes.csv`
4. Change import in `main_advanced.py`
5. Restart service

🎯 **Result:** Your SafeGuard AI will use ACTUAL crime data for predictions and route safety calculations!
