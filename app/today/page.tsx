import { getUser } from "@/lib/auth";
import AppLandingPage from "@/components/AppLandingPage";
import TodayApp from "./TodayApp";
import { CheckSquare, Zap, FolderKanban, Flame } from "lucide-react";

const FEATURES = [
  {
    icon: <CheckSquare size={28} />,
    title: "Tasks = Quests",
    description: "Every task completion earns XP and levels up your character",
  },
  {
    icon: <Zap size={28} />,
    title: "Difficulty Tiers",
    description: "Harder tasks = bigger rewards, from trivial to legendary",
  },
  {
    icon: <FolderKanban size={28} />,
    title: "Projects & Categories",
    description: "Organize your life with projects and color-coded categories",
  },
  {
    icon: <Flame size={28} />,
    title: "Daily Streaks",
    description: "Build habits and multiply your XP with streak bonuses",
  },
];

interface PageProps {
  searchParams: Promise<{ try?: string }>;
}

export default async function TodayPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tryMode = params.try === "true";
  const user = await getUser();

  // Show app if authenticated OR in try mode
  if (user || tryMode) {
    return <TodayApp />;
  }

  // Show landing page for non-authenticated users
  return (
    <AppLandingPage
      appId="today"
      appName="Day Quest"
      tagline="Gamify Your Daily Tasks"
      description="Turn your to-do list into a quest log. Complete tasks, earn XP, and watch your productivity level soar."
      color="#5CC9F5"
      colorGlow="rgba(92, 201, 245, 0.3)"
      icon={<CheckSquare size={64} strokeWidth={1.5} />}
      features={FEATURES}
      tryPath="/today?try=true"
    />
  );
}
