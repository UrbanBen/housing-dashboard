-- Create card_details table in housing_dashboard schema
-- This table will store State, Region, and LGA data with area and population

DROP TABLE IF EXISTS housing_dashboard.card_details CASCADE;

CREATE TABLE housing_dashboard.card_details (
    id SERIAL PRIMARY KEY,
    level VARCHAR(10) NOT NULL CHECK (level IN ('state', 'region', 'lga')),

    -- State level fields
    state_code VARCHAR(5),
    state_name VARCHAR(100),

    -- Region level fields
    region_code VARCHAR(20),
    region_name VARCHAR(100),

    -- LGA level fields
    lga_code VARCHAR(10),
    lga_name VARCHAR(100),

    -- Metrics
    area_sqkm NUMERIC(15, 2),
    population BIGINT,

    -- Metadata
    data_source VARCHAR(255),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Composite unique constraint for each level
    CONSTRAINT unique_geographic_entity UNIQUE NULLS NOT DISTINCT (level, state_code, region_code, lga_code)
);

-- Create indexes for common queries
CREATE INDEX idx_card_details_level ON housing_dashboard.card_details(level);
CREATE INDEX idx_card_details_state ON housing_dashboard.card_details(state_code);
CREATE INDEX idx_card_details_region ON housing_dashboard.card_details(region_code);
CREATE INDEX idx_card_details_lga_name ON housing_dashboard.card_details(lga_name);

-- Insert State level (NSW)
INSERT INTO housing_dashboard.card_details (level, state_code, state_name, area_sqkm, population, data_source)
SELECT
    'state' as level,
    '1' as state_code,
    'New South Wales' as state_name,
    SUM(CAST(areasqkm AS NUMERIC)) as area_sqkm,
    NULL as population,  -- Will be updated with ABS data
    'housing_dashboard.search' as data_source
FROM housing_dashboard.search
WHERE ste_code21 = '1';

COMMENT ON TABLE housing_dashboard.card_details IS 'Hierarchical geographic data for State > Region > LGA with area and population metrics';
COMMENT ON COLUMN housing_dashboard.card_details.level IS 'Geographic level: state, region, or lga';
COMMENT ON COLUMN housing_dashboard.card_details.area_sqkm IS 'Area in square kilometers';
COMMENT ON COLUMN housing_dashboard.card_details.population IS 'Population count from ABS';
