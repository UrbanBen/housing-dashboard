-- Housing Insights Database Schema
-- Created for mecone-data-lake.postgres.database.azure.com

-- Enable PostGIS extension for GIS functionality (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Local Government Areas table
CREATE TABLE IF NOT EXISTS lgas (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    population INTEGER,
    area_sqkm DECIMAL(10,2),
    center_lat DECIMAL(10,7),
    center_lng DECIMAL(10,7),
    bounds_geom TEXT, -- GeoJSON string for boundary polygon
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Building Approvals data table
CREATE TABLE IF NOT EXISTS building_approvals (
    id SERIAL PRIMARY KEY,
    period VARCHAR(20) NOT NULL, -- Format: YYYY-MM
    month VARCHAR(20) NOT NULL,  -- Format: "Jan 2024"
    year INTEGER NOT NULL,
    approvals INTEGER NOT NULL,
    lga_id VARCHAR(50) REFERENCES lgas(id),
    lga_name VARCHAR(255),
    region VARCHAR(100),
    data_source VARCHAR(100) NOT NULL, -- 'ABS', 'Manual', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    UNIQUE(period, lga_id, data_source) -- Prevent duplicate entries
);

-- Housing Metrics comprehensive table
CREATE TABLE IF NOT EXISTS housing_metrics (
    id SERIAL PRIMARY KEY,
    lga_id VARCHAR(50) NOT NULL REFERENCES lgas(id),
    period VARCHAR(20) NOT NULL, -- Format: YYYY-MM
    building_approvals INTEGER DEFAULT 0,
    da_applications INTEGER DEFAULT 0,
    da_approvals INTEGER DEFAULT 0,
    construction_starts INTEGER DEFAULT 0,
    construction_completions INTEGER DEFAULT 0,
    median_price INTEGER DEFAULT 0,
    land_releases INTEGER DEFAULT 0,
    data_source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    UNIQUE(lga_id, period, data_source)
);

-- Development Applications table
CREATE TABLE IF NOT EXISTS development_applications (
    id SERIAL PRIMARY KEY,
    lga_id VARCHAR(50) NOT NULL REFERENCES lgas(id),
    period VARCHAR(20) NOT NULL,
    applications_submitted INTEGER DEFAULT 0,
    applications_approved INTEGER DEFAULT 0,
    applications_rejected INTEGER DEFAULT 0,
    average_processing_days INTEGER DEFAULT 0,
    approval_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    data_source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(lga_id, period, data_source)
);

-- Construction Activity table
CREATE TABLE IF NOT EXISTS construction_activity (
    id SERIAL PRIMARY KEY,
    lga_id VARCHAR(50) NOT NULL REFERENCES lgas(id),
    period VARCHAR(20) NOT NULL,
    standalone_starts INTEGER DEFAULT 0,
    townhouse_starts INTEGER DEFAULT 0,
    multiunit_starts INTEGER DEFAULT 0,
    standalone_completions INTEGER DEFAULT 0,
    townhouse_completions INTEGER DEFAULT 0,
    multiunit_completions INTEGER DEFAULT 0,
    data_source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(lga_id, period, data_source)
);

-- Land Releases table
CREATE TABLE IF NOT EXISTS land_releases (
    id SERIAL PRIMARY KEY,
    lga_id VARCHAR(50) NOT NULL REFERENCES lgas(id),
    period VARCHAR(20) NOT NULL,
    greenfield_lots INTEGER DEFAULT 0,
    infill_lots INTEGER DEFAULT 0,
    total_lots INTEGER DEFAULT 0,
    average_lot_size INTEGER DEFAULT 0, -- Square meters
    data_source VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(lga_id, period, data_source)
);

-- Data refresh log table
CREATE TABLE IF NOT EXISTS data_refresh_log (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(100) NOT NULL, -- 'building_approvals', 'housing_metrics', etc.
    source VARCHAR(100) NOT NULL,    -- 'ABS', 'Manual', etc.
    status VARCHAR(50) NOT NULL,     -- 'success', 'failed', 'partial'
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_building_approvals_period ON building_approvals(period);
CREATE INDEX IF NOT EXISTS idx_building_approvals_lga ON building_approvals(lga_id);
CREATE INDEX IF NOT EXISTS idx_building_approvals_year ON building_approvals(year);
CREATE INDEX IF NOT EXISTS idx_housing_metrics_lga_period ON housing_metrics(lga_id, period);
CREATE INDEX IF NOT EXISTS idx_lgas_region ON lgas(region);

-- Create function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at updates
CREATE TRIGGER update_lgas_updated_at BEFORE UPDATE ON lgas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_approvals_updated_at BEFORE UPDATE ON building_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_housing_metrics_updated_at BEFORE UPDATE ON housing_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample NSW LGA data
INSERT INTO lgas (id, name, region, population, center_lat, center_lng) VALUES
('sydney', 'Sydney', 'Sydney Metro', 240000, -33.8688, 151.2093),
('parramatta', 'Parramatta', 'Sydney Metro', 249000, -33.8150, 151.0000),
('blacktown', 'Blacktown', 'Sydney Metro', 387000, -33.7688, 150.9063),
('penrith', 'Penrith', 'Sydney Metro', 215000, -33.7506, 150.6940),
('liverpool', 'Liverpool', 'Sydney Metro', 230000, -33.9213, 150.9218),
('campbelltown', 'Campbelltown', 'Sydney Metro', 180000, -34.0650, 150.8081),
('wollongong', 'Wollongong', 'Illawarra', 220000, -34.4278, 150.8931),
('newcastle', 'Newcastle', 'Hunter', 167000, -32.9267, 151.7789),
('central-coast', 'Central Coast', 'Central Coast', 350000, -33.4255, 151.3486),
('blue-mountains', 'Blue Mountains', 'Sydney Metro', 82000, -33.7120, 150.3070)
ON CONFLICT (id) DO UPDATE SET
    population = EXCLUDED.population,
    center_lat = EXCLUDED.center_lat,
    center_lng = EXCLUDED.center_lng,
    updated_at = CURRENT_TIMESTAMP;

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;