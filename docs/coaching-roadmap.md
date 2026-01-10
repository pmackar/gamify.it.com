# Coaching Platform Roadmap

*Last Updated: January 10, 2026*

---

## Current Status

### Completed (Foundation)
| Feature | Status | Notes |
|---------|--------|-------|
| Coach registration & profiles | ✅ Done | `/api/fitness/coach/register`, `/profile` |
| Athlete invitations & management | ✅ Done | `/api/fitness/coach/athletes` |
| Program CRUD with weeks/workouts | ✅ Done | `/api/fitness/coach/programs` |
| Program assignment to athletes | ✅ Done | `/api/fitness/coach/programs/[id]/assign` |
| Basic compliance tracking | ✅ Done | `coaching_workout_completions` table |
| Dashboard with stats & alerts | ✅ Done | `/api/fitness/coach/dashboard` |
| Program versioning | ✅ Done | `/api/fitness/coach/programs/[id]/versions` |
| Workout templates | ✅ Done | `/api/fitness/coach/templates` |
| AI program generation | ✅ Done | `/api/fitness/coach/programs/generate` |
| **Coach tier permission protection** | ✅ Done | `withCoachAuth` wrapper on all routes |

---

## Sprint 1: Communication + Oversight (COMPLETE)

| Task | Status | Priority |
|------|--------|----------|
| In-app messaging (coach ↔ athlete) | ✅ Done | HIGH |
| Notification infrastructure | ✅ Done | HIGH |
| Enhanced athlete profile with progress charts | ✅ Done | HIGH |
| Real-time activity feed | ✅ Done | MEDIUM |
| Compliance heatmap visualization | ✅ Done | MEDIUM |

### Completed: In-App Messaging System
- Database: `coaching_conversations`, `coaching_messages` tables
- API: `/api/fitness/coach/messages`, `/api/fitness/athlete/messages`
- UI: ChatPanel component in athlete detail view
- Features: Text messages, read receipts, message polling

### Completed: Notification System
- Database: `coaching_notifications` table with 10 notification types
- API: `/api/fitness/notifications`, `/api/fitness/coach/notifications`
- UI: CoachNotificationBell component in coach dashboard
- Triggers: Auto-notify on new messages (coach ↔ athlete)
- Helper: `lib/notifications.ts` with templates for all event types

---

## Sprint 2: Group Coaching + Check-Ins (IN PROGRESS)

| Task | Status | Priority |
|------|--------|----------|
| Group creation and management | ✅ Done | HIGH |
| Group chat | 🔲 Todo | MEDIUM |
| Check-in system (weekly wellness surveys) | ✅ Done | HIGH |
| Leaderboards (per-group and global) | 🔲 Todo | MEDIUM |

### Completed: Group Management
- Database: `coaching_groups`, `coaching_group_members` tables
- API: `/api/fitness/coach/groups` (CRUD), `/groups/[id]/members` (add/remove)
- UI: Groups page with create, edit, delete, add/remove members
- Color-coded groups for easy identification

### Completed: Check-In System
- Database: `coaching_check_ins` table with wellness metrics
- API: `/api/fitness/coach/check-ins`, `/api/fitness/athlete/check-ins`
- Metrics: energy, sleep, stress, soreness, motivation (1-5 scale)
- Freeform: wins, challenges, questions for coach
- Coach review with notes and feedback
- Auto-notification to coach on submission

### Remaining
- Group chat (can reuse existing messaging infrastructure)
- Leaderboards: volume, compliance %, PR count, XP, streaks

---

## Sprint 3: Form Checks + Advanced Monitoring

| Task | Status | Priority |
|------|--------|----------|
| Video form check system | 🔲 Todo | HIGH |
| Live workout monitoring | 🔲 Todo | MEDIUM |
| Program update propagation | 🔲 Todo | MEDIUM |

### Video Hosting Strategy
**Recommended: Cloudinary**
- Free tier: 25GB storage/bandwidth
- Easy SDK integration
- Auto compression & thumbnails
- Fallback: Allow YouTube/external links

---

## Sprint 4: Platform Monetization

| Task | Status | Priority |
|------|--------|----------|
| Coach subscription tiers | 🔲 Todo | HIGH |
| Usage tracking and limits | 🔲 Todo | MEDIUM |
| Premium feature gating | 🔲 Todo | MEDIUM |

### Tier Structure (Proposed)
| Tier | Price | Athletes | Features |
|------|-------|----------|----------|
| Free | $0 | 3 | Basic dashboard, manual tracking |
| Pro | $29/mo | 25 | Messaging, check-ins, compliance viz |
| Elite | $79/mo | Unlimited | Form checks, groups, AI generation |

---

## Sprint 5: Coach Billing (Long-term)

| Task | Status | Priority |
|------|--------|----------|
| Stripe Connect integration | 🔲 Todo | MEDIUM |
| Coaches can charge athletes | 🔲 Todo | MEDIUM |
| Invoice generation | 🔲 Todo | LOW |

---

## Competitive Comparison (Updated)

| Feature | TrainHeroic | TrueCoach | CoachRx | **Ours** |
|---------|-------------|-----------|---------|----------|
| Program Builder | ✅ | ✅ | ✅ | ✅ |
| Exercise Library | 1,300+ | 1,200+ | 2,000+ | 100+ |
| Video Form Checks | ✅ | ✅ | ❌ | 🔲 Sprint 3 |
| In-App Messaging | ✅ | ✅ | ✅ | ✅ |
| Compliance Dashboard | ✅ | ✅ | ✅ | ✅ |
| Real-time Monitoring | ❌ | ❌ | ❌ | 🔲 Sprint 3 |
| AI Program Generation | ❌ | ❌ | ✅ | ✅ |
| Leaderboards | ✅ | ❌ | ❌ | 🔲 Sprint 2 |
| Payment Integration | ❌ | ✅ | ✅ | 🔲 Sprint 5 |
| Group Coaching | ✅ | ❌ | ❌ | 🔲 Sprint 2 |

---

## Key Differentiators

1. **Real-time workout monitoring** - See athletes lift in real-time (no competitor has this)
2. **Gamification integration** - XP, levels, achievements for athletes
3. **AI program generation** - Already built and working
4. **RPG-style UI** - Unique retro gaming aesthetic
5. **Unified platform** - Fitness + Travel + Life all in one app

---

## Database Tables Required

### Sprint 1 (Messaging)
```sql
coaching_conversations (id, coach_id, athlete_id, last_message_at, unread_count)
coaching_messages (id, conversation_id, sender_id, content, attachments, read_at, created_at)
coaching_notifications (id, recipient_id, coach_id, type, title, body, data, read, created_at)
```

### Sprint 2 (Groups + Check-ins)
```sql
coaching_groups (id, coach_id, name, description, created_at)
coaching_group_members (id, group_id, athlete_id, joined_at)
coaching_check_ins (id, athlete_id, coach_id, week_of, responses, coach_notes, created_at)
```

### Sprint 3 (Form Checks)
```sql
coaching_form_checks (id, athlete_id, coach_id, exercise_id, video_url, status, coach_feedback, reviewed_at)
coaching_live_sessions (id, athlete_id, coach_id, workout_id, started_at, last_activity, current_data, is_active)
```

---

## Immediate Next Steps

1. **Messaging System** (Sprint 1 completion)
   - Add database tables for conversations/messages
   - Create API routes with `withCoachAuth` protection
   - Build ChatPanel UI component
   - Integrate into athlete detail page

2. **Notification System**
   - Add notifications table
   - Create send/list APIs
   - Add notification bell to coach nav
   - Email integration (optional)

---

*This roadmap is a living document. Priorities may shift based on user feedback and business needs.*
