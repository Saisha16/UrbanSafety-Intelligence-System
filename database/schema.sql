
-- ====================
-- SafeGuard AI Database Schema
-- Enhanced with security, incident reporting, and user tracking
-- ====================

-- Users table with authentication
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('CITIZEN', 'POLICE', 'GOVT', 'BUSINESS')),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP
);

-- Crime records table
CREATE TABLE crimes (
  id SERIAL PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  crime_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  description TEXT,
  occurred_at TIMESTAMP NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Risk predictions table
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL,
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  prediction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  location_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incident reports from citizens
CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  incident_type VARCHAR(100) NOT NULL CHECK (incident_type IN ('theft', 'assault', 'harassment', 'vandalism', 'suspicious_activity', 'other')),
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name VARCHAR(255),
  severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  incident_time TIMESTAMP NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SOS emergency alerts
CREATE TABLE sos_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name VARCHAR(255),
  alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESPONDED', 'RESOLVED', 'CANCELLED')),
  responded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User location history
CREATE TABLE location_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  risk_score DOUBLE PRECISION,
  risk_level VARCHAR(20)
);

-- Saved locations (favorites)
CREATE TABLE saved_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_type VARCHAR(50) CHECK (location_type IN ('HOME', 'WORK', 'SCHOOL', 'FAVORITE', 'OTHER')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Risk alerts/notifications
CREATE TABLE risk_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('HIGH_RISK_AREA', 'INCIDENT_NEARBY', 'ROUTE_ALERT', 'CRIME_SPIKE', 'WEATHER_ALERT')),
  message TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  severity VARCHAR(20) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Safe routes cache
CREATE TABLE safe_routes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lon DOUBLE PRECISION NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lon DOUBLE PRECISION NOT NULL,
  route_data JSONB NOT NULL,
  risk_score DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- Indexes for performance
-- ====================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_crimes_location ON crimes(latitude, longitude);
CREATE INDEX idx_crimes_occurred_at ON crimes(occurred_at);
CREATE INDEX idx_crimes_type ON crimes(crime_type);
CREATE INDEX idx_predictions_location ON predictions(latitude, longitude);
CREATE INDEX idx_predictions_time ON predictions(prediction_time);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_location ON incidents(latitude, longitude);
CREATE INDEX idx_sos_alerts_user ON sos_alerts(user_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_location_history_user ON location_history(user_id);
CREATE INDEX idx_risk_alerts_user ON risk_alerts(user_id);
CREATE INDEX idx_risk_alerts_unread ON risk_alerts(user_id, is_read);

-- ====================
-- Sample data for demo users
-- ====================
-- Note: Passwords should be BCrypt hashed in production
-- These are placeholders
INSERT INTO users (name, email, password_hash, role) VALUES
  ('John Citizen', 'citizen@safeguard.ai', '$2a$10$example_hash_citizen', 'CITIZEN'),
  ('Officer Smith', 'police@safeguard.ai', '$2a$10$example_hash_police', 'POLICE'),
  ('Admin Govt', 'govt@safeguard.ai', '$2a$10$example_hash_govt', 'GOVT'),
  ('Business Owner', 'business@safeguard.ai', '$2a$10$example_hash_business', 'BUSINESS');

-- ====================
-- Trigger to update updated_at timestamp
-- ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
