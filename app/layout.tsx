import type { Metadata } from "next";
import "./globals.css";
import { RetroNavBar } from "@/components/RetroNavBar";
import { AchievementProvider } from "@/components/AchievementPopup";
import { NavBarProvider } from "@/components/NavBarContext";

export const metadata: Metadata = {
  title: "gamify.it.com - Life's Not a Game, But It Should Be",
  description: "Gamify your life with XP, achievements, and quests. Track fitness, tasks, travel, and more. Turn everyday accomplishments into epic adventures.",
  keywords: ["gamification", "life tracking", "achievements", "XP", "fitness", "productivity", "travel"],
  authors: [{ name: "gamify.it" }],
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <NavBarProvider>
          <AchievementProvider>
            <RetroNavBar />
            {children}
          </AchievementProvider>
        </NavBarProvider>
      </body>
    </html>
  );
}
