import { describe, it, expect } from "vitest";
import {
  getAppLevelXPRequired,
  getAppLevelCumulativeXP,
  getAppLevelFromXP,
  getMainLevelXPRequired,
  getMainLevelCumulativeXP,
  getMainLevelFromXP,
} from "@/lib/levels";

describe("App Level Calculations (1.5x from 100)", () => {
  describe("getAppLevelXPRequired", () => {
    it("returns 100 XP for level 1", () => {
      expect(getAppLevelXPRequired(1)).toBe(100);
    });

    it("returns 150 XP for level 2 (100 * 1.5)", () => {
      expect(getAppLevelXPRequired(2)).toBe(150);
    });

    it("returns 225 XP for level 3 (150 * 1.5)", () => {
      expect(getAppLevelXPRequired(3)).toBe(225);
    });

    it("returns 337 XP for level 4 (225 * 1.5 floored)", () => {
      expect(getAppLevelXPRequired(4)).toBe(337);
    });

    it("scales correctly to level 10", () => {
      // Actual floored calculation: 100 * 1.5^9 = 3829.21... → 3829
      expect(getAppLevelXPRequired(10)).toBe(3829);
    });
  });

  describe("getAppLevelCumulativeXP", () => {
    it("returns 0 cumulative XP for level 1", () => {
      expect(getAppLevelCumulativeXP(1)).toBe(0);
    });

    it("returns 100 cumulative XP for level 2", () => {
      expect(getAppLevelCumulativeXP(2)).toBe(100);
    });

    it("returns 250 cumulative XP for level 3", () => {
      expect(getAppLevelCumulativeXP(3)).toBe(250);
    });

    it("returns correct cumulative XP for level 10", () => {
      // Sum of floored values differs slightly from doc
      expect(getAppLevelCumulativeXP(10)).toBe(7464);
    });
  });

  describe("getAppLevelFromXP", () => {
    it("returns level 1 with 0 XP", () => {
      const result = getAppLevelFromXP(0);
      expect(result.level).toBe(1);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(100);
    });

    it("returns level 1 at 99 XP", () => {
      const result = getAppLevelFromXP(99);
      expect(result.level).toBe(1);
      expect(result.xpInLevel).toBe(99);
      expect(result.xpToNext).toBe(100);
    });

    it("returns level 2 at exactly 100 XP", () => {
      const result = getAppLevelFromXP(100);
      expect(result.level).toBe(2);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(150);
    });

    it("returns level 3 at 250 XP", () => {
      const result = getAppLevelFromXP(250);
      expect(result.level).toBe(3);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(225);
    });

    it("calculates progress correctly mid-level", () => {
      const result = getAppLevelFromXP(175);
      expect(result.level).toBe(2);
      expect(result.xpInLevel).toBe(75);
      expect(result.xpToNext).toBe(150);
      expect(result.cumulativeXP).toBe(100);
    });

    it("handles large XP values", () => {
      const result = getAppLevelFromXP(10000);
      // 10000 XP is between level 10 (7464 cumulative) and level 11
      expect(result.level).toBe(10);
      expect(result.xpInLevel).toBe(10000 - 7464);
    });
  });
});

describe("Main Level Calculations (2x from 250)", () => {
  describe("getMainLevelXPRequired", () => {
    it("returns 250 XP for level 1", () => {
      expect(getMainLevelXPRequired(1)).toBe(250);
    });

    it("returns 500 XP for level 2", () => {
      expect(getMainLevelXPRequired(2)).toBe(500);
    });

    it("returns 1000 XP for level 3", () => {
      expect(getMainLevelXPRequired(3)).toBe(1000);
    });

    it("returns 128000 XP for level 10", () => {
      expect(getMainLevelXPRequired(10)).toBe(128000);
    });
  });

  describe("getMainLevelCumulativeXP", () => {
    it("returns 0 cumulative XP for level 1", () => {
      expect(getMainLevelCumulativeXP(1)).toBe(0);
    });

    it("returns 250 cumulative XP for level 2", () => {
      expect(getMainLevelCumulativeXP(2)).toBe(250);
    });

    it("returns 750 cumulative XP for level 3", () => {
      expect(getMainLevelCumulativeXP(3)).toBe(750);
    });

    it("returns 127750 cumulative XP for level 10", () => {
      expect(getMainLevelCumulativeXP(10)).toBe(127750);
    });
  });

  describe("getMainLevelFromXP", () => {
    it("returns level 1 with 0 XP", () => {
      const result = getMainLevelFromXP(0);
      expect(result.level).toBe(1);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(250);
    });

    it("returns level 1 at 249 XP", () => {
      const result = getMainLevelFromXP(249);
      expect(result.level).toBe(1);
      expect(result.xpInLevel).toBe(249);
    });

    it("returns level 2 at exactly 250 XP", () => {
      const result = getMainLevelFromXP(250);
      expect(result.level).toBe(2);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(500);
    });

    it("returns level 3 at 750 XP", () => {
      const result = getMainLevelFromXP(750);
      expect(result.level).toBe(3);
      expect(result.xpInLevel).toBe(0);
      expect(result.xpToNext).toBe(1000);
    });

    it("calculates progress correctly mid-level", () => {
      const result = getMainLevelFromXP(500);
      expect(result.level).toBe(2);
      expect(result.xpInLevel).toBe(250);
      expect(result.xpToNext).toBe(500);
    });

    it("handles large XP values", () => {
      const result = getMainLevelFromXP(200000);
      // 200000 XP: level 10 starts at 127750, needs 128000 for level 11
      // 127750 + 128000 = 255750 for level 11
      expect(result.level).toBe(10);
      expect(result.xpInLevel).toBe(200000 - 127750);
    });
  });
});

describe("Level Curve Comparison", () => {
  it("main level requires more XP than app level at same level", () => {
    for (let level = 1; level <= 10; level++) {
      expect(getMainLevelCumulativeXP(level)).toBeGreaterThanOrEqual(
        getAppLevelCumulativeXP(level)
      );
    }
  });

  it("main level grows faster (2x) than app level (1.5x)", () => {
    const appLevel5XP = getAppLevelXPRequired(5);
    const mainLevel5XP = getMainLevelXPRequired(5);

    // At level 5: app = 506, main = 4000
    expect(mainLevel5XP).toBeGreaterThan(appLevel5XP * 5);
  });
});
