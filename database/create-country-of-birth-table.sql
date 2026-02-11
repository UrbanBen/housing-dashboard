-- Create table for Census 2021 Country of Birth data at LGA level
-- Source: ABS Census 2021 Table G09

CREATE TABLE IF NOT EXISTS s12_census.cen21_country_of_birth_lga (
  lga_name_2021 VARCHAR(255) NOT NULL,
  lga_code_2021 VARCHAR(50),
  country_of_birth VARCHAR(255) NOT NULL,
  age_group VARCHAR(50),
  sex VARCHAR(10),
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lga_name_2021, country_of_birth, age_group, sex)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cob_lga
  ON s12_census.cen21_country_of_birth_lga(lga_name_2021);

CREATE INDEX IF NOT EXISTS idx_cob_country
  ON s12_census.cen21_country_of_birth_lga(country_of_birth);

CREATE INDEX IF NOT EXISTS idx_cob_lga_country
  ON s12_census.cen21_country_of_birth_lga(lga_name_2021, country_of_birth);

-- Grant permissions to readonly user
GRANT SELECT ON s12_census.cen21_country_of_birth_lga TO mosaic_readonly;

-- Add comment describing the table
COMMENT ON TABLE s12_census.cen21_country_of_birth_lga IS
  'ABS Census 2021 Table G09: Country of birth of person by age by sex at LGA level';
