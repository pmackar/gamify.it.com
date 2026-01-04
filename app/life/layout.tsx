import { RetroNavBar } from "@/components/RetroNavBar";
import Link from "next/link";

export default function LifeLayout({ children }: { children: React.ReactNode }) {
  const quickActions = [
    { label: "QUESTS", href: "/life/quests", icon: "📜" },
    { label: "NEW", href: "/life/quests/new", icon: "✨" },
  ];

  return (
    <>
      <RetroNavBar quickActions={quickActions} />
      {children}
    </>
  );
}
