# Unified Gamification Optimization Roadmap

## Executive Summary

This roadmap addresses gamification issues across the entire gamify.it.com platform:
- **46-50 popups per heavy session** → Target: 8-15
- **300x XP imbalance** between apps → Target: <10x difference
- **Zero user control** over notifications → Full preferences
- **No cross-app synergy** rewards → Daily multi-app bonuses
- **Underutilized streak danger** system → Full activation

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED NOTIFICATION MANAGER                         │
│                     (New: Central orchestration layer)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Travel ──┐                                                                │
│   Today  ──┼──▶ NotificationQueue ──▶ UserPreferences ──▶ Display          │
│   Life   ──┤         │                      │                               │
│   Fitness ─┘         │                      │                               │
│                      ▼                      ▼                               │
│              Priority Sorting        Batching Rules                         │
│              (Level > Achv > Loot > XP)    (Same-type consolidation)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Unified Notification System (Week 1-2)

### Problem
Each app fires notifications independently, causing cascade overload.

### Solution: Global Notification Manager

#### 1.1 Create NotificationContext

**File:** `components/NotificationContext.tsx` (NEW)

```typescript
interface NotificationItem {
  id: string;
  type: 'xp' | 'loot' | 'achievement' | 'level-up';
  priority: 1 | 2 | 3 | 4; // 1 = highest
  app: 'travel' | 'today' | 'life' | 'fitness' | 'global';
  data: XPToastData | LootDropData | AchievementData | LevelUpData;
  timestamp: number;
  batchKey?: string; // For grouping same-type notifications
}

interface NotificationQueue {
  items: NotificationItem[];
  maxVisible: 3;
  batchWindow: 2000; // ms to wait before showing batched notifications
}

// Priority levels:
// 1 - Level Up (always show immediately)
// 2 - Achievement (show after level up clears)
// 3 - Loot Drop (rare+ show immediately, common batched)
// 4 - XP Toast (always batched by app/activity)
```

#### 1.2 Notification Batching Logic

**File:** `lib/notifications/batcher.ts` (NEW)

```typescript
// Batching rules:
// - XP toasts within 2s window → combine into single toast
// - Common loot drops → batch into "You found 3 items!"
// - Multiple achievements → stagger 500ms apart, max 3 visible

function batchNotifications(queue: NotificationItem[]): NotificationItem[] {
  const batched: NotificationItem[] = [];

  // Group XP by app
  const xpByApp = groupBy(queue.filter(n => n.type === 'xp'), 'app');
  for (const [app, items] of Object.entries(xpByApp)) {
    if (items.length > 1) {
      batched.push(createBatchedXPToast(app, items));
    } else {
      batched.push(items[0]);
    }
  }

  // Group common loot
  const commonLoot = queue.filter(n =>
    n.type === 'loot' && n.data.rarity === 'common'
  );
  if (commonLoot.length > 1) {
    batched.push(createBatchedLootDrop(commonLoot));
  }

  // Pass through high-priority items
  batched.push(...queue.filter(n => n.priority <= 2));

  return batched.sort((a, b) => a.priority - b.priority);
}
```

#### 1.3 Update Existing Components

**Files to modify:**
- `components/XPToast.tsx` - Accept batched data
- `components/LootDropPopup.tsx` - Support "3 items found" mode
- `components/AchievementPopup.tsx` - Respect queue limits
- `components/LevelUpPopup.tsx` - Always priority 1

**Integration points:**
- `lib/services/gamification.service.ts` - Use NotificationContext
- `app/fitness/FitnessApp.tsx` - Replace direct dispatches
- `app/travel/TravelApp.tsx` - Replace direct dispatches
- `app/today/TodayApp.tsx` - Replace direct dispatches

### Acceptance Criteria
- [ ] Single NotificationContext manages all popups
- [ ] XP toasts batched within 2s window
- [ ] Max 3 notifications visible at once
- [ ] Priority ordering works correctly
- [ ] Existing functionality preserved

---

## Phase 2: User Notification Preferences (Week 2-3)

### Problem
Zero user control over notification frequency.

### Solution: Preferences UI + Backend Storage

#### 2.1 Database Schema

**File:** `prisma/schema.prisma` (MODIFY)

```prisma
model user_preferences {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id               String   @unique @db.Uuid
  user                  profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)

  // Notification preferences
  xp_toast_mode         String   @default("per_activity") // "every_action" | "per_activity" | "session_summary" | "off"
  loot_drop_mode        String   @default("all") // "all" | "rare_plus" | "epic_plus" | "off"
  level_up_mode         String   @default("all") // "all" | "main_only" | "off"
  achievement_mode      String   @default("all") // "all" | "tier2_plus" | "off"

  // Push notification preferences
  streak_danger_push    Boolean  @default(true)
  weekly_summary_push   Boolean  @default(true)
  friend_activity_push  Boolean  @default(true)

  created_at            DateTime @default(now()) @db.Timestamptz(6)
  updated_at            DateTime @default(now()) @db.Timestamptz(6)

  @@index([user_id])
}
```

#### 2.2 Preferences API

**File:** `app/api/user/preferences/route.ts` (NEW)

```typescript
// GET - Fetch user preferences
// PUT - Update preferences
// Returns defaults if no record exists
```

#### 2.3 Preferences UI

**File:** `app/settings/NotificationPreferences.tsx` (NEW)

```
┌─────────────────────────────────────────────┐
│         Reward Notifications                │
├─────────────────────────────────────────────┤
│ XP Notifications                            │
│   ○ Every action                            │
│   ● Per activity (Recommended)              │
│   ○ Session summary only                    │
│   ○ Off                                     │
├─────────────────────────────────────────────┤
│ Loot Drops                                  │
│   ● All drops                               │
│   ○ Rare and above                          │
│   ○ Epic and above                          │
├─────────────────────────────────────────────┤
│ Level Up Celebrations                       │
│   ● All levels (app + main)                 │
│   ○ Main level only                         │
├─────────────────────────────────────────────┤
│ Achievements                                │
│   ● All achievements                        │
│   ○ Tier 2 and above                        │
├─────────────────────────────────────────────┤
│                                             │
│ Push Notifications                          │
├─────────────────────────────────────────────┤
│ [✓] Streak danger reminders (9pm)           │
│ [✓] Weekly progress summary                 │
│ [✓] Friend workout activity                 │
└─────────────────────────────────────────────┘
```

#### 2.4 Integrate with NotificationContext

**File:** `components/NotificationContext.tsx` (MODIFY)

```typescript
// Before showing notification, check user preferences
function shouldShowNotification(item: NotificationItem, prefs: UserPreferences): boolean {
  switch (item.type) {
    case 'xp':
      if (prefs.xp_toast_mode === 'off') return false;
      if (prefs.xp_toast_mode === 'session_summary') return false; // handled separately
      // etc.
    case 'loot':
      if (prefs.loot_drop_mode === 'rare_plus' && item.data.rarity === 'common') return false;
      // etc.
  }
  return true;
}
```

### Acceptance Criteria
- [ ] Preferences stored in database
- [ ] Settings UI accessible from /settings
- [ ] Preferences respected by NotificationContext
- [ ] Defaults are sensible (per_activity, all drops, etc.)
- [ ] Changes apply immediately without refresh

---

## Phase 3: XP Balancing Across Apps (Week 3-4)

### Problem
Fitness awards 300x more XP per minute than Life quests.

### Solution: Normalize XP Economy

#### 3.1 Current vs. Proposed XP Values

| App | Action | Current XP | Proposed XP | Rationale |
|-----|--------|------------|-------------|-----------|
| **Travel** |
| | New location | 25-75 | 25-75 | Baseline (unchanged) |
| | New city | 200 | 200 | Baseline |
| | New country | 500 | 500 | Baseline |
| | Quest complete | 100 + 15/item | 150 + 20/item | Slight increase |
| **Today** |
| | Easy task | 10 | 15 | +50% |
| | Medium task | 15 | 30 | +100% |
| | Hard task | 30 | 60 | +100% |
| | Epic task | 60 | 120 | +100% |
| | Daily streak bonus | +10%/day | +15%/day | Increased incentive |
| **Life** |
| | Quest item | 15 | 30 | +100% |
| | Quest complete | 100 + items | 200 + 30/item | +100% base |
| | Long-term quest (30d+) | N/A | 2x multiplier | New: effort recognition |
| **Fitness** |
| | Per set | 50-300 | N/A | Remove per-set XP |
| | Per exercise | N/A | 50-150 | New: consolidated |
| | Per workout | Sum | 200-800 | Capped range |
| | PR milestone | 500-2500 | 500-2500 | Unchanged |

#### 3.2 Fitness XP Consolidation

**File:** `lib/fitness/store.ts` (MODIFY)

```typescript
// OLD: Award XP per set
logSet: (exerciseId, setData) => {
  const xp = calculateSetXP(setData); // Called 20+ times/workout
  dispatchXPGain(xp);
}

// NEW: Accumulate silently, award per exercise
logSet: (exerciseId, setData) => {
  const xp = calculateSetXP(setData);
  state.pendingXP += xp; // Silent accumulation
  state.currentExerciseXP += xp;
}

completeExercise: (exerciseId) => {
  const exerciseXP = state.currentExerciseXP;
  // Award once per exercise, not per set
  dispatchXPGain(exerciseXP, `${exerciseName} complete`);
  state.currentExerciseXP = 0;
}

finishWorkout: () => {
  // Final summary only
  const totalXP = state.pendingXP;
  // Don't dispatch again - already dispatched per exercise
  state.pendingXP = 0;
}
```

#### 3.3 Today XP Increase

**File:** `lib/today/data.ts` (MODIFY)

```typescript
// Update base XP and multipliers
export const TASK_XP = {
  base: 15, // was 10
  difficultyMultiplier: {
    easy: 1.0,
    medium: 2.0, // was 1.5
    hard: 4.0,   // was 2.0
    epic: 8.0,   // was 3.0
  },
  streakBonus: 0.15, // was 0.10
};
```

#### 3.4 Life Quest XP Increase

**File:** `app/api/life/quests/[questId]/route.ts` (MODIFY)

```typescript
// Update quest completion XP
function calculateLifeQuestXP(quest: Quest): number {
  const base = 200; // was 100
  const perItem = 30; // was 15
  const itemCount = quest.items.filter(i => i.completed).length;

  // New: Long-term quest bonus
  const durationDays = daysBetween(quest.created_at, new Date());
  const durationMultiplier = durationDays >= 30 ? 2.0 :
                             durationDays >= 14 ? 1.5 : 1.0;

  return Math.round((base + (perItem * itemCount)) * durationMultiplier);
}
```

### Acceptance Criteria
- [ ] Fitness XP consolidated to per-exercise
- [ ] Today task XP increased by ~100%
- [ ] Life quest XP increased with duration bonus
- [ ] Overall XP economy feels balanced
- [ ] Main level progression rate stable (not faster/slower)

---

## Phase 4: Loot System Optimization (Week 4-5)

### Problem
30% drop rate per action = 10+ drops per session, killing surprise.

### Solution: Activity-Level Loot with Rarity Scaling

#### 4.1 Change Loot Trigger Points

| App | Current Trigger | New Trigger |
|-----|-----------------|-------------|
| Travel | Every location XP | Per quest OR 5 locations |
| Today | Every task | Per 3 tasks OR session end |
| Life | Every quest item | Per quest completion only |
| Fitness | Every set | Per workout completion |

#### 4.2 Loot Roll Refactor

**File:** `lib/loot/drop-calculator.ts` (MODIFY)

```typescript
// NEW: Context-aware loot rolling
interface LootContext {
  app: 'travel' | 'today' | 'life' | 'fitness';
  activityType: 'single' | 'batch' | 'milestone';
  activityValue: number; // XP earned, items completed, etc.
  streakDays: number;
  hasActiveBoost: boolean;
}

function rollActivityLoot(context: LootContext): LootDrop | null {
  // Base rates (higher than per-action, since less frequent)
  const baseRates = {
    nothing: 0.30,    // was 0.70
    common: 0.40,     // was 0.20
    rare: 0.20,       // was 0.07
    epic: 0.08,       // was 0.025
    legendary: 0.02,  // was 0.005
  };

  // Context modifiers
  let rarityBoost = 0;
  if (context.activityType === 'milestone') rarityBoost += 0.10;
  if (context.activityValue > 500) rarityBoost += 0.05;
  if (context.streakDays >= 7) rarityBoost += 0.05;
  if (context.streakDays >= 30) rarityBoost += 0.10;

  // Roll with modified rates
  return rollWithRates(applyRarityBoost(baseRates, rarityBoost));
}
```

#### 4.3 Guaranteed Session Loot

**New feature:** Every session gets at least one drop

```typescript
// On session end (app backgrounded or explicit end)
function ensureSessionLoot(session: SessionData): void {
  if (!session.lootDropped) {
    // Guarantee at least common drop
    const drop = rollGuaranteedLoot(session);
    dispatchLootDrop(drop);
  }
}
```

#### 4.4 Loot Chest Animation (From Fitness Roadmap)

**File:** `components/LootChestAnimation.tsx` (NEW)

- Tap-to-open mechanic for anticipation
- Rarity-based visual effects
- Used for guaranteed session loot and milestones

### Acceptance Criteria
- [ ] Loot triggers moved to activity-level
- [ ] Drop rates rebalanced for new frequency
- [ ] Session-end guaranteed drop working
- [ ] Chest animation implemented
- [ ] Average items per session: 2-4 (down from 10+)

---

## Phase 5: Cross-App Synergy System (Week 5-6)

### Problem
No incentive to use multiple apps together.

### Solution: Multi-App Engagement Bonuses

#### 5.1 Daily Multi-App Bonus

**File:** `lib/services/gamification.service.ts` (MODIFY)

```typescript
interface DailyAppUsage {
  travel: boolean;
  today: boolean;
  life: boolean;
  fitness: boolean;
  lastChecked: Date;
}

async function checkMultiAppBonus(userId: string): Promise<number> {
  const usage = await getDailyAppUsage(userId);
  const appsUsed = Object.values(usage).filter(Boolean).length;

  switch (appsUsed) {
    case 2: return 1.25; // 25% XP bonus
    case 3: return 1.50; // 50% XP bonus
    case 4: return 2.00; // 100% XP bonus + guaranteed rare loot
    default: return 1.0;
  }
}

// Apply to all XP awards
async function awardXP(userId: string, app: string, amount: number) {
  const multiAppMultiplier = await checkMultiAppBonus(userId);
  const finalAmount = Math.round(amount * multiAppMultiplier);

  // Track app usage for today
  await markAppUsed(userId, app);

  // Award with multiplier
  await updateXP(userId, finalAmount);

  // If all 4 apps used, trigger bonus loot
  if (multiAppMultiplier === 2.0 && !await hasReceivedDailyBonusLoot(userId)) {
    await awardBonusLoot(userId, 'rare');
    await markDailyBonusLootReceived(userId);
  }
}
```

#### 5.2 Database Schema for Multi-App Tracking

**File:** `prisma/schema.prisma` (MODIFY)

```prisma
model daily_app_usage {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id       String   @db.Uuid
  user          profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)
  date          DateTime @db.Date
  travel_used   Boolean  @default(false)
  today_used    Boolean  @default(false)
  life_used     Boolean  @default(false)
  fitness_used  Boolean  @default(false)
  bonus_claimed Boolean  @default(false)

  @@unique([user_id, date])
  @@index([user_id, date])
}
```

#### 5.3 Multi-App Bonus UI

**File:** `components/MultiAppBonusIndicator.tsx` (NEW)

```
┌─────────────────────────────────────────┐
│  Today's Apps   [🗺️] [📋] [🎯] [💪]    │
│                  ✓    ✓    ·    ·       │
│  Bonus: +25% XP  │  Use 2 more: +100%   │
└─────────────────────────────────────────┘
```

- Shows in nav bar or status area
- Animates when new app used
- Pulses when close to bonus tier

#### 5.4 Cross-App Achievements

**File:** `lib/achievements.ts` (MODIFY)

```typescript
// New achievement category: SYNERGY
{
  id: 'lifestyle_explorer',
  name: 'Lifestyle Explorer',
  description: 'Use all 4 apps in one day',
  tier: 2,
  xp: 500,
  criteria: { type: 'multi_app_day', count: 1 }
},
{
  id: 'balanced_life',
  name: 'Balanced Life',
  description: 'Use all 4 apps for 7 days',
  tier: 3,
  xp: 1500,
  criteria: { type: 'multi_app_streak', count: 7 }
},
{
  id: 'lifestyle_master',
  name: 'Lifestyle Master',
  description: 'Use all 4 apps for 30 days',
  tier: 4,
  xp: 5000,
  criteria: { type: 'multi_app_streak', count: 30 }
},
```

### Acceptance Criteria
- [ ] Daily app usage tracked per user
- [ ] XP multiplier applied correctly (25%/50%/100%)
- [ ] Bonus loot awarded for all 4 apps
- [ ] UI indicator shows progress
- [ ] Cross-app achievements working

---

## Phase 6: Streak Danger Activation (Week 6)

### Problem
Streak protection system exists but underutilized.

### Solution: Full Activation of Existing Cron Jobs

#### 6.1 Verify Cron Job Functionality

**File:** `app/api/cron/streak-danger-9pm/route.ts` (VERIFY/FIX)

```typescript
// Ensure this cron job:
// 1. Runs at 9pm user local time (or 9pm UTC with timezone handling)
// 2. Queries users with streak >= 3 AND no activity today
// 3. Sends push notification via configured provider
// 4. Logs success/failure for monitoring

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Find at-risk users
  const atRiskUsers = await prisma.profiles.findMany({
    where: {
      current_streak: { gte: 3 },
      last_activity_date: { lt: startOfToday() },
    },
    select: {
      id: true,
      current_streak: true,
      push_token: true,
    },
  });

  // Send notifications
  for (const user of atRiskUsers) {
    if (user.push_token) {
      await sendPushNotification(user.push_token, {
        title: '🔥 Streak in Danger!',
        body: `Your ${user.current_streak}-day streak needs you! Log any activity to keep it alive.`,
        data: { action: 'open_app' },
      });
    }
  }

  return Response.json({ notified: atRiskUsers.length });
}
```

#### 6.2 In-App Streak Danger Banner

**File:** `components/StreakDangerBanner.tsx` (NEW)

```typescript
// Show when:
// - Current time > 6pm local
// - No activity logged today
// - Current streak >= 3

function StreakDangerBanner() {
  const { currentStreak, lastActivityDate, streakShields } = useProfile();
  const hour = new Date().getHours();
  const hasActivityToday = isToday(lastActivityDate);

  if (hour < 18 || hasActivityToday || currentStreak < 3) {
    return null;
  }

  return (
    <div className="streak-danger-banner">
      <span className="fire-icon pulse">🔥</span>
      <div className="danger-text">
        <strong>Streak at risk!</strong>
        <span>Your {currentStreak}-day streak needs activity today</span>
      </div>
      {streakShields > 0 && (
        <span className="shield-note">
          🛡️ {streakShields} shield{streakShields > 1 ? 's' : ''} available
        </span>
      )}
    </div>
  );
}
```

#### 6.3 Streak Shield Visibility

**File:** `components/RetroNavBar.tsx` (MODIFY)

```typescript
// Add shield count near streak display
<div className="streak-display">
  <span className="streak-count">🔥 {streak}</span>
  {shields > 0 && (
    <span className="shield-count">🛡️ {shields}</span>
  )}
</div>
```

### Acceptance Criteria
- [ ] 9pm cron job verified working
- [ ] Push notifications sending correctly
- [ ] In-app banner appears after 6pm
- [ ] Shield count visible in nav
- [ ] Streak save rate tracked for measurement

---

## Phase 7: Session Summary & Reflection (Week 7)

### Problem
No moment of reflection after using any app.

### Solution: Unified Session End Experience

#### 7.1 Session Detection

**File:** `lib/session/tracker.ts` (NEW)

```typescript
// Detect session end via:
// 1. App backgrounded for > 5 minutes
// 2. User explicitly closes activity (finish workout, etc.)
// 3. Midnight rollover

interface SessionData {
  app: string;
  startTime: Date;
  endTime: Date;
  xpEarned: number;
  activitiesCompleted: number;
  lootDropped: boolean;
  streakMaintained: boolean;
}

function onSessionEnd(session: SessionData): void {
  // 1. Ensure session loot
  if (!session.lootDropped) {
    triggerGuaranteedLoot(session);
  }

  // 2. Show session summary
  showSessionSummary(session);

  // 3. Optional reflection prompt
  if (session.activitiesCompleted >= 3) {
    showReflectionPrompt();
  }
}
```

#### 7.2 Session Summary Modal

**File:** `components/SessionSummaryModal.tsx` (NEW)

```
┌─────────────────────────────────────────┐
│           Session Complete!             │
├─────────────────────────────────────────┤
│                                         │
│   🏆 +1,247 XP earned                   │
│                                         │
│   Travel: 5 locations (+450 XP)         │
│   Fitness: 1 workout (+797 XP)          │
│                                         │
│   🔥 15-day streak maintained           │
│   🎁 2 items found                      │
│                                         │
│   ───────────────────────               │
│                                         │
│   Apps used today: [🗺️✓] [💪✓] [📋·] [🎯·] │
│   Use 2 more for +100% XP bonus!        │
│                                         │
│            [ Continue ]                 │
└─────────────────────────────────────────┘
```

#### 7.3 Reflection Prompt (Optional)

**File:** `components/ReflectionPrompt.tsx` (NEW)

```typescript
// After session summary, optionally ask:
// - "How do you feel?" (Great/Good/Tired/Tough)
// - "What went well?" (free text, 100 chars)
// - One-tap dismiss available

// Store in session_reflections table for analytics
```

### Acceptance Criteria
- [ ] Session end detected reliably
- [ ] Summary modal shows cross-app stats
- [ ] Multi-app bonus progress visible
- [ ] Reflection prompt optional and non-intrusive
- [ ] Data stored for future analytics

---

## Phase 8: Weekly Summary & Insights (Week 8)

### Problem
No long-term reflection on progress.

### Solution: Sunday Evening Summary

#### 8.1 Weekly Summary Cron Job

**File:** `app/api/cron/weekly-summary/route.ts` (NEW)

```typescript
// Runs Sunday 7pm
// Generates personalized weekly summary
// Sends push notification with deep link

interface WeeklySummary {
  totalXP: number;
  xpByApp: Record<string, number>;
  activeDays: number;
  streakStatus: 'maintained' | 'grown' | 'lost';
  achievementsUnlocked: number;
  highlightStat: string; // e.g., "3 new PRs!"
  comparisonToLastWeek: 'better' | 'same' | 'worse';
}
```

#### 8.2 Weekly Summary UI

**File:** `app/insights/WeeklySummary.tsx` (NEW)

```
┌─────────────────────────────────────────┐
│         Week of Jan 1-7, 2026           │
├─────────────────────────────────────────┤
│                                         │
│   Total XP: 4,527 (+12% vs last week)   │
│                                         │
│   ┌──────────────────────────────┐      │
│   │ Travel   ████████░░  1,240   │      │
│   │ Fitness  ██████████  2,100   │      │
│   │ Today    ███░░░░░░░    687   │      │
│   │ Life     ██░░░░░░░░    500   │      │
│   └──────────────────────────────┘      │
│                                         │
│   🔥 Streak: 22 days (grew +7!)         │
│   🏆 Achievements: 3 unlocked           │
│   💪 Highlight: Bench PR - 225 lbs!     │
│                                         │
│   Active Days: ● ● ● ● ● ○ ●  (6/7)    │
│                                         │
└─────────────────────────────────────────┘
```

#### 8.3 Push Notification

```typescript
// Sunday 7pm push
{
  title: '📊 Your Week in Review',
  body: 'You earned 4,527 XP across 6 active days. See your highlights!',
  data: { screen: 'weekly-summary' },
}
```

### Acceptance Criteria
- [ ] Weekly stats calculated correctly
- [ ] Push notification sent Sunday evening
- [ ] Summary page accessible from profile
- [ ] Week-over-week comparison working
- [ ] Opt-out available in preferences

---

## Implementation Timeline

```
Week 1-2: Phase 1 (Unified Notification System)
├── Day 1-3: Create NotificationContext
├── Day 4-6: Implement batching logic
├── Day 7-10: Update existing components
└── Day 11-14: Integration testing

Week 2-3: Phase 2 (User Preferences)
├── Day 1-2: Database schema
├── Day 3-5: API endpoints
├── Day 6-8: Settings UI
└── Day 9-10: Integration with NotificationContext

Week 3-4: Phase 3 (XP Balancing)
├── Day 1-3: Fitness XP consolidation
├── Day 4-5: Today XP increase
├── Day 6-7: Life quest XP increase
└── Day 8-10: Testing & validation

Week 4-5: Phase 4 (Loot Optimization)
├── Day 1-3: Change trigger points
├── Day 4-6: Rebalance drop rates
├── Day 7-8: Chest animation
└── Day 9-10: Session loot guarantee

Week 5-6: Phase 5 (Cross-App Synergy)
├── Day 1-3: Multi-app tracking
├── Day 4-6: XP multiplier logic
├── Day 7-8: UI indicator
└── Day 9-10: Synergy achievements

Week 6: Phase 6 (Streak Danger)
├── Day 1-2: Verify cron jobs
├── Day 3-4: In-app banner
└── Day 5-7: Shield visibility

Week 7: Phase 7 (Session Summary)
├── Day 1-3: Session detection
├── Day 4-5: Summary modal
└── Day 6-7: Reflection prompt

Week 8: Phase 8 (Weekly Summary)
├── Day 1-3: Cron job & data aggregation
├── Day 4-5: Summary UI
└── Day 6-7: Push notification
```

---

## Files Summary

### New Files (18)

| File | Purpose |
|------|---------|
| `components/NotificationContext.tsx` | Central notification orchestration |
| `lib/notifications/batcher.ts` | Notification batching logic |
| `lib/notifications/queue.ts` | Priority queue management |
| `app/api/user/preferences/route.ts` | User preferences API |
| `app/settings/NotificationPreferences.tsx` | Preferences UI |
| `components/LootChestAnimation.tsx` | Tap-to-open loot reveal |
| `components/MultiAppBonusIndicator.tsx` | Cross-app progress UI |
| `components/StreakDangerBanner.tsx` | At-risk streak warning |
| `lib/session/tracker.ts` | Session detection logic |
| `components/SessionSummaryModal.tsx` | End-of-session summary |
| `components/ReflectionPrompt.tsx` | Optional mood capture |
| `app/api/cron/weekly-summary/route.ts` | Weekly digest cron |
| `app/insights/WeeklySummary.tsx` | Weekly summary page |
| `app/insights/page.tsx` | Insights hub |

### Modified Files (14)

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add user_preferences, daily_app_usage |
| `lib/services/gamification.service.ts` | Multi-app bonus, notification dispatch |
| `lib/loot/drop-calculator.ts` | Activity-level rolling |
| `lib/achievements.ts` | Synergy achievements |
| `lib/fitness/store.ts` | XP consolidation |
| `lib/today/data.ts` | XP increase |
| `app/api/life/quests/[questId]/route.ts` | Quest XP increase |
| `app/api/cron/streak-danger-9pm/route.ts` | Verify/fix notifications |
| `components/XPToast.tsx` | Batched data support |
| `components/LootDropPopup.tsx` | Multi-item mode |
| `components/AchievementPopup.tsx` | Queue limits |
| `components/RetroNavBar.tsx` | Shield display, multi-app indicator |
| `app/fitness/FitnessApp.tsx` | Use NotificationContext |
| `app/travel/TravelApp.tsx` | Use NotificationContext |

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Popups per session | 46-50 | 8-15 | Client analytics |
| XP variance (max/min app) | 300x | <10x | DB query |
| 7-day retention | Baseline | +15% | Analytics |
| Multi-app users (2+) | Baseline | +25% | daily_app_usage |
| Streak save rate | Baseline | +20% | DB query |
| Weekly summary opens | N/A | 40%+ | Push analytics |
| Settings customization | N/A | 30%+ | Preferences API |

---

## A/B Testing Plan

### Phase 1-2 (Notifications)
- Control: Current notification system
- Test A: Batched notifications only
- Test B: Batched + user preferences
- Duration: 2 weeks
- Success: Retention stable, satisfaction improved

### Phase 3-4 (XP + Loot)
- Control: Current rates
- Test: Balanced XP + activity-level loot
- Duration: 2 weeks
- Success: Cross-app usage up, XP/session stable

### Phase 5 (Multi-App)
- Control: No bonus
- Test: 25%/50%/100% bonus tiers
- Duration: 3 weeks
- Success: Multi-app usage +25%

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Users miss frequent XP feedback | Keep mini-counter visible, batched toasts show total |
| XP rebalancing feels like nerf | Communicate as "quality over quantity", net XP same |
| Multi-app feels forced | Bonus is additive, single-app still works fine |
| Session detection unreliable | Multiple triggers (background, explicit, timeout) |
| Push fatigue from weekly summary | Easy opt-out, limit to 1 push/week |

---

## Dependencies

```
Phase 1 (Notifications) ─┬─▶ Phase 2 (Preferences)
                         │
                         └─▶ Phase 7 (Session Summary)

Phase 3 (XP Balance) ────▶ Phase 4 (Loot) ────▶ Phase 5 (Synergy)

Phase 6 (Streak) ────────▶ Independent (quick win)

Phase 8 (Weekly) ────────▶ Depends on Phase 5 data
```

---

*Last updated: January 2026*
*Consolidates: Fitness-specific roadmap + Cross-app optimization*
*Research basis: Journal of Marketing Research, Journal of Business Research, Push Notification Studies, Duolingo/Strava case studies*
