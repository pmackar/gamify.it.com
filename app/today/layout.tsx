import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Day Quest | gamify.it.com',
  description: 'Gamify your tasks and level up your productivity. Earn XP, unlock achievements, build streaks.',
};

export default function TodayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
