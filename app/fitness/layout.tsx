import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iron Quest | gamify.it.com',
  description: 'Level up your fitness journey. Track workouts, earn XP, unlock achievements.',
};

export default function FitnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
