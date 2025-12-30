import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gamify.it - Turn the Mundane into Fun",
  description: "Gamify your daily life with our suite of apps. From fitness to productivity to exploration - level up your everyday activities!",
  keywords: ["gamification", "fitness tracker", "todo app", "productivity", "games", "lifestyle"],
  authors: [{ name: "Gamify.it" }],
  openGraph: {
    title: "Gamify.it - Turn the Mundane into Fun",
    description: "Level up your daily life with gamified apps for fitness, productivity, and exploration.",
    type: "website",
    url: "https://gamify.it.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gamify.it - Turn the Mundane into Fun",
    description: "Level up your daily life with gamified apps for fitness, productivity, and exploration.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
