"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import TravelCommandBar, { Command } from "./components/TravelCommandBar";

// Home mode commands
const HOME_COMMANDS: Command[] = [
  {
    id: "new-quest",
    title: "New Quest",
    subtitle: "Plan a trip",
    icon: "🗺️",
    type: "action",
  },
  {
    id: "new-location",
    title: "Add Location",
    subtitle: "Log a place",
    icon: "📍",
    type: "navigate",
  },
  {
    id: "quests",
    title: "My Quests",
    subtitle: "View trips",
    icon: "📋",
    type: "navigate",
  },
  {
    id: "cities",
    title: "Cities",
    subtitle: "Browse cities",
    icon: "🏙️",
    type: "navigate",
  },
  {
    id: "locations",
    title: "Locations",
    subtitle: "All places",
    icon: "🗃️",
    type: "navigate",
  },
  {
    id: "map",
    title: "Map",
    subtitle: "World view",
    icon: "🌍",
    type: "navigate",
  },
  {
    id: "hotlist",
    title: "Hotlist",
    subtitle: "Saved places",
    icon: "❤️",
    type: "navigate",
  },
  {
    id: "achievements",
    title: "Achievements",
    subtitle: "View badges",
    icon: "🏆",
    type: "navigate",
  },
];

interface TravelAppProps {
  children: React.ReactNode;
  isLoggedIn: boolean;
}

export default function TravelApp({ children, isLoggedIn }: TravelAppProps) {
  const router = useRouter();
  const [mode] = useState<"home" | "quest" | "location-search" | "city-search" | "quest-create">("home");
  const [query, setQuery] = useState("");

  // Get commands based on current mode
  const getCommands = useCallback((): Command[] => {
    if (mode === "home") {
      return HOME_COMMANDS;
    }
    return HOME_COMMANDS;
  }, [mode]);

  // Handle command execution
  const handleCommand = useCallback(
    (command: Command) => {
      switch (command.id) {
        case "new-quest":
          router.push("/travel/quests/new");
          break;
        case "new-location":
          router.push("/travel/locations/new");
          break;
        case "quests":
          router.push("/travel/quests");
          break;
        case "cities":
          router.push("/travel/cities");
          break;
        case "locations":
          router.push("/travel/locations");
          break;
        case "map":
          router.push("/travel/map");
          break;
        case "hotlist":
          router.push("/travel/hotlist");
          break;
        case "achievements":
          router.push("/travel/achievements");
          break;
        default:
          console.log("Unknown command:", command.id);
      }
    },
    [router]
  );

  // Get placeholder based on mode
  const getPlaceholder = useCallback(() => {
    switch (mode) {
      case "quest":
        return "Search locations to add...";
      case "location-search":
        return "Search locations...";
      case "city-search":
        return "Search cities...";
      case "quest-create":
        return "Select a city for your quest...";
      default:
        return "What do you want to do?";
    }
  }, [mode]);

  return (
    <div className="pb-24">
      {/* Page content */}
      {children}

      {/* Command bar - only show for logged in users */}
      {isLoggedIn && (
        <TravelCommandBar
          mode={mode}
          commands={getCommands()}
          onCommand={handleCommand}
          onQueryChange={setQuery}
          query={query}
          placeholder={getPlaceholder()}
        />
      )}
    </div>
  );
}
