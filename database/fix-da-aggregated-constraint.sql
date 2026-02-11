--================================================================================
-- Fix DA Aggregated Table Unique Constraint
-- Problem: All LGA codes are 'UNKNOWN', causing data collisions
-- Solution: Use lga_name instead of lga_code in unique constraint
--==============================================================================

-- Step 1: Drop existing constraint
ALTER TABLE housing_dashboard.da_aggregated
DROP CONSTRAINT IF EXISTS unique_lga_period;

-- Step 2: Add new constraint using lga_name instead
ALTER TABLE housing_dashboard.da_aggregated
ADD CONSTRAINT unique_lga_period UNIQUE(lga_name, period_type, period_start);

-- Step 3: Drop old index (no longer needed)
DROP INDEX IF EXISTS housing_dashboard.idx_da_agg_lga_period;

-- Step 4: Create new index for better performance
CREATE INDEX IF NOT EXISTS idx_da_agg_lga_name_period
ON housing_dashboard.da_aggregated(lga_name, period_type, period_start);

-- Verify the changes
\d housing_dashboard.da_aggregated
