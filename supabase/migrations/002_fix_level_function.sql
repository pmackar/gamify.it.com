-- Fix calculate_level_from_xp to accept BIGINT (SUM returns BIGINT)
-- This replaces the INTEGER version with one that handles both types

CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp BIGINT)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  xp_remaining BIGINT := total_xp;
  xp_needed BIGINT := 100;
BEGIN
  -- Each level requires progressively more XP
  -- Level 1->2: 100, 2->3: 150, 3->4: 225, etc. (1.5x multiplier)
  WHILE xp_remaining >= xp_needed LOOP
    xp_remaining := xp_remaining - xp_needed;
    level := level + 1;
    xp_needed := FLOOR(xp_needed * 1.5);
  END LOOP;

  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Also keep INTEGER version for direct calls
CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN calculate_level_from_xp(total_xp::BIGINT);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
