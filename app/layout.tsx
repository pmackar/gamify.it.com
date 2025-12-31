import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamify.travel - Turn Your Travels Into Adventure",
  description: "Track your travels, earn XP, unlock achievements, and level up your adventures. A gamified travel companion that makes every journey an epic quest.",
  keywords: ["travel", "gamification", "travel tracker", "achievements", "adventure", "explore"],
  authors: [{ name: "gamify.it" }],
  openGraph: {
    title: "gamify.travel - Turn Your Travels Into Adventure",
    description: "Track your travels, earn XP, unlock achievements, and level up your adventures.",
    type: "website",
    url: "https://gamify.travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "gamify.travel - Turn Your Travels Into Adventure",
    description: "Track your travels, earn XP, unlock achievements, and level up your adventures.",
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
        {children}
      </body>
    </html>
  );
}
