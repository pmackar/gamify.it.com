# Reptura UX/UI Roadmap

> Last Updated: 2026-01-10
> Status: Active Development

## Executive Summary

Reptura is a feature-rich fitness RPG with ~15,000 lines of UI code. This document tracks the UX/UI improvement roadmap to achieve the goal of becoming the **most usable and powerful fitness app on the market**.

**Overall App Grade: B (83.75/100)**

---

## Current Architecture

### Navigation Structure (16 Views)

| View | Purpose | Grade |
|------|---------|-------|
| `home` | Primary landing | B |
| `workout` | Active workout logging | B+ |
| `profile` | User stats & PRs | B- |
| `history` | Past workouts | B |
| `workout-detail` | Single workout view | B |
| `achievements` | Badges & milestones | B |
| `campaigns` | Goal setting | C+ |
| `social` | Friends feed | B- |
| `coach` | AI coaching | TBD |
| `exercises` | Exercise library | B+ |
| `exercise-detail` | Single exercise view | B |
| `templates` | Workout templates | B- |
| `template-editor` | Template editing | B |
| `programs` | Training programs | B- |
| `program-wizard` | Program builder | C+ |
| `program-detail` | Active program view | B |
| `analytics` | Stats dashboard | B |

---

## Page-by-Page Analysis

### 1. Landing Page (Grade: A-)

**Strengths:**
- CRT scanlines, video background, particle effects create memorable brand
- "Every rep is part of your adventure" is clear value prop
- Real stats (sets logged, PRs) build credibility
- "Start Your Quest" is compelling CTA

**Issues:**
- [ ] Interactive demo could be more prominent
- [ ] Phone mockups are small and hard to see
- [ ] No video demo of actual app usage

**Recommendations:**
- [ ] Add a 30-second video showing real app usage
- [ ] Move interactive demo above the fold
- [ ] Add testimonials from real users
- [ ] Add "Try Demo" button that launches ?try=true mode immediately

---

### 2. Home View (Grade: B)

**Strengths:**
- Shows level, XP, recent activity
- FriendRivalryScoreboard, DailyChallengeCard are motivating

**Issues:**
- [x] Hero card leads to Profile (should start workout) - **FIXED**
- [ ] "Almost There" milestones only show ≥95% progress
- [ ] 6+ cards on home competing for attention
- [x] No clear "Start Workout" button visible - **FIXED**

**Recommendations:**
- [x] Add prominent "START WORKOUT" button in hero area - **IMPLEMENTED**
- [ ] Reduce home to 3-4 key cards maximum
- [ ] Progressive disclosure: show more cards as user progresses
- [x] Stats now navigate to profile, hero area has Start Workout button - **IMPLEMENTED**

---

### 3. Workout View (Grade: B+)

**Strengths:**
- Excellent command-based entry ("135 x 8")
- Inline set badges are scannable
- Gold highlighting for PRs is satisfying

**Issues:**
- [x] Exercise pills require tap to log sets (additional step) - **FIXED**
- [ ] Timer in navbar is easy to miss
- [ ] No visual indicator of total volume/XP during workout
- [x] Remove exercise button (✕) is very small - **FIXED**
- [ ] Superset badge "SS" is cryptic

**Recommendations:**
- [x] Add inline "+Set" button on each exercise pill - **IMPLEMENTED**
- [ ] Show running total XP prominently during workout
- [ ] Add volume meter or "workout intensity" indicator
- [x] Increase touch target sizes for mobile - **IMPLEMENTED (44x44px min)**
- [ ] Add haptic feedback on set logging

---

### 4. Set Logging Panel (Grade: A-)

**Strengths:**
- Weight/Reps/RPE layout is intuitive
- "Last time" and "This time" badges excellent
- Progression target shown clearly
- "Repeat Last" button is useful

**Issues:**
- [ ] Panel covers content, no preview of what you're logging for
- [ ] Warmup checkbox is easy to miss
- [ ] RPE optional but takes visual space

**Recommendations:**
- [ ] Show exercise name more prominently in panel header
- [ ] Add quick weight adjustment buttons (+5, -5)
- [ ] Make plate calculator more discoverable
- [ ] Add voice logging option

---

### 5. Profile View (Grade: B-)

**Strengths:**
- Clear level/XP/workouts display

**Issues:**
- [ ] Too many PRs displayed (12) without filtering
- [ ] Edit/delete PR buttons are emoji-only (accessibility)
- [ ] Body stats section uses non-standard input pattern
- [ ] Weight history chart not visible
- [ ] Summary share is easy to miss

**Recommendations:**
- [ ] Add tabs: Overview | PRs | Body | Settings
- [ ] Make weight history chart visible by default
- [ ] Add goal-setting for body composition
- [ ] Improve PR filtering (by muscle, by recency)
- [ ] Add profile photo/avatar customization

---

### 6. History View (Grade: B)

**Strengths:**
- Good information density on workout cards
- Muscle tags help categorization

**Issues:**
- [ ] No search or filter capability
- [ ] Only shows 20 workouts, no pagination
- [ ] No calendar view option
- [ ] Can't compare two workouts

**Recommendations:**
- [ ] Add calendar view toggle
- [ ] Add filter by muscle group
- [ ] Add search by exercise name
- [ ] Implement infinite scroll or "load more"
- [ ] Add workout comparison feature

---

### 7. Exercise Library (Grade: B+)

**Strengths:**
- Real-time filtering works well
- Horizontal scroll chips are intuitive
- PR display is useful

**Issues:**
- [ ] No exercise preview (form tips, video)
- [ ] Custom exercises mixed with built-in without distinction
- [ ] No "recently used" or "favorites" section
- [ ] No equipment filter

**Recommendations:**
- [ ] Add exercise demo videos/GIFs
- [ ] Add "Favorites" quick access section
- [ ] Add equipment filter
- [ ] Show form tips in preview card
- [ ] Add "Add to Workout" button directly in library

---

### 8. Templates View (Grade: B-)

**Issues:**
- [ ] No template preview before starting
- [ ] Can't reorder templates
- [ ] No folders/categories
- [ ] Duplicate button (⧉) is cryptic

**Recommendations:**
- [ ] Add template preview modal
- [ ] Allow template grouping/folders
- [ ] Add estimated duration per template
- [ ] Add "Popular Templates" from community
- [ ] Import/export templates

---

### 9. Programs View (Grade: B-)

**Issues:**
- [ ] Programs vs Templates distinction unclear
- [ ] Program wizard is complex (~500 lines of state)
- [ ] No program calendar visualization
- [ ] Can't preview program before starting

**Recommendations:**
- [ ] Clarify Templates = single workout, Programs = multi-week plan
- [ ] Add visual program calendar (week view)
- [ ] Simplify wizard to 3 steps max
- [ ] Add "Clone and Modify" for existing programs
- [ ] Show estimated completion date

---

### 10. Analytics View (Grade: B)

**Strengths:**
- Volume by week, muscle, strength progress available
- Date filtering options

**Issues:**
- [ ] No AI-generated insights
- [ ] Charts need styling review

**Recommendations:**
- [ ] Add "You lifted X% more than last month" insights
- [ ] Add muscle balance radar chart
- [ ] Add workout frequency heatmap (GitHub-style)
- [ ] Add 1RM progression over time
- [ ] Add body composition trends

---

### 11. Campaigns/Goals View (Grade: C+)

**Issues:**
- [ ] Adding goals requires command bar (not discoverable)
- [ ] No suggested goals based on current PRs
- [ ] No milestone breakdown for large goals
- [ ] No celebration on goal completion

**Recommendations:**
- [ ] Add "Suggested Goals" based on user's data
- [ ] Add mini-goal milestones (25%, 50%, 75%)
- [ ] Add celebration animation on goal completion
- [ ] Consider merging with Achievements

---

### 12. Social View (Grade: B-)

**Issues:**
- [ ] No way to find/add friends easily

**Recommendations:**
- [ ] Add friend search/invite flow
- [ ] Add friend activity notifications
- [ ] Add workout challenges between friends
- [ ] Add gym/group communities

---

### 13. Achievements View (Grade: B)

**Issues:**
- [ ] No progress bar for unearned achievements
- [ ] Mixed general and exercise-specific without grouping
- [ ] No rarity indicators

**Recommendations:**
- [ ] Add progress bars for unearned achievements
- [ ] Group by category (Strength, Consistency, Social)
- [ ] Add rarity indicators (% of users earned)
- [ ] Add shareable achievement cards

---

## Mobile Navigation Analysis

### Current Bottom Nav (UPDATED)
```
🏠 Home | 📚 Library | 📋 History | 👤 Profile
```

**Grade: B+ (improved from B-)**

**Changes Made:**
- ✅ Reduced from 5 tabs to 4 tabs
- ✅ Created unified "Library" tab containing Exercises, Templates, Programs
- ✅ Added library section tabs within Library views
- ✅ Profile now includes Achievements, Analytics, Campaigns, Social

**Previous Issues (Now Fixed):**
- ~~5 tabs is at the limit~~ → Now 4 tabs
- ~~Many features not accessible~~ → Now accessible via Library/Profile tabs

---

## Priority Implementation Roadmap

### 🔴 Critical (Sprint 1)

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Add prominent "Start Workout" button | ✅ DONE | - | Large gradient button on home hero |
| Simplify navigation (16 → 4 tabs) | ✅ DONE | - | Home, Library, History, Profile + Library tabs |
| Improve mobile touch targets (44x44px min) | ✅ DONE | - | Remove buttons, set badges improved |
| Add inline set logging | ✅ DONE | - | "+ Log Set" button on exercise pills |

### 🟡 Important (Sprint 2)

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Add workout summary view | ✅ DONE | - | XP animation, PRs, volume comparison, share |
| Improve history filtering | ✅ DONE | - | Date tabs, muscle chips, search, load more |
| Reduce home view complexity | ✅ DONE | - | Simplified to 4 cards + quick access row |
| Add voice logging | ✅ DONE | - | Web Speech API, "135 times 8" pattern |

### 🟢 Nice to Have (Sprint 3+)

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Add dark/light theme toggle | 🔲 TODO | - | Currently dark-only |
| Add iOS/Android widget | 🔲 TODO | - | Streak, next workout |
| Add Apple Watch companion | 🔲 TODO | - | Quick set logging |

### 🅿️ Parking Lot (Deferred)

| Task | Notes | Reason |
|------|-------|--------|
| Add exercise videos | Demo videos for form | Requires content creation, CDN setup, significant effort |

---

## Metrics to Track

> **Dashboard:** These metrics are now tracked in the admin panel at `/admin/fitness`

### Acquisition & Activation
| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Landing → Sign Up | >15% | TBD | - |
| Sign Up → First Workout | >60% | TBD | Critical for retention |
| Onboarding Completion | >80% | TBD | - |
| Try Mode → Sign Up | >25% | TBD | Demo conversion |

### Engagement
| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Weekly Active Users (WAU) | - | TBD | Core health metric |
| Workouts per User per Week | >2.5 | TBD | - |
| Average Workout Duration | 30-60 min | TBD | - |
| Sets Logged per Workout | >15 | TBD | - |
| Command Bar Usage Rate | - | TBD | Power user indicator |

### Retention
| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| D1 Retention | >40% | TBD | - |
| D7 Retention | >25% | TBD | - |
| D30 Retention | >15% | TBD | - |
| Streak Length (average) | - | TBD | - |

### UX Health
| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Set Logging Speed | <3 sec | TBD | Time from tap to log |
| Error Rate (failed syncs) | <1% | TBD | - |
| Feature Discovery Rate | - | TBD | Track % who use each feature |
| Task Completion Rate | >95% | TBD | - |

---

## Design System Notes

### Typography
- "Press Start 2P" for gamified elements
- Inter for body text

### Color System
- Primary accent: #FF6B6B (red)
- Gold for XP/achievements
- Tier colors: Common (green) → Rare (blue) → Epic (purple) → Legendary (gold)

### Spacing
- Base unit: 16px
- Card border-radius: 12-16px

### Touch Targets
- **Minimum: 44x44px** (Apple HIG recommendation)
- Current issues: Remove buttons, some action buttons

---

## Changelog

### 2026-01-10 (Admin Dashboard)
- ✅ Built fitness metrics dashboard in admin panel
  - Acquisition & Activation: Total users, first workout rate, total workouts/sets/volume
  - Engagement: WAU, workouts per week, sets per workout, avg volume
  - Retention: D1, D7, D30 retention rates with targets
  - Workout frequency distribution (last 7 days)
  - Weekly workout trend chart
  - Feature usage: PRs, rivalries, encounters
  - UX health targets display
  - Added /admin/fitness route with Dumbbell icon in nav
- 📦 Moved exercise videos to parking lot (requires content creation + CDN)

### 2026-01-10 (Sprint 2 - Important Items)
- ✅ Added workout summary modal
  - Animated XP earned display
  - PRs section with gold highlighting
  - Volume comparison vs similar workout
  - Share button with native share / clipboard fallback
- ✅ Improved history filtering
  - Search by exercise name
  - Date filter tabs (All, 7d, 30d, 90d)
  - Muscle group filter chips
  - Load more pagination
- ✅ Reduced home view complexity
  - Removed: FriendRivalryScoreboard, AlmostThereCard, AccountabilityCard
  - Kept: DailyChallengeCard as "Today's Focus"
  - Limited recent workouts to 2 with "See All" button
  - Added quick access row (Social, Achievements, Analytics)
- ✅ Added voice logging
  - Web Speech API integration
  - Pattern recognition: "135 times 8", "225 x 5", "185 by 10"
  - Listening animation with pulse effect
  - Toast confirmation

### 2026-01-10 (Sprint 1 - Critical Items)
- ✅ Added prominent "Start Workout" button to home hero
  - Gradient button with hover/active states
  - Moved profile navigation to stats area
- ✅ Simplified navigation from 5 tabs to 4 tabs
  - New structure: Home | Library | History | Profile
  - Library consolidates: Exercises, Templates, Programs
  - Added library section tabs for sub-navigation
- ✅ Improved mobile touch targets
  - Remove button now 44x44px minimum
  - Set badges enlarged with better padding
  - Active states with visual feedback
- ✅ Added inline set logging
  - "+ Log Set" button on exercises with no sets
  - "+" button after existing sets for quick add
  - Stops event propagation for proper UX
- Initial roadmap created
- Comprehensive UX/UI audit completed
- Priority items identified
- Metrics framework established
