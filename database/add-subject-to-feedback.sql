-- Add subject column to existing feedback table
ALTER TABLE housing_dashboard.user_feedback 
ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add comment
COMMENT ON COLUMN housing_dashboard.user_feedback.subject IS 'Brief subject/title of the feedback';
