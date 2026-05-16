-- Migration: Create popular_dishes table
-- Requirements: 4.1 (display up to 3 popular dishes per country), 4.2 (dish name + recipe link)

-- Popular dishes table (seeded, read-only for users)
CREATE TABLE popular_dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  name TEXT NOT NULL,
  recipe_link TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Index for efficient lookup by country with sort order
CREATE INDEX idx_popular_dishes_country ON popular_dishes(country_code, sort_order);

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE popular_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read popular dishes" ON popular_dishes
  FOR SELECT USING (true);
