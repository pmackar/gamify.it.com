# Capacitor Integration Plan for Reptura iOS App

> Created: 2026-01-11
> Goal: Wrap Reptura web app as native iOS app with Apple HealthKit integration
> Timeline: 2-3 weeks
> Prerequisites: Mac with Xcode, Apple Developer Account ($99/year)

## Overview

Capacitor wraps your existing Next.js web app in a native iOS shell, giving you access to native APIs (HealthKit, haptics, push notifications) while reusing 95% of your existing code.

```
┌─────────────────────────────────────────┐
│           Native iOS Shell              │
│  ┌───────────────────────────────────┐  │
│  │         WKWebView                 │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │   Your Next.js App          │  │  │
│  │  │   (Reptura/Fitness)         │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Native Bridges:                        │
│  • HealthKit ←→ JavaScript              │
│  • Haptics ←→ JavaScript                │
│  • Push Notifications ←→ JavaScript     │
└─────────────────────────────────────────┘
```

---

## Phase 1: Apple Developer Setup (Day 1)

### 1.1 Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (or create one)
3. Enroll as Individual ($99/year) or Organization
4. Wait for approval (usually instant for individuals, 24-48h for orgs)

### 1.2 Create App ID & Certificates

In Apple Developer Portal (https://developer.apple.com/account):

```
1. Certificates, Identifiers & Profiles → Identifiers → +
2. Select "App IDs" → Continue
3. Select "App" → Continue
4. Description: "Reptura Fitness"
5. Bundle ID: com.reptura.fitness (explicit)
6. Capabilities: Check "HealthKit"
7. Continue → Register
```

### 1.3 Create Provisioning Profiles

```
1. Profiles → + → iOS App Development
2. Select your App ID (com.reptura.fitness)
3. Select your development certificate
4. Select your test devices
5. Name: "Reptura Dev"
6. Download and double-click to install

Repeat for "App Store" distribution profile when ready to submit.
```

### 1.4 Enable HealthKit in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. My Apps → + → New App
3. Fill in details:
   - Platform: iOS
   - Name: Reptura
   - Primary Language: English
   - Bundle ID: com.reptura.fitness
   - SKU: reptura-fitness-001
4. In App Information → App Privacy, you'll need to declare HealthKit data usage

---

## Phase 2: Project Setup (Day 1-2)

### 2.1 Install Capacitor

```bash
cd /Users/petermackar/Claude/gamify.it.com

# Install Capacitor core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init "Reptura" "com.reptura.fitness" --web-dir=out

# Add iOS platform
npm install @capacitor/ios
npx cap add ios
```

### 2.2 Configure capacitor.config.ts

Create/update `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reptura.fitness',
  appName: 'Reptura',
  webDir: 'out',
  server: {
    // For development: load from local dev server
    // url: 'http://localhost:3000',
    // cleartext: true,

    // For production: use bundled files
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Reptura',
    // Handle safe areas properly
    backgroundColor: '#0a0a0a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0a0a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
```

### 2.3 Update next.config.js for Static Export

Capacitor needs static HTML files. Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Capacitor
  output: 'export',

  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },

  // Trailing slashes for proper routing
  trailingSlash: true,

  // Your existing config...
};

module.exports = nextConfig;
```

### 2.4 Create Build Script

Add to `package.json`:

```json
{
  "scripts": {
    "build:ios": "npm run build && npx cap sync ios",
    "open:ios": "npx cap open ios",
    "dev:ios": "npx cap run ios --livereload --external"
  }
}
```

---

## Phase 3: HealthKit Integration (Day 3-5)

### 3.1 Install HealthKit Plugin

```bash
# Option A: Official Capacitor Community Plugin
npm install @capawesome-team/capacitor-health

# Option B: Alternative plugin with more features
npm install capacitor-health-kit

npx cap sync ios
```

### 3.2 Configure iOS Permissions

Edit `ios/App/App/Info.plist` (Capacitor creates this):

```xml
<key>NSHealthShareUsageDescription</key>
<string>Reptura reads your workout history to show your fitness progress and sync with Apple Health.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Reptura saves your workouts to Apple Health so all your fitness data stays in one place.</string>

<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
</array>
```

### 3.3 Enable HealthKit Capability in Xcode

```
1. npx cap open ios
2. Select "App" target → Signing & Capabilities
3. + Capability → HealthKit
4. Check "Clinical Health Records" if needed (optional)
```

### 3.4 Create HealthKit Service

Create `lib/native/healthkit.ts`:

```typescript
import { Capacitor } from '@capacitor/core';

// Only import on native
let HealthKit: any = null;
if (Capacitor.isNativePlatform()) {
  import('@capawesome-team/capacitor-health').then(module => {
    HealthKit = module.Health;
  });
}

export interface HealthKitWorkout {
  type: 'strength_training' | 'walking' | 'running' | 'cycling';
  startDate: Date;
  endDate: Date;
  energyBurned?: number; // kcal
  distance?: number; // meters
  metadata?: Record<string, any>;
}

export const healthKitService = {
  /**
   * Check if running in native app with HealthKit available
   */
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  },

  /**
   * Request HealthKit permissions
   * Call this during onboarding or first workout
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isAvailable() || !HealthKit) return false;

    try {
      const result = await HealthKit.requestAuthorization({
        read: ['workout', 'weight', 'height'],
        write: ['workout', 'weight'],
      });
      return result.granted;
    } catch (error) {
      console.error('HealthKit permission error:', error);
      return false;
    }
  },

  /**
   * Check if we have permission (doesn't prompt)
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.isAvailable() || !HealthKit) return false;

    try {
      const result = await HealthKit.checkAuthorization({
        read: ['workout'],
        write: ['workout'],
      });
      return result.granted;
    } catch {
      return false;
    }
  },

  /**
   * Save a completed workout to Apple Health
   */
  async saveWorkout(workout: HealthKitWorkout): Promise<boolean> {
    if (!this.isAvailable() || !HealthKit) return false;

    try {
      await HealthKit.saveWorkout({
        activityType: this.mapWorkoutType(workout.type),
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        energyBurned: workout.energyBurned,
        energyBurnedUnit: 'kcal',
        distance: workout.distance,
        distanceUnit: 'm',
      });
      return true;
    } catch (error) {
      console.error('Failed to save workout to HealthKit:', error);
      return false;
    }
  },

  /**
   * Save body weight measurement
   */
  async saveWeight(weightKg: number, date: Date = new Date()): Promise<boolean> {
    if (!this.isAvailable() || !HealthKit) return false;

    try {
      await HealthKit.saveWeight({
        value: weightKg,
        unit: 'kg',
        date: date.toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Failed to save weight to HealthKit:', error);
      return false;
    }
  },

  /**
   * Read recent workouts from Apple Health
   */
  async getRecentWorkouts(days: number = 30): Promise<any[]> {
    if (!this.isAvailable() || !HealthKit) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await HealthKit.queryWorkouts({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      });
      return result.workouts || [];
    } catch (error) {
      console.error('Failed to read workouts from HealthKit:', error);
      return [];
    }
  },

  /**
   * Read current body weight
   */
  async getCurrentWeight(): Promise<number | null> {
    if (!this.isAvailable() || !HealthKit) return null;

    try {
      const result = await HealthKit.queryWeight({
        limit: 1,
      });
      return result.weight?.value || null;
    } catch {
      return null;
    }
  },

  // Map our workout types to Apple's activity types
  mapWorkoutType(type: HealthKitWorkout['type']): string {
    const map: Record<string, string> = {
      strength_training: 'traditionalStrengthTraining',
      walking: 'walking',
      running: 'running',
      cycling: 'cycling',
    };
    return map[type] || 'traditionalStrengthTraining';
  },
};
```

### 3.5 Integrate with Fitness Store

Update `lib/fitness/store.ts` to sync workouts:

```typescript
import { healthKitService } from '@/lib/native/healthkit';

class FitnessStore {
  // ... existing code ...

  async finishWorkout() {
    // ... existing finish workout logic ...

    // NEW: Sync to Apple Health if available
    if (healthKitService.isAvailable()) {
      const hasPermission = await healthKitService.checkPermissions();

      if (hasPermission) {
        await healthKitService.saveWorkout({
          type: 'strength_training',
          startDate: new Date(this.currentWorkout.startedAt),
          endDate: new Date(),
          energyBurned: this.estimateCaloriesBurned(),
        });

        console.log('Workout synced to Apple Health');
      }
    }

    // ... rest of finish workout logic ...
  }

  // Estimate calories for strength training
  estimateCaloriesBurned(): number {
    const durationMinutes = this.workoutDuration / 60;
    // Rough estimate: 3-6 cal/min for strength training
    // Use 4.5 as middle ground
    return Math.round(durationMinutes * 4.5);
  }
}
```

### 3.6 Add HealthKit Onboarding UI

Add to FitnessApp.tsx (in the onboarding or settings section):

```typescript
// HealthKit Settings Card
const HealthKitCard = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealthKit();
  }, []);

  const checkHealthKit = async () => {
    const available = healthKitService.isAvailable();
    setIsAvailable(available);

    if (available) {
      const connected = await healthKitService.checkPermissions();
      setIsConnected(connected);
    }
    setLoading(false);
  };

  const connectHealthKit = async () => {
    setLoading(true);
    const granted = await healthKitService.requestPermissions();
    setIsConnected(granted);
    setLoading(false);

    if (granted) {
      toast.success('Connected to Apple Health!');
    } else {
      toast.error('Permission denied. Enable in Settings → Privacy → Health.');
    }
  };

  if (!isAvailable) return null;

  return (
    <div className="healthkit-card">
      <div className="healthkit-header">
        <span className="healthkit-icon">❤️</span>
        <span className="healthkit-title">Apple Health</span>
      </div>

      {isConnected ? (
        <div className="healthkit-status connected">
          <span>✓ Connected</span>
          <span className="healthkit-subtitle">Workouts sync automatically</span>
        </div>
      ) : (
        <button
          className="healthkit-connect-btn"
          onClick={connectHealthKit}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Connect Apple Health'}
        </button>
      )}
    </div>
  );
};
```

---

## Phase 4: Native UI Enhancements (Day 6-8)

### 4.1 Safe Area Handling

iOS has notches and home indicators. Update your CSS:

```css
/* Add to globals.css */
:root {
  --safe-area-top: env(safe-area-inset-top);
  --safe-area-bottom: env(safe-area-inset-bottom);
  --safe-area-left: env(safe-area-inset-left);
  --safe-area-right: env(safe-area-inset-right);
}

/* Apply to your app container */
.app-container {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

/* Bottom nav needs extra padding */
.bottom-nav {
  padding-bottom: calc(var(--safe-area-bottom) + 8px);
}
```

### 4.2 Haptic Feedback

Install haptics plugin:

```bash
npm install @capacitor/haptics
npx cap sync ios
```

Add haptic feedback to key interactions:

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export const haptic = {
  light: () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  },
  medium: () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  },
  heavy: () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Heavy });
    }
  },
  success: () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: 'success' });
    }
  },
};

// Use in FitnessApp.tsx:
const logSet = () => {
  haptic.medium(); // Feedback when logging
  // ... existing logic
};

const achievePR = () => {
  haptic.success(); // Celebration haptic
  // ... existing logic
};
```

### 4.3 Status Bar Styling

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// In your app initialization:
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }); // Light text for dark background
  StatusBar.setBackgroundColor({ color: '#0a0a0a' });
}
```

### 4.4 Keyboard Handling

The keyboard plugin helps with input positioning:

```bash
npm install @capacitor/keyboard
npx cap sync ios
```

```typescript
import { Keyboard } from '@capacitor/keyboard';

// Listen for keyboard events
Keyboard.addListener('keyboardWillShow', (info) => {
  document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
});

Keyboard.addListener('keyboardWillHide', () => {
  document.body.style.setProperty('--keyboard-height', '0px');
});
```

---

## Phase 5: App Assets & Branding (Day 9-10)

### 5.1 App Icon

Create app icon in multiple sizes. You need:

```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── Icon-20@2x.png      (40x40)
├── Icon-20@3x.png      (60x60)
├── Icon-29@2x.png      (58x58)
├── Icon-29@3x.png      (87x87)
├── Icon-40@2x.png      (80x80)
├── Icon-40@3x.png      (120x120)
├── Icon-60@2x.png      (120x120)
├── Icon-60@3x.png      (180x180)
├── Icon-76.png         (76x76)
├── Icon-76@2x.png      (152x152)
├── Icon-83.5@2x.png    (167x167)
├── Icon-1024.png       (1024x1024) - App Store
└── Contents.json
```

**Tool:** Use https://appicon.co to generate all sizes from one 1024x1024 image.

### 5.2 Splash Screen

Create splash screen images:

```
ios/App/App/Assets.xcassets/Splash.imageset/
├── splash-2732x2732.png   (iPad Pro 12.9")
├── splash-1668x2388.png   (iPad Pro 11")
├── splash-1536x2048.png   (iPad)
├── splash-1242x2688.png   (iPhone 11 Pro Max)
├── splash-1125x2436.png   (iPhone X/11 Pro)
├── splash-828x1792.png    (iPhone 11)
└── Contents.json
```

Simple approach: Create one large image (2732x2732) centered, will scale down.

### 5.3 Launch Screen Storyboard

Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard` to customize the launch screen appearance (background color, logo positioning).

---

## Phase 6: Build & Test (Day 11-12)

### 6.1 Development Build

```bash
# Build the Next.js static export
npm run build

# Sync to iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select your team in Signing & Capabilities
2. Select a simulator or connected device
3. Click Play (⌘R) to build and run

### 6.2 Live Reload Development

For faster development:

```bash
# Start Next.js dev server
npm run dev

# In another terminal, run with live reload
npx cap run ios --livereload --external
```

This loads from your dev server, so changes appear instantly.

### 6.3 TestFlight Internal Testing

1. In Xcode: Product → Archive
2. In Organizer: Distribute App → App Store Connect → Upload
3. In App Store Connect: TestFlight → Internal Testing → Add testers
4. Testers get invite via email, install via TestFlight app

### 6.4 Testing Checklist

```markdown
## Core Functionality
- [ ] App launches without crash
- [ ] Login with Google works
- [ ] Login with Apple works (REQUIRED)
- [ ] Workout logging functions correctly
- [ ] Data syncs to cloud
- [ ] Offline mode works
- [ ] PR celebration shows

## HealthKit
- [ ] Permission prompt appears
- [ ] Workouts save to Apple Health
- [ ] Weight syncs to Apple Health
- [ ] Handles permission denied gracefully
- [ ] Works when HealthKit disabled in Settings

## Native Feel
- [ ] Safe areas respected (notch, home indicator)
- [ ] Keyboard doesn't cover inputs
- [ ] Haptic feedback on key actions
- [ ] Status bar styled correctly
- [ ] Splash screen displays
- [ ] App icon looks correct

## Edge Cases
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 15 Pro Max (large screen)
- [ ] Works on iPad (if supporting)
- [ ] Handles interruptions (phone call, notification)
- [ ] Handles backgrounding/foregrounding
- [ ] Handles low memory warnings
```

---

## Phase 7: App Store Submission (Day 13-14)

### 7.1 App Store Connect Preparation

In App Store Connect, fill out:

**App Information:**
- Name: Reptura
- Subtitle: RPG Fitness Tracker
- Category: Health & Fitness
- Age Rating: 4+ (run questionnaire)

**Pricing:**
- Price: Free (or your chosen tier)
- Availability: All countries (or select)

**App Privacy:**
- Data Types: Health & Fitness (HealthKit), Identifiers, Usage Data
- Data Linked to User: Yes (for account features)
- Tracking: No (unless you add analytics with IDFA)

### 7.2 Screenshots

Required sizes:
- 6.7" (iPhone 15 Pro Max): 1290 x 2796
- 6.5" (iPhone 11 Pro Max): 1284 x 2778
- 5.5" (iPhone 8 Plus): 1242 x 2208

Tips:
- Show key features: workout logging, PR celebration, HealthKit connection
- Use Simulator to capture clean screenshots
- Add marketing text overlay if desired

### 7.3 App Review Guidelines Checklist

Apple will reject if:
- [ ] No Sign in with Apple (required when Google Sign-in exists)
- [ ] HealthKit usage not explained in description
- [ ] Privacy policy missing
- [ ] Crashes during review
- [ ] Broken links
- [ ] Placeholder content

### 7.4 Submit for Review

1. Create new version in App Store Connect
2. Upload build from Xcode
3. Add screenshots and metadata
4. Select build
5. Answer export compliance (No encryption = No)
6. Submit for Review

**Timeline:** 24-48 hours typical, can be longer for first submission.

---

## Maintenance & Updates

### Updating the App

```bash
# Make changes to your Next.js code
# Then:
npm run build
npx cap sync ios
npx cap open ios
# Archive and upload new build
```

### Version Numbering

In `ios/App/App/Info.plist`:
- CFBundleShortVersionString: User-visible version (1.0.0, 1.1.0)
- CFBundleVersion: Build number (1, 2, 3... increment each upload)

### Monitoring

- Xcode Organizer: Crash reports
- App Store Connect: Analytics, ratings, reviews
- TestFlight: Beta feedback

---

## File Structure After Integration

```
gamify.it.com/
├── ios/                          # NEW: Capacitor iOS project
│   ├── App/
│   │   ├── App/
│   │   │   ├── Assets.xcassets/  # App icons, splash
│   │   │   ├── Info.plist        # iOS config
│   │   │   └── ...
│   │   └── App.xcodeproj
│   └── Podfile                   # iOS dependencies
├── capacitor.config.ts           # NEW: Capacitor config
├── lib/
│   └── native/
│       └── healthkit.ts          # NEW: HealthKit service
├── app/
│   └── fitness/
│       └── FitnessApp.tsx        # Updated: HealthKit integration
├── next.config.js                # Updated: static export
├── package.json                  # Updated: new scripts & deps
└── out/                          # NEW: Static build output
```

---

## Cost Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| Mac (if needed) | $999-2499 | One-time |
| Time investment | ~2-3 weeks | One-time |
| Ongoing maintenance | ~2-4 hours/month | Monthly |

---

## Next Steps

1. [ ] Enroll in Apple Developer Program
2. [ ] Run Phase 2 setup commands
3. [ ] Test basic app in Simulator
4. [ ] Implement HealthKit integration
5. [ ] Add Sign in with Apple
6. [ ] Test on physical device via TestFlight
7. [ ] Prepare App Store assets
8. [ ] Submit for review
