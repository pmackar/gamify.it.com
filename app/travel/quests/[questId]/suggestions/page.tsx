import { getUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import SuggestionsClient from "./SuggestionsClient";

interface PageProps {
  params: Promise<{ questId: string }>;
}

async function getSuggestions(questId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/quests/${questId}/suggestions`,
    {
      cache: "no-store",
      headers: {
        Cookie: "", // Will be set by the caller
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    if (response.status === 403) return null;
    throw new Error("Failed to fetch suggestions");
  }

  return response.json();
}

export default async function SuggestionsPage({ params }: PageProps) {
  const { questId } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // We'll fetch suggestions client-side for now since we need auth cookies
  return <SuggestionsClient questId={questId} />;
}
