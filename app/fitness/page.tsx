import { getUser } from "@/lib/auth";
import FitnessLandingPage from "@/components/FitnessLandingPage";
import FitnessApp from "./FitnessApp";

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

  // Show new redesigned landing page
  return <FitnessLandingPage />;
}
