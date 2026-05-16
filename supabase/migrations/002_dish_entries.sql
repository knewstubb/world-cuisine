-- Migration: Create dish_entries table
-- Dependencies: 001_households.sql (households table must exist)
-- Requirements: 2.2, 2.6, 2.7, 2.10, 2.11, 6.2

CREATE TABLE dish_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  photo_path TEXT,
  ingredients TEXT[] DEFAULT '{}' CHECK (array_length(ingredients, 1) IS NULL OR array_length(ingredients, 1) <= 50),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  recipe_link TEXT CHECK (recipe_link IS NULL OR recipe_link ~ '^https?://'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Indexes for efficient querying
CREATE INDEX idx_dish_entries_household_country ON dish_entries(household_id, country_code);
CREATE INDEX idx_dish_entries_household ON dish_entries(household_id);

-- Row Level Security
ALTER TABLE dish_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can CRUD dish entries" ON dish_entries
  FOR ALL USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );
