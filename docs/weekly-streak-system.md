# Weekly Streak System - Design Document

## Problem Statement

Current daily streak system is psychologically punishing for:
- **Fitness**: Rest days are essential (3-5 workouts/week is healthy, 7 is overtraining)
- **Travel**: Can't visit new places every day (1-2 locations/week is active)
- **Life**: Long-term quests have weekly/monthly cadence

> "Do you know how most fitness apps are all 'push your limits and never take a rest day, or else your weeklong streak will be ruined'?" — [Common user complaint](https://www.nudgenow.com/blogs/gamify-your-fitness-apps)

---

## Proposed Solution: Hybrid Weekly Streaks

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEEKLY STREAK SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   FITNESS   │  │   TRAVEL    │  │    TODAY    │  │    LIFE     │        │
│  │  3 workouts │  │ 2 locations │  │   Daily     │  │ 1 progress  │        │
│  │   /week     │  │   /week     │  │   Streak    │  │   /week     │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│                                    ▼                                        │
│                        ┌─────────────────────┐                              │
│                        │   ACTIVE WEEK       │                              │
│                        │   (2+ apps used)    │                              │
│                        │   Weekly Streak     │                              │
│                        └─────────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Per-App Streak Thresholds

| App | Streak Type | Threshold | Rationale |
|-----|-------------|-----------|-----------|
| **Fitness** | Weekly | 3 workouts | Science-backed: 3x/week for maintenance, rest days essential |
| **Travel** | Weekly | 2 locations | Realistic for explorers, allows travel gaps |
| **Today** | Daily | 1 task | Daily habits ARE daily, keep this |
| **Life** | Weekly | 1 action | Any progress on any quest counts |
| **Global** | Weekly | 2+ apps active | Ecosystem engagement |

### Fitness Weekly Streak Tiers

```
Threshold Options (user can set):

  CASUAL:     2 workouts/week  (maintain streak)
  REGULAR:    3 workouts/week  (default)
  DEDICATED:  4 workouts/week
  ATHLETE:    5 workouts/week

Multiplier applied at week end:
  Week complete: Streak +1, multiplier applies to next week
  Week missed:   Use shield OR reset to 0
```

---

## Database Schema

### New Tables

```prisma
// Weekly activity tracking per app
model weekly_app_activity {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id         String   @db.Uuid
  user            profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)
  app             String   // 'fitness' | 'travel' | 'today' | 'life'
  week_start      DateTime @db.Date  // Monday of the week
  activity_count  Int      @default(0)
  threshold_met   Boolean  @default(false)

  @@unique([user_id, app, week_start])
  @@index([user_id, week_start])
}

// User's streak settings and state
model user_streaks {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id               String   @unique @db.Uuid
  user                  profiles @relation(fields: [user_id], references: [id], onDelete: Cascade)

  // Per-app weekly streaks
  fitness_streak        Int      @default(0)
  fitness_threshold     Int      @default(3)  // User-configurable
  fitness_longest       Int      @default(0)

  travel_streak         Int      @default(0)
  travel_threshold      Int      @default(2)
  travel_longest        Int      @default(0)

  life_streak           Int      @default(0)
  life_threshold        Int      @default(1)
  life_longest          Int      @default(0)

  // Today keeps daily streak (existing behavior)
  today_daily_streak    Int      @default(0)
  today_daily_longest   Int      @default(0)
  today_last_activity   DateTime? @db.Date

  // Global weekly streak (2+ apps active)
  global_weekly_streak  Int      @default(0)
  global_weekly_longest Int      @default(0)

  // Shields (protect any streak type)
  streak_shields        Int      @default(0)

  updated_at            DateTime @default(now()) @db.Timestamptz(6)
}
```

### Migration from Current System

```sql
-- Preserve existing daily streak in today_daily_streak
UPDATE user_streaks us
SET today_daily_streak = p.current_streak,
    today_daily_longest = p.longest_streak
FROM profiles p
WHERE us.user_id = p.id;

-- Initialize weekly streaks to 0 (fresh start)
-- Users get notification explaining the change
```

---

## Streak Logic

### Weekly Activity Tracking

```typescript
// Called on any activity (workout logged, location added, etc.)
async function trackWeeklyActivity(
  userId: string,
  app: 'fitness' | 'travel' | 'today' | 'life'
): Promise<void> {
  const weekStart = getMonday(new Date());

  // Increment activity count for this week
  await prisma.weekly_app_activity.upsert({
    where: {
      user_id_app_week_start: { user_id: userId, app, week_start: weekStart }
    },
    create: {
      user_id: userId,
      app,
      week_start: weekStart,
      activity_count: 1,
      threshold_met: false,
    },
    update: {
      activity_count: { increment: 1 },
    },
  });

  // Check if threshold just met
  const activity = await prisma.weekly_app_activity.findUnique({
    where: { user_id_app_week_start: { user_id: userId, app, week_start: weekStart } }
  });

  const userStreaks = await prisma.user_streaks.findUnique({
    where: { user_id: userId }
  });

  const threshold = userStreaks?.[`${app}_threshold`] ?? DEFAULT_THRESHOLDS[app];

  if (activity && activity.activity_count >= threshold && !activity.threshold_met) {
    // Mark threshold met for this week
    await prisma.weekly_app_activity.update({
      where: { id: activity.id },
      data: { threshold_met: true }
    });

    // Notify user
    dispatchNotification({
      type: 'streak_threshold_met',
      app,
      message: `${APP_NAMES[app]} goal hit! 🎯`,
    });
  }
}
```

### Weekly Rollover (Sunday Night Cron)

```typescript
// Runs Sunday 11:59pm
async function processWeeklyStreaks(): Promise<void> {
  const weekStart = getMonday(new Date());

  // Get all users with activity this week
  const users = await prisma.weekly_app_activity.findMany({
    where: { week_start: weekStart },
    distinct: ['user_id'],
    select: { user_id: true },
  });

  for (const { user_id } of users) {
    await processUserWeeklyStreak(user_id, weekStart);
  }
}

async function processUserWeeklyStreak(userId: string, weekStart: Date): Promise<void> {
  const activities = await prisma.weekly_app_activity.findMany({
    where: { user_id: userId, week_start: weekStart },
  });

  const streaks = await prisma.user_streaks.findUnique({
    where: { user_id: userId }
  });

  const updates: Partial<UserStreaks> = {};
  let appsActive = 0;

  for (const app of ['fitness', 'travel', 'life'] as const) {
    const activity = activities.find(a => a.app === app);
    const threshold = streaks?.[`${app}_threshold`] ?? DEFAULT_THRESHOLDS[app];

    if (activity?.threshold_met) {
      // Threshold met: increment streak
      const currentStreak = (streaks?.[`${app}_streak`] ?? 0) + 1;
      updates[`${app}_streak`] = currentStreak;
      updates[`${app}_longest`] = Math.max(currentStreak, streaks?.[`${app}_longest`] ?? 0);
      appsActive++;
    } else if (streaks?.[`${app}_streak`] > 0) {
      // Threshold not met: use shield or reset
      if ((streaks?.streak_shields ?? 0) > 0) {
        updates.streak_shields = (streaks?.streak_shields ?? 1) - 1;
        // Streak preserved
      } else {
        updates[`${app}_streak`] = 0;
        // Notify streak lost
        dispatchNotification({
          type: 'streak_lost',
          app,
          message: `${APP_NAMES[app]} streak reset. Start fresh! 💪`,
        });
      }
    }
  }

  // Global weekly streak (2+ apps active)
  if (appsActive >= 2) {
    const globalStreak = (streaks?.global_weekly_streak ?? 0) + 1;
    updates.global_weekly_streak = globalStreak;
    updates.global_weekly_longest = Math.max(globalStreak, streaks?.global_weekly_longest ?? 0);
  } else if (streaks?.global_weekly_streak > 0) {
    // Use shield or reset
    if ((updates.streak_shields ?? streaks?.streak_shields ?? 0) > 0) {
      updates.streak_shields = (updates.streak_shields ?? streaks?.streak_shields ?? 1) - 1;
    } else {
      updates.global_weekly_streak = 0;
    }
  }

  await prisma.user_streaks.update({
    where: { user_id: userId },
    data: updates,
  });
}
```

### Today Daily Streak (Unchanged)

```typescript
// Today app keeps daily streak behavior
// This makes sense because daily habits ARE daily
async function updateTodayDailyStreak(userId: string): Promise<void> {
  // Existing logic from gamification.service.ts
  // Check if last activity was yesterday, increment or reset
}
```

---

## Multipliers (Updated)

### Weekly Streak Multipliers

| App | Streak Weeks | Multiplier | Label |
|-----|--------------|------------|-------|
| Any | 2+ weeks | 1.10x | "Warming Up" |
| Any | 4+ weeks | 1.25x | "On Fire" |
| Any | 8+ weeks | 1.50x | "Unstoppable" |
| Any | 12+ weeks | 1.75x | "Legendary" |
| Any | 26+ weeks | 2.00x | "Half-Year Hero" |

### Global Streak Bonus (Stacks)

| Global Streak | Additional Bonus |
|---------------|------------------|
| 4+ weeks (both apps) | +0.10x |
| 8+ weeks | +0.15x |
| 12+ weeks | +0.25x |

### Example Calculation

```
User has:
- Fitness: 6-week streak (1.25x)
- Travel: 6-week streak (1.25x)
- Global: 6-week streak (+0.10x)

Logging a workout:
  Base XP: 500
  × Fitness streak: 1.25
  + Global bonus: 0.10
  = 500 × 1.35 = 675 XP
```

---

## UI Changes

### Streak Display (Nav Bar)

```
CURRENT:
  🔥 14 (daily streak)

NEW:
  ┌─────────────────────────────────────┐
  │  This Week                          │
  │  💪 2/3  🗺️ 1/2  📋 ✓  🎯 0/1      │
  │                                     │
  │  Streaks: 💪6w  🗺️4w  🌍8w         │
  └─────────────────────────────────────┘
```

### Weekly Progress Ring

```typescript
// New component: WeeklyProgressRing.tsx
// Shows circular progress toward weekly goal

<WeeklyProgressRing
  app="fitness"
  current={2}
  threshold={3}
  streakWeeks={6}
/>

// Renders as:
//   ┌───────┐
//   │  2/3  │  ← Progress ring (66% filled)
//   │  💪   │
//   │  6w   │  ← Current streak
//   └───────┘
```

### Streak Settings (User Configurable)

```
┌─────────────────────────────────────────┐
│         Weekly Goals                    │
├─────────────────────────────────────────┤
│                                         │
│  Fitness (workouts/week)                │
│    ○ 2 (Casual)                         │
│    ● 3 (Regular) ← Default              │
│    ○ 4 (Dedicated)                      │
│    ○ 5 (Athlete)                        │
│                                         │
│  Travel (locations/week)                │
│    ○ 1 (Explorer)                       │
│    ● 2 (Adventurer) ← Default           │
│    ○ 3 (Globetrotter)                   │
│                                         │
│  Life (quest actions/week)              │
│    ● 1 (Any progress) ← Default         │
│    ○ 3 (Focused)                        │
│                                         │
│  Today: Daily streak (unchanged)        │
│                                         │
└─────────────────────────────────────────┘
```

---

## Streak Danger (Updated)

### Weekly Danger Notifications

```typescript
// Cron: Thursday 6pm (3 days before week end)
async function sendWeeklyStreakDanger(): Promise<void> {
  const weekStart = getMonday(new Date());

  // Find users with streaks who haven't met threshold
  const atRiskUsers = await prisma.$queryRaw`
    SELECT us.user_id, us.fitness_streak, us.fitness_threshold,
           wa.activity_count
    FROM user_streaks us
    LEFT JOIN weekly_app_activity wa
      ON wa.user_id = us.user_id
      AND wa.app = 'fitness'
      AND wa.week_start = ${weekStart}
    WHERE us.fitness_streak > 0
      AND (wa.activity_count IS NULL OR wa.activity_count < us.fitness_threshold)
  `;

  for (const user of atRiskUsers) {
    const remaining = user.fitness_threshold - (user.activity_count ?? 0);
    await sendPushNotification(user.user_id, {
      title: '💪 Streak Check-In',
      body: `${remaining} more workout${remaining > 1 ? 's' : ''} needed to keep your ${user.fitness_streak}-week streak!`,
      data: { action: 'open_fitness' },
    });
  }
}

// Similar for travel, life
```

### In-App Banner

```typescript
// Show when:
// - It's Thu/Fri/Sat/Sun
// - User has active streak for this app
// - Threshold not yet met this week

function WeeklyStreakDangerBanner({ app }: { app: string }) {
  const { streaks, weeklyActivity } = useStreaks();
  const dayOfWeek = new Date().getDay(); // 0=Sun, 4=Thu

  const threshold = streaks[`${app}_threshold`];
  const current = weeklyActivity[app]?.activity_count ?? 0;
  const streak = streaks[`${app}_streak`];

  if (dayOfWeek < 4 || current >= threshold || streak === 0) {
    return null;
  }

  const remaining = threshold - current;
  const daysLeft = 7 - dayOfWeek; // Days until Sunday

  return (
    <div className="weekly-danger-banner">
      <span className="icon">⏰</span>
      <div>
        <strong>{remaining} more to go!</strong>
        <span>{daysLeft} days left to keep your {streak}-week streak</span>
      </div>
    </div>
  );
}
```

---

## Migration Plan

### Phase 1: Database Setup
1. Create new tables (`user_streaks`, `weekly_app_activity`)
2. Migrate existing daily streak to `today_daily_streak`
3. Initialize weekly streaks to 0 (fresh start)

### Phase 2: Backend Logic
1. Implement `trackWeeklyActivity()` for each app
2. Create Sunday night cron for weekly rollover
3. Update streak multiplier calculations

### Phase 3: UI Updates
1. Replace single streak counter with weekly progress
2. Add streak settings to preferences
3. Update danger notifications

### Phase 4: Communication
1. In-app announcement explaining change
2. One-time "streak amnesty" - everyone starts Week 1 fresh
3. Blog post on why weekly is healthier

---

## Benefits

| Aspect | Daily Streak | Weekly Streak |
|--------|--------------|---------------|
| Rest days | Punished | Allowed |
| Travel gaps | Streak broken | Expected |
| Psychological pressure | High (daily anxiety) | Low (weekly flexibility) |
| Real-world alignment | Poor | Excellent |
| Sustainable long-term | Burnout risk | Healthy |

### Research Support

> "Habits form over months and consistency is more important than perfection." — [Plotline Gamification Research](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)

> "Apps like Fito let users set exercise goals (like working out 3 days a week)... If you encounter situations like illness or travel, you can use the Streak Shield to protect it." — [App Store Examples](https://apps.apple.com/us/app/fito-gamify-fitness-streak/id6596806184)

---

## Files to Create/Modify

### New Files
- `lib/services/weekly-streak.service.ts` - Core logic
- `app/api/cron/weekly-streak-rollover/route.ts` - Sunday cron
- `app/api/cron/weekly-streak-danger/route.ts` - Thursday cron
- `components/WeeklyProgressRing.tsx` - Progress UI
- `components/WeeklyStreakDangerBanner.tsx` - Warning banner

### Modified Files
- `prisma/schema.prisma` - New tables
- `lib/services/gamification.service.ts` - Call trackWeeklyActivity
- `app/settings/page.tsx` - Streak threshold settings
- `components/RetroNavBar.tsx` - Weekly progress display
- `app/fitness/FitnessApp.tsx` - Track workouts
- `app/travel/TravelApp.tsx` - Track locations
- `app/life/*/page.tsx` - Track quest actions

---

## Success Metrics

| Metric | Current (Daily) | Target (Weekly) |
|--------|-----------------|-----------------|
| Streak retention (4+ weeks) | ~15% | ~40% |
| User satisfaction (streak system) | Low | High |
| Streak-related churn | High | Low |
| Rest day guilt reports | Common | Eliminated |

---

*Last updated: January 2026*
*Research basis: Plotline, Fito, University of South Australia gamification study*
