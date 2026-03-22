-- Alter card_details table to add census population and growth rate columns
-- This adds historical census data and annual growth calculations

-- First, update the level constraint to include 'country'
ALTER TABLE housing_dashboard.card_details
DROP CONSTRAINT IF EXISTS card_details_level_check;

ALTER TABLE housing_dashboard.card_details
ADD CONSTRAINT card_details_level_check CHECK (level IN ('country', 'state', 'region', 'lga'));

-- Add census year columns
ALTER TABLE housing_dashboard.card_details
ADD COLUMN IF NOT EXISTS population_2011 BIGINT,
ADD COLUMN IF NOT EXISTS population_2016 BIGINT,
ADD COLUMN IF NOT EXISTS population_2021 BIGINT,
ADD COLUMN IF NOT EXISTS population_2024 BIGINT;

-- Add population growth rate columns
ALTER TABLE housing_dashboard.card_details
ADD COLUMN IF NOT EXISTS growth_rate_2011_2016 NUMERIC(5,2),  -- Annual % growth 2011-2016
ADD COLUMN IF NOT EXISTS growth_rate_2016_2021 NUMERIC(5,2),  -- Annual % growth 2016-2021
ADD COLUMN IF NOT EXISTS growth_rate_2021_2024 NUMERIC(5,2),  -- Annual % growth 2021-2024
ADD COLUMN IF NOT EXISTS growth_rate_annual_avg NUMERIC(5,2); -- Average annual % growth

-- Add comments
COMMENT ON COLUMN housing_dashboard.card_details.population_2011 IS 'Population from 2011 Census';
COMMENT ON COLUMN housing_dashboard.card_details.population_2016 IS 'Population from 2016 Census';
COMMENT ON COLUMN housing_dashboard.card_details.population_2021 IS 'Population from 2021 Census';
COMMENT ON COLUMN housing_dashboard.card_details.population_2024 IS 'Current estimated population (2024)';
COMMENT ON COLUMN housing_dashboard.card_details.growth_rate_2011_2016 IS 'Average annual population growth rate 2011-2016 (%)';
COMMENT ON COLUMN housing_dashboard.card_details.growth_rate_2016_2021 IS 'Average annual population growth rate 2016-2021 (%)';
COMMENT ON COLUMN housing_dashboard.card_details.growth_rate_2021_2024 IS 'Average annual population growth rate 2021-2024 (%)';
COMMENT ON COLUMN housing_dashboard.card_details.growth_rate_annual_avg IS 'Average annual population growth rate 2011-2024 (%)';

-- Create indexes for population queries
CREATE INDEX IF NOT EXISTS idx_card_details_pop_2024 ON housing_dashboard.card_details(population_2024);
CREATE INDEX IF NOT EXISTS idx_card_details_growth_avg ON housing_dashboard.card_details(growth_rate_annual_avg);

-- Update the existing population column to be population_2024 for consistency
UPDATE housing_dashboard.card_details
SET population_2024 = population
WHERE population IS NOT NULL;

COMMENT ON COLUMN housing_dashboard.card_details.population IS 'Deprecated - use population_2024 instead';
