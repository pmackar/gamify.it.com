import { getUser } from "@/lib/auth";
import AppLandingPage from "@/components/AppLandingPage";
import FitnessApp from "./FitnessApp";
import { Dumbbell, Target, Trophy, ListChecks } from "lucide-react";

const FEATURES = [
  {
    icon: <Dumbbell size={28} />,
    title: "Track Every Rep",
    description: "Log exercises, sets, weights, and reps with a streamlined interface",
  },
  {
    icon: <Target size={28} />,
    title: "Earn XP",
    description: "Every workout contributes to your level progression",
  },
  {
    icon: <Trophy size={28} />,
    title: "Unlock Achievements",
    description: "Hit milestones and earn badges from Common to Legendary",
  },
  {
    icon: <ListChecks size={28} />,
    title: "Build Templates",
    description: "Create custom workout routines and track personal records",
  },
];

interface PageProps {
  searchParams: Promise<{ try?: string }>;
}

export default async function FitnessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tryMode = params.try === "true";
  const user = await getUser();

  // Show app if authenticated OR in try mode
  if (user || tryMode) {
    return <FitnessApp />;
  }

  // Show landing page for non-authenticated users
  return (
    <AppLandingPage
      appId="fitness"
      appName="Iron Quest"
      tagline="Level Up Your Fitness Journey"
      description="Transform every workout into an adventure. Track exercises, earn XP, and unlock achievements as you build your strongest self."
      color="#FF6B6B"
      colorGlow="rgba(255, 107, 107, 0.3)"
      icon={<Dumbbell size={64} strokeWidth={1.5} />}
      features={FEATURES}
      tryPath="/fitness?try=true"
    />
  );
}
