# Reptura iOS App Launch Checklist

> Created: 2026-01-11
> Target: App Store launch in 2-3 weeks
> Reference: `docs/CAPACITOR_INTEGRATION.md` for detailed instructions

---

## Phase 1: Apple Developer Setup (Day 1)

- [ ] Enroll in Apple Developer Program ($99/year)
  - URL: https://developer.apple.com/programs/enroll/
  - Wait for approval (instant for individuals, 24-48h for orgs)

- [ ] Create App ID in Developer Portal
  - Bundle ID: `com.reptura.fitness`
  - Enable HealthKit capability

- [ ] Create Development Provisioning Profile
  - Name: "Reptura Dev"
  - Download and install

- [ ] Create App Store Connect listing
  - URL: https://appstoreconnect.apple.com
  - App name: Reptura
  - SKU: reptura-fitness-001

---

## Phase 2: Project Setup (Day 1-2)

- [ ] Install Capacitor dependencies
  ```bash
  npm install @capacitor/core @capacitor/cli
  npm install @capacitor/ios
  ```

- [ ] Initialize Capacitor
  ```bash
  npx cap init "Reptura" "com.reptura.fitness" --web-dir=out
  npx cap add ios
  ```

- [ ] Create `capacitor.config.ts`

- [ ] Update `next.config.js` for static export
  - Add `output: 'export'`
  - Add `images: { unoptimized: true }`

- [ ] Add build scripts to `package.json`
  ```json
  "build:ios": "npm run build && npx cap sync ios",
  "open:ios": "npx cap open ios"
  ```

- [ ] Test basic build
  ```bash
  npm run build:ios
  npx cap open ios
  ```

- [ ] Verify app runs in iOS Simulator

---

## Phase 3: HealthKit Integration (Day 3-5)

- [ ] Install HealthKit plugin
  ```bash
  npm install @capawesome-team/capacitor-health
  npx cap sync ios
  ```

- [ ] Add privacy descriptions to `Info.plist`
  - `NSHealthShareUsageDescription`
  - `NSHealthUpdateUsageDescription`

- [ ] Enable HealthKit capability in Xcode
  - Target → Signing & Capabilities → + HealthKit

- [ ] Create `lib/native/healthkit.ts` service

- [ ] Integrate with FitnessStore
  - Auto-sync workouts on completion
  - Sync body weight measurements

- [ ] Add HealthKit settings UI
  - Connect/disconnect toggle
  - Permission status display

- [ ] Test HealthKit permissions flow

- [ ] Test workout sync to Apple Health app

---

## Phase 4: Authentication (Day 5-6)

- [ ] Add Sign in with Apple (REQUIRED by App Store)
  ```bash
  npm install @capacitor/sign-in-with-apple
  ```

- [ ] Configure Sign in with Apple in Developer Portal

- [ ] Add Sign in with Apple button to login screen

- [ ] Create `/api/auth/apple` endpoint

- [ ] Test Sign in with Apple flow

- [ ] Ensure account linking works (Google + Apple = same user)

---

## Phase 5: Native UI Polish (Day 6-8)

- [ ] Install native plugins
  ```bash
  npm install @capacitor/haptics @capacitor/keyboard @capacitor/status-bar
  npx cap sync ios
  ```

- [ ] Add safe area CSS variables
  ```css
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  ```

- [ ] Configure status bar styling (dark mode)

- [ ] Add haptic feedback to key interactions
  - Set logging
  - PR celebration
  - Button presses

- [ ] Handle keyboard appearance
  - Input fields stay visible
  - Command bar repositions

- [ ] Test on various device sizes
  - [ ] iPhone SE (small)
  - [ ] iPhone 15 (medium)
  - [ ] iPhone 15 Pro Max (large)

---

## Phase 6: App Assets (Day 9-10)

- [ ] Create app icon (1024x1024 master)
  - Use https://appicon.co to generate all sizes

- [ ] Export app icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

- [ ] Create splash screen image (2732x2732)
  - Dark background (#0a0a0a)
  - Centered Reptura logo

- [ ] Configure `LaunchScreen.storyboard`

- [ ] Verify icons display correctly in Simulator

---

## Phase 7: Testing (Day 11-12)

### Core Functionality
- [ ] App launches without crash
- [ ] Google Sign-in works
- [ ] Apple Sign-in works
- [ ] Workout logging functions correctly
- [ ] Data syncs to cloud
- [ ] Offline mode works
- [ ] PR celebration shows with confetti
- [ ] Share card generates correctly

### HealthKit
- [ ] Permission prompt appears correctly
- [ ] Workouts save to Apple Health
- [ ] Weight syncs to Apple Health
- [ ] Handles permission denied gracefully
- [ ] Works when HealthKit disabled in Settings

### Native Feel
- [ ] Safe areas respected (notch, home indicator)
- [ ] Keyboard doesn't cover inputs
- [ ] Haptic feedback on key actions
- [ ] Status bar styled correctly
- [ ] Splash screen displays properly
- [ ] App icon looks correct on home screen

### Edge Cases
- [ ] Handles phone call interruption
- [ ] Handles notification interruption
- [ ] Handles backgrounding/foregrounding
- [ ] Resumes workout after background
- [ ] Timer continues in background

### TestFlight
- [ ] Archive build in Xcode
- [ ] Upload to App Store Connect
- [ ] Add internal testers
- [ ] Test installation via TestFlight
- [ ] Collect feedback

---

## Phase 8: App Store Submission (Day 13-14)

### Metadata
- [ ] App name: Reptura
- [ ] Subtitle: RPG Fitness Tracker
- [ ] Category: Health & Fitness
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max)
- [ ] Support URL
- [ ] Privacy Policy URL

### Screenshots (required sizes)
- [ ] 6.7" iPhone (1290 x 2796) - iPhone 15 Pro Max
- [ ] 6.5" iPhone (1284 x 2778) - iPhone 11 Pro Max
- [ ] 5.5" iPhone (1242 x 2208) - iPhone 8 Plus

Screenshot suggestions:
1. Home screen with level/XP display
2. Active workout with logged sets
3. PR celebration with confetti
4. HealthKit connected screen
5. Achievements/progress view

### App Privacy
- [ ] Complete App Privacy questionnaire
  - Health & Fitness data (HealthKit)
  - Identifiers (user ID)
  - Usage Data (analytics)

### Review Checklist
- [ ] No placeholder content
- [ ] All links work
- [ ] No crashes during typical usage
- [ ] Sign in with Apple implemented
- [ ] HealthKit usage explained in description
- [ ] Privacy policy accessible

### Submit
- [ ] Select build from uploaded archives
- [ ] Complete export compliance (No = no encryption)
- [ ] Submit for Review
- [ ] Monitor for reviewer questions

---

## Post-Launch

- [ ] Monitor crash reports in Xcode Organizer
- [ ] Respond to App Store reviews
- [ ] Track analytics in App Store Connect
- [ ] Plan v1.1 update based on feedback

---

## Quick Reference

**Build Commands:**
```bash
npm run build:ios      # Build and sync
npx cap open ios       # Open in Xcode
npx cap run ios        # Run on device/simulator
```

**Key Files:**
- `capacitor.config.ts` - Capacitor configuration
- `ios/App/App/Info.plist` - iOS permissions
- `lib/native/healthkit.ts` - HealthKit service
- `next.config.js` - Static export settings

**Support:**
- Capacitor docs: https://capacitorjs.com/docs
- HealthKit plugin: https://github.com/nickytonline/capacitor-healthkit
- App Store guidelines: https://developer.apple.com/app-store/review/guidelines/
