# gamify.travel - Product Roadmap

## Completed Features ✅

### Core Infrastructure
- [x] Next.js 14+ App Router with TypeScript
- [x] PostgreSQL with Prisma ORM (Supabase)
- [x] NextAuth.js with Google OAuth
- [x] Mapbox GL JS interactive map
- [x] Vercel deployment

### Data Model
- [x] Cities with country/region
- [x] Neighborhoods within cities
- [x] Locations with types, ratings, tags
- [x] Visits with detailed ratings
- [x] User profiles with XP/levels

### Pages & Navigation
- [x] Dashboard with stats overview
- [x] Cities list and detail pages
- [x] Neighborhoods list and detail pages
- [x] Locations list with filters (type, visited, hotlist)
- [x] Location detail with Notion-style layout
- [x] Full-screen map with popups and detail modal
- [x] Profile page with character sheet
- [x] Achievements page

### Gamification
- [x] XP system with 1.5x level scaling
- [x] Streak tracking (current/longest)
- [x] Achievement definitions in database

### Data Import
- [x] Notion migration script (264 locations imported)
- [x] Geocoding script for coordinates
- [x] Neighborhood migration from strings to records

---

## Phase 1: Photo Uploads
**Visual documentation of travels**

### Features
- [ ] Upload photos to locations
- [ ] Upload photos to visits
- [ ] Photo gallery on location detail
- [ ] Photo thumbnails in location cards
- [ ] Lightbox viewer for full-size images

### Technical Requirements
- Vercel Blob storage for images
- Image optimization/resizing
- `/app/api/upload/route.ts` endpoint
- Update Location and Visit models

### Data Structure
```javascript
{
  id: "photo-uuid",
  url: "https://blob.vercel-storage.com/...",
  caption: "Best tacos in Philly",
  locationId: "loc-123",
  visitId: "visit-456",
  createdAt: "2024-01-15T10:30:00Z"
}
```

---

## Phase 2: Visit Check-ins
**Log visits with detailed ratings**

### Features
- [ ] "Check In" button on location detail
- [ ] Rating form (overall, food, service, ambiance, value)
- [ ] Visit notes/comments
- [ ] Visit date picker
- [ ] Highlights tags (e.g., "Great cocktails", "Cozy atmosphere")
- [ ] XP award on check-in
- [ ] Visit history on location detail

### UI Components
- RatingInput (1-10 scale or 5-star)
- HighlightPicker (tag selection)
- VisitCard (in history list)

### XP Values
| Action | Base XP | With Photo | With Rating |
|--------|---------|------------|-------------|
| First visit | 50 | +25 | +10 |
| Return visit | 25 | +25 | +10 |
| New city | 100 | - | - |
| New country | 250 | - | - |

---

## Phase 3: Achievement Unlocks
**Reward exploration milestones**

### Features
- [ ] Achievement unlock notifications (toast/popup)
- [ ] Achievement progress tracking
- [ ] Locked vs unlocked display
- [ ] XP rewards on unlock
- [ ] Achievement categories

### Achievement Categories
| Category | Examples |
|----------|----------|
| Explorer | Visit 10/50/100 locations |
| Globe Trotter | Visit 5/10/25 countries |
| City Hopper | Visit 10/25/50 cities |
| Foodie | Rate 25/50/100 restaurants |
| Streak Master | 7/30/100 day streak |
| Completionist | Visit all locations in a neighborhood |
| Reviewer | Leave 10/50/100 reviews |
| Photographer | Upload 25/100/500 photos |

### Implementation
- `checkAchievements()` runs after each action
- Compare user stats against achievement criteria
- Unlock and award XP if criteria met
- Store unlock timestamp in UserAchievement

---

## Phase 4: Stats & Analytics
**Visualize travel patterns**

### Features
- [ ] Progress charts per metric
- [ ] Visit frequency heatmap (calendar view)
- [ ] Location type distribution (pie chart)
- [ ] Cities/countries visited map
- [ ] Monthly/yearly summaries
- [ ] Personal records timeline
- [ ] "Year in Review" page

### Charts (using Chart.js)
- Line chart: Visits over time
- Bar chart: Locations by type
- Heatmap: Activity calendar
- Map: Countries/cities visited
- Radar: Rating breakdown

### Stats to Track
- Total locations/cities/countries
- Visits this week/month/year
- Average rating given
- Most visited location type
- Longest streak
- Total XP earned

---

## Phase 5: Export & Sharing
**Share your travels**

### Features
- [ ] Export to CSV (locations, visits)
- [ ] Export to PDF (travel report)
- [ ] Shareable profile link (public view)
- [ ] Social sharing cards (OG images)
- [ ] "Share to Instagram" story template
- [ ] Embeddable map widget

### Export Formats
| Format | Content |
|--------|---------|
| CSV | Locations with all fields |
| PDF | Visual travel report with stats |
| JSON | Full data backup |
| Image | Stats card for sharing |

---

## Phase 6: Trip Planning
**Plan future adventures**

### Features
- [ ] Create trip itineraries
- [ ] Add locations to trip wishlist
- [ ] Trip dates and duration
- [ ] Daily schedule view
- [ ] Map view of trip locations
- [ ] Share trip plans
- [ ] Import from Google Maps lists

### Data Structure
```javascript
{
  id: "trip-uuid",
  name: "Tokyo 2025",
  startDate: "2025-03-15",
  endDate: "2025-03-22",
  locations: [
    { locationId: "loc-1", day: 1, order: 1 },
    { locationId: "loc-2", day: 1, order: 2 }
  ],
  notes: "Cherry blossom season!"
}
```

---

## Phase 7: Mobile PWA
**Native-like mobile experience**

### Features
- [ ] PWA manifest and service worker
- [ ] Offline support (cached data)
- [ ] Add to home screen
- [ ] Push notifications (streak reminders)
- [ ] Location-based suggestions
- [ ] Quick check-in widget

### Technical Requirements
- `next-pwa` package
- Service worker for caching
- Web push notifications
- Geolocation API integration

---

## Implementation Priority

| Phase | Effort | Value | Priority |
|-------|--------|-------|----------|
| 1. Photo Uploads | Medium | High | ★★★★★ |
| 2. Visit Check-ins | Medium | High | ★★★★★ |
| 3. Achievement Unlocks | Low | High | ★★★★☆ |
| 4. Stats & Analytics | Medium | Medium | ★★★☆☆ |
| 5. Export & Sharing | Low | Medium | ★★★☆☆ |
| 6. Trip Planning | High | Medium | ★★☆☆☆ |
| 7. Mobile PWA | High | High | ★★☆☆☆ |

---

## Quick Wins

These can be implemented quickly:

1. **Achievement toasts** - Show notification on unlock
2. **Visit count badge** - Show on location cards
3. **"Add to Hotlist" button** - Quick toggle on location detail
4. **Search** - Global search across locations
5. **Sort options** - Sort locations by rating, date, name
6. **Dark/light mode toggle** - Theme switcher
