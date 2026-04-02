# 🚀 Quick Start - Switch to Real Data

You now have everything ready to use **REAL crime data** instead of simulated data!

## Current Situation
- ❌ Using simulated crime data (500 generated incidents)
- ✅ Ready to switch to real data

## How to Get REAL Crime Data

### FASTEST: Download from Data.gov.in

1. **Visit:** https://data.gov.in/
2. **Search:** Type "crime Karnataka" or "police statistics"
3. **Download:** Any CSV/Excel file with crime data
4. **Format:** Match the template in `ai-service/crime_datasets/bangalore_crimes_TEMPLATE.csv`
5. **Save as:** `ai-service/crime_datasets/bangalore_crimes.csv`

### Required CSV Format:
```csv
date,time,latitude,longitude,crime_type,severity,location_name
2024-01-15,14:30,12.9716,77.5946,theft,medium,MG Road
2024-02-20,22:00,12.9869,77.6009,robbery,high,Shivajinagar
```

## Switch to Real Data (3 Easy Steps)

### Step 1: Add Your Real Data

Option A: **Download from Government Sources**
- data.gov.in → Search "Karnataka crime"
- Save as `ai-service/crime_datasets/bangalore_crimes.csv`

Option B: **Use the Template**
- Edit `ai-service/crime_datasets/bangalore_crimes_TEMPLATE.csv`
- Add real crime records
- Rename to `bangalore_crimes.csv`

Option C: **Contact Bangalore Police**
- Email: ksp.bangalore@nic.in
- Request historical crime statistics
- Format and save as CSV

### Step 2: Update AI Service

**Edit this file:** `ai-service/main_advanced.py`

**Find line 4:**
```python
from crime_data_service import crime_service
```

**Change to:**
```python
from crime_data_service_real import crime_service
```

### Step 3: Restart AI Service

```bash
# Stop current service (Ctrl+C in the terminal)
# Then restart:
cd ai-service
python main_advanced.py
```

**You should see:**
```
✅ Loading REAL data from crime_datasets/bangalore_crimes.csv
✅ Loaded 523 REAL crime incidents
✅ Identified 8 high-crime zones from real data
```

## Verify It's Working

### Test Command:
```bash
cd ai-service
python crime_data_service_real.py
```

**Expected Output:**
```json
{
  "total_incidents": 523,
  "data_source": "csv",
  "data_quality": "REAL"
}
```

## What You Get with Real Data

✅ **Actual Crime Patterns** - Not simulated  
✅ **Real Hotspots** - Automatically detected from data  
✅ **Historical Accuracy** - Based on actual incidents  
✅ **Better Predictions** - Using real statistical distributions  
✅ **Precise Routes** - Calculated from genuine crime locations  

## Where to Get Real Crime Data

### 1. Government Sources (FREE)
- **Data.gov.in**: https://data.gov.in/ → Search "crime Karnataka"
- **NCRB**: https://ncrb.gov.in/ → Crime statistics
- **Karnataka Police**: https://ksp.karnataka.gov.in/

### 2. RTI Request (30 days)
- File online: https://rtionline.gov.in/
- Request crime statistics for Bengaluru

### 3. Academic Sources
- Kaggle datasets: Search "India crime"
- Research papers with crime data
- University crime studies

### 4. Direct Contact
- **Bangalore Police**: https://bangalorepolice.gov.in/
- **Email**: ksp.bangalore@nic.in
- Request API access or data dump

## Files Created for You

1. **ai-service/crime_data_service_real.py**
   - Drop-in replacement for simulated data
   - Loads from CSV/JSON/Database
   - Auto-detects crime hotspots

2. **ai-service/real_crime_integration.py**
   - Shows all data source options
   - UK Police API example (working reference)
   - Format conversion tools

3. **ai-service/crime_datasets/bangalore_crimes_TEMPLATE.csv**
   - Example CSV structure
   - Ready to fill with real data

4. **REAL_DATA_SETUP.md**
   - Complete integration guide
   - Troubleshooting help
   - API examples

## Need Help?

**Can't find real data?**
- Start with the template CSV
- Manually add 20-30 real incidents from news reports
- Grow your dataset over time

**CSV format errors?**
- Check column names match exactly
- Ensure dates are YYYY-MM-DD format
- Validate lat/lng are numbers

**Want to test first?**
- See `real_crime_integration.py`
- Try UK Police API example (line 51)
- Uses real API to show how it works

## Summary

**Right Now:**
- Using 500 simulated crimes
- Good for demo/testing
- Not real police data

**After You Switch:**
- Using YOUR real crime CSV
- Actual historical incidents
- Genuine crime patterns
- Production-ready data

**Next Step:** Get CSV file from data.gov.in and follow 3 steps above! 🚀
