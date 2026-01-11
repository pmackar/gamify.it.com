import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: "#FF6B6B",
};

export const metadata: Metadata = {
  title: 'Reptura - Fitness RPG',
  description: 'Every Rep is an Adventure. Track workouts, earn XP, level up your strength.',
  manifest: '/reptura-manifest.json',
  applicationName: 'Reptura',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Reptura',
  },
  icons: {
    icon: [
      { url: '/reptura-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/reptura-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/reptura-icon-192.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Reptura - Fitness RPG',
    description: 'Every Rep is an Adventure. Track workouts, earn XP, level up your strength.',
    type: 'website',
  },
};

export default function FitnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
