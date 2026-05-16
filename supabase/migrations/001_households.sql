-- Migration: Create households and household_members tables
-- Requirements: 8.3 (sign-up creates household), 8.4 (invite with expiry), 8.8 (max 2 members)

-- Households table
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invite_code TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ
);

-- Household members (max 2 per household, enforced via trigger)
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- Indexes
CREATE INDEX idx_household_members_user ON household_members(user_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Households RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own household" ON households
  FOR SELECT USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create households" ON households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Members can update own household" ON households
  FOR UPDATE USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Household members RLS
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own household members" ON household_members
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can join households" ON household_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- Max 2 members per household constraint (via trigger)
-- =============================================================================

CREATE OR REPLACE FUNCTION check_household_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM household_members WHERE household_id = NEW.household_id) >= 2 THEN
    RAISE EXCEPTION 'Household already has the maximum of 2 members';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_household_member_limit
  BEFORE INSERT ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION check_household_member_limit();
