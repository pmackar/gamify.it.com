import { describe, it, expect } from "vitest";
import {
  XP_VALUES,
  calculateXPForLevel,
  calculateLevelFromTotalXP,
  calculateLocationXP,
} from "@/lib/gamification";

describe("XP_VALUES constants", () => {
  it("has correct base XP values", () => {
    expect(XP_VALUES.new_location).toBe(50);
    expect(XP_VALUES.new_city).toBe(200);
    expect(XP_VALUES.new_country).toBe(500);
    expect(XP_VALUES.visit).toBe(25);
    expect(XP_VALUES.first_visit).toBe(50);
  });

  it("has type multipliers for all location types", () => {
    expect(XP_VALUES.type_multipliers.RESTAURANT).toBe(1.0);
    expect(XP_VALUES.type_multipliers.ATTRACTION).toBe(1.5);
    expect(XP_VALUES.type_multipliers.MUSEUM).toBe(1.5);
    expect(XP_VALUES.type_multipliers.CAFE).toBe(0.8);
    expect(XP_VALUES.type_multipliers.TRANSPORT).toBe(0.5);
  });

  it("has streak multipliers at correct thresholds", () => {
    expect(XP_VALUES.streak_multipliers[3]).toBe(1.1);
    expect(XP_VALUES.streak_multipliers[7]).toBe(1.25);
    expect(XP_VALUES.streak_multipliers[14]).toBe(1.5);
    expect(XP_VALUES.streak_multipliers[30]).toBe(2.0);
  });
});

describe("calculateXPForLevel", () => {
  it("returns 100 XP for level 1", () => {
    expect(calculateXPForLevel(1)).toBe(100);
  });

  it("returns 150 XP for level 2", () => {
    expect(calculateXPForLevel(2)).toBe(150);
  });

  it("returns 225 XP for level 3", () => {
    expect(calculateXPForLevel(3)).toBe(225);
  });

  it("scales by 1.5x per level", () => {
    const level5 = calculateXPForLevel(5);
    const level6 = calculateXPForLevel(6);
    expect(level6).toBe(Math.floor(level5 * 1.5));
  });
});

describe("calculateLevelFromTotalXP", () => {
  it("returns level 1 with 0 XP", () => {
    const result = calculateLevelFromTotalXP(0);
    expect(result.level).toBe(1);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(100);
  });

  it("returns level 2 at exactly 100 XP", () => {
    const result = calculateLevelFromTotalXP(100);
    expect(result.level).toBe(2);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(150);
  });

  it("calculates correct progress within level", () => {
    const result = calculateLevelFromTotalXP(175);
    expect(result.level).toBe(2);
    expect(result.xpInLevel).toBe(75);
    expect(result.xpToNext).toBe(150);
  });

  it("handles level 3 boundary", () => {
    const result = calculateLevelFromTotalXP(250); // 100 + 150
    expect(result.level).toBe(3);
    expect(result.xpInLevel).toBe(0);
    expect(result.xpToNext).toBe(225);
  });
});

describe("calculateLocationXP", () => {
  describe("base XP calculations", () => {
    it("returns correct XP for new_location action", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 0);
      expect(xp).toBe(50); // 50 * 1.0 type * 1.0 streak
    });

    it("returns correct XP for visit action", () => {
      const xp = calculateLocationXP("visit", "RESTAURANT", 0);
      expect(xp).toBe(25);
    });

    it("returns correct XP for new_city action", () => {
      const xp = calculateLocationXP("new_city", "RESTAURANT", 0);
      expect(xp).toBe(200);
    });

    it("returns default 25 XP for unknown action", () => {
      const xp = calculateLocationXP("unknown_action", "RESTAURANT", 0);
      expect(xp).toBe(25);
    });
  });

  describe("type multipliers", () => {
    it("applies ATTRACTION multiplier (1.5x)", () => {
      const xp = calculateLocationXP("new_location", "ATTRACTION", 0);
      expect(xp).toBe(75); // 50 * 1.5
    });

    it("applies MUSEUM multiplier (1.5x)", () => {
      const xp = calculateLocationXP("visit", "MUSEUM", 0);
      expect(xp).toBe(37); // 25 * 1.5 floored
    });

    it("applies CAFE multiplier (0.8x)", () => {
      const xp = calculateLocationXP("new_location", "CAFE", 0);
      expect(xp).toBe(40); // 50 * 0.8
    });

    it("applies TRANSPORT multiplier (0.5x)", () => {
      const xp = calculateLocationXP("new_location", "TRANSPORT", 0);
      expect(xp).toBe(25); // 50 * 0.5
    });

    it("uses 1.0 multiplier for unknown type", () => {
      const xp = calculateLocationXP("new_location", "UNKNOWN_TYPE", 0);
      expect(xp).toBe(50);
    });
  });

  describe("streak multipliers", () => {
    it("no streak multiplier below 3 days", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 2);
      expect(xp).toBe(50);
    });

    it("applies 1.1x at 3 day streak", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 3);
      expect(xp).toBe(55); // 50 * 1.1
    });

    it("applies 1.25x at 7 day streak", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 7);
      expect(xp).toBe(62); // 50 * 1.25 floored
    });

    it("applies 1.5x at 14 day streak", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 14);
      expect(xp).toBe(75); // 50 * 1.5
    });

    it("applies 2.0x at 30 day streak", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 30);
      expect(xp).toBe(100); // 50 * 2.0
    });

    it("uses highest applicable multiplier for long streaks", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 50);
      expect(xp).toBe(100); // Still 2.0x (30 day max)
    });

    it("uses highest threshold when between values", () => {
      const xp = calculateLocationXP("new_location", "RESTAURANT", 20);
      expect(xp).toBe(75); // 1.5x (14 day threshold)
    });
  });

  describe("combined multipliers", () => {
    it("applies both type and streak multipliers", () => {
      // ATTRACTION (1.5x) + 7-day streak (1.25x)
      const xp = calculateLocationXP("new_location", "ATTRACTION", 7);
      expect(xp).toBe(93); // 50 * 1.5 * 1.25 = 93.75 floored
    });

    it("stacks all multipliers correctly for max XP", () => {
      // new_country (500) + ATTRACTION (1.5x) + 30-day (2.0x)
      const xp = calculateLocationXP("new_country", "ATTRACTION", 30);
      expect(xp).toBe(1500); // 500 * 1.5 * 2.0
    });
  });
});

describe("Quest XP constants", () => {
  it("has correct quest completion values", () => {
    expect(XP_VALUES.quest_complete_base).toBe(100);
    expect(XP_VALUES.quest_complete_per_item).toBe(15);
    expect(XP_VALUES.party_bonus_multiplier).toBe(1.25);
    expect(XP_VALUES.party_member_bonus).toBe(50);
  });

  it("can calculate simple quest XP", () => {
    const itemCount = 5;
    const baseXP = XP_VALUES.quest_complete_base;
    const itemXP = XP_VALUES.quest_complete_per_item * itemCount;
    const totalXP = baseXP + itemXP;
    expect(totalXP).toBe(175); // 100 + (15 * 5)
  });

  it("can calculate party quest XP", () => {
    const itemCount = 5;
    const partySize = 3;
    const baseXP = XP_VALUES.quest_complete_base;
    const itemXP = XP_VALUES.quest_complete_per_item * itemCount;
    const partyBonus = XP_VALUES.party_member_bonus * partySize;
    const subtotal = (baseXP + itemXP + partyBonus) * XP_VALUES.party_bonus_multiplier;
    expect(Math.floor(subtotal)).toBe(406); // (100 + 75 + 150) * 1.25 = 406.25
  });
});
