import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reptura | gamify.it.com',
  description: 'Every Rep is part of an Adventure. Track workouts, earn XP, unlock achievements.',
};

export default function FitnessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
