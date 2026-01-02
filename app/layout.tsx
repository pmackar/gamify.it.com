import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RetroNavBar } from "@/components/RetroNavBar";
import { AchievementProvider } from "@/components/AchievementPopup";
import { NavBarProvider } from "@/components/NavBarContext";
import { XPProvider } from "@/components/XPContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import AppSwitcher from "@/components/AppSwitcher";

// Inline script to prevent FOUC (flash of unstyled content)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('gamify_theme');
    var theme = stored || 'system';
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "gamify.it.com - Life's Not a Game, But It Should Be",
  description: "Gamify your life with XP, achievements, and quests. Track fitness, tasks, travel, and more. Turn everyday accomplishments into epic adventures.",
  keywords: ["gamification", "life tracking", "achievements", "XP", "fitness", "productivity", "travel"],
  authors: [{ name: "gamify.it" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gamify",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "gamify.it.com - Life's Not a Game, But It Should Be",
    description: "Gamify your life with XP, achievements, and quests. Turn everyday accomplishments into epic adventures.",
    type: "website",
    url: "https://gamify.it.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "gamify.it.com - Life's Not a Game, But It Should Be",
    description: "Gamify your life with XP, achievements, and quests. Turn everyday accomplishments into epic adventures.",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <NavBarProvider>
            <XPProvider>
              <AchievementProvider>
                <RetroNavBar />
                <AppSwitcher />
                {children}
              </AchievementProvider>
            </XPProvider>
          </NavBarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
