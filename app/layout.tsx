import type { Metadata } from "next";
import { Inter } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Gamify.it - Transform your Reality into Adventure",
  description: "Gamify your daily life with our suite of apps. From fitness to productivity to exploration - level up your everyday activities!",
  keywords: ["gamification", "fitness tracker", "todo app", "productivity", "games", "lifestyle"],
  authors: [{ name: "Gamify.it" }],
  openGraph: {
    title: "Gamify.it - Transform your Reality into Adventure",
    description: "Level up your daily life with gamified apps for fitness, productivity, and exploration.",
    type: "website",
    url: "https://gamify.it.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gamify.it - Transform your Reality into Adventure",
    description: "Level up your daily life with gamified apps for fitness, productivity, and exploration.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className={`${inter.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
