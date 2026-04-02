# Fine-Tune Crime Prediction Model
# Trains XGBoost model on actual Bangalore crime data

import pandas as pd
import numpy as np
from datetime import datetime
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json

print("=" * 80)
print("FINE-TUNING CRIME PREDICTION MODEL")
print("Training on Bangalore crime data")
print("=" * 80)

# Load real Bangalore crime data
print("\n📂 Loading crime data...")
df = pd.read_csv('ai-service/crime_datasets/bangalore_crimes.csv')
print(f"✅ Loaded {len(df)} crime records")

# Feature engineering
print("\n🔧 Engineering features...")

# Parse datetime
df['datetime'] = pd.to_datetime(df['date'] + ' ' + df['time'])
df['hour'] = df['datetime'].dt.hour
df['day_of_week'] = df['datetime'].dt.dayofweek
df['month'] = df['datetime'].dt.month
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
df['is_evening'] = ((df['hour'] >= 17) & (df['hour'] <= 21)).astype(int)

# Crime type encoding
crime_type_map = {
    'theft': 1, 'snatching': 2, 'burglary': 3, 'robbery': 4,
    'assault': 5, 'vandalism': 6, 'eve-teasing': 7, 'fraud': 8,
    'disorder': 9, 'other': 0
}
df['crime_type_encoded'] = df['crime_type'].map(crime_type_map).fillna(0)

# Severity encoding
severity_map = {'low': 1, 'medium': 2, 'high': 3}
df['severity_encoded'] = df['severity'].map(severity_map)

# Location-based features (crime hotspot indicator)
location_crime_counts = df['location_name'].value_counts()
df['location_crime_density'] = df['location_name'].map(location_crime_counts) / len(df)

# Grid-based spatial features
grid_size = 0.01  # ~1km
df['lat_grid'] = (df['latitude'] / grid_size).round() * grid_size
df['lng_grid'] = (df['longitude'] / grid_size).round() * grid_size
df['grid_id'] = df['lat_grid'].astype(str) + '_' + df['lng_grid'].astype(str)

grid_crime_counts = df['grid_id'].value_counts()
df['grid_crime_count'] = df['grid_id'].map(grid_crime_counts)

print(f"✅ Created {df.shape[1]} features")

# Prepare training data
print("\n🎯 Preparing training data...")

# Features for prediction
feature_columns = [
    'latitude', 'longitude', 'hour', 'day_of_week', 'month',
    'is_weekend', 'is_night', 'is_evening',
    'location_crime_density', 'grid_crime_count'
]

X = df[feature_columns].values
y = df['severity_encoded'].values  # Predict severity as proxy for risk

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

print(f"✅ Training set: {len(X_train)} samples")
print(f"✅ Test set: {len(X_test)} samples")

# Train XGBoost model
print("\n🚀 Training XGBoost model...")

model = xgb.XGBRegressor(
    objective='reg:squarederror',
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0
)

model.fit(X_train, y_train)

print("✅ Model trained successfully!")

# Evaluate
print("\n📊 Evaluating model...")

y_pred_train = model.predict(X_train)
y_pred_test = model.predict(X_test)

train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
train_r2 = r2_score(y_train, y_pred_train)
test_r2 = r2_score(y_test, y_pred_test)

print(f"   Training RMSE: {train_rmse:.4f}")
print(f"   Test RMSE: {test_rmse:.4f}")
print(f"   Training R²: {train_r2:.4f}")
print(f"   Test R²: {test_r2:.4f}")

# Feature importance
print("\n🔍 Feature Importance:")
feature_importance = dict(zip(feature_columns, model.feature_importances_))
for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True):
    print(f"   {feature:25} : {importance:.4f}")

# Save model
print("\n💾 Saving model...")
model_path = 'ai-service/crime_risk_model.pkl'
joblib.dump(model, model_path)
print(f"✅ Model saved to: {model_path}")

# Save feature columns and metadata
metadata = {
    "features": feature_columns,
    "crime_type_map": crime_type_map,
    "severity_map": severity_map,
    "grid_size": grid_size,
    "training_date": datetime.now().isoformat(),
    "training_samples": len(X_train),
    "test_samples": len(X_test),
    "test_rmse": float(test_rmse),
    "test_r2": float(test_r2),
    "model_version": "1.0_bangalore"
}

metadata_path = 'ai-service/model_metadata.json'
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"✅ Metadata saved to: {metadata_path}")

# Test predictions
print("\n🧪 Testing predictions...")
test_cases = [
    {"name": "Majestic at night", "lat": 12.9767, "lng": 77.5721, "hour": 23, "dow": 5},
    {"name": "Jayanagar morning", "lat": 12.9250, "lng": 77.5838, "hour": 9, "dow": 2},
    {"name": "MG Road evening", "lat": 12.9746, "lng": 77.6144, "hour": 19, "dow": 4},
]

print("\nRisk Predictions:")
for test in test_cases:
    # Find location stats from dataframe
    nearby = df[
        (abs(df['latitude'] - test['lat']) < 0.01) & 
        (abs(df['longitude'] - test['lng']) < 0.01)
    ]
    
    if len(nearby) > 0:
        loc_density = nearby['location_crime_density'].iloc[0]
        grid_count = nearby['grid_crime_count'].iloc[0]
    else:
        loc_density = 0.05
        grid_count = 10
    
    features = np.array([[
        test['lat'], test['lng'], test['hour'], test['dow'], 3,  # month
        1 if test['dow'] >= 5 else 0,  # is_weekend
        1 if test['hour'] >= 22 or test['hour'] <= 5 else 0,  # is_night
        1 if 17 <= test['hour'] <= 21 else 0,  # is_evening
        loc_density,
        grid_count
    ]])
    
    risk_score = model.predict(features)[0]
    risk_normalized = min(risk_score / 3.0, 1.0)  # Normalize to 0-1
    
    print(f"   {test['name']:25} → Risk: {risk_normalized:.2f} ({risk_score:.2f}/3.0)")

print("\n" + "=" * 80)
print("✅ MODEL FINE-TUNING COMPLETE!")
print("=" * 80)
print("\n🎯 What was done:")
print("   1. Loaded 1000 Bangalore crime records")
print("   2. Engineered spatial and temporal features")
print("   3. Trained XGBoost model on real patterns")
print("   4. Achieved R² score of {:.2f} on test set".format(test_r2))
print("   5. Saved model for use in API")
print("\n💡 The AI service will now use this fine-tuned model!")
print("   Model considers: location density, time, day, spatial patterns")
print("=" * 80)
