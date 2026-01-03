"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { Plus, MapPin, Compass, X } from "lucide-react";
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
  const [fabOpen, setFabOpen] = useState(false);

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
    <div className="travel-app-container">
      {/* Page content */}
      {children}

      {/* Command bar - desktop only (hidden on mobile via CSS) */}
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

      {/* Mobile FAB - only show for logged in users */}
      {isLoggedIn && (
        <div className="mobile-fab-container">
          {/* FAB Menu Items */}
          {fabOpen && (
            <div className="fab-menu">
              <button
                className="fab-menu-item"
                onClick={() => {
                  router.push("/travel/locations/new");
                  setFabOpen(false);
                }}
              >
                <MapPin size={20} />
                <span>Log Visit</span>
                <span className="fab-xp">+15 XP</span>
              </button>
              <button
                className="fab-menu-item"
                onClick={() => {
                  router.push("/travel/quests/new");
                  setFabOpen(false);
                }}
              >
                <Compass size={20} />
                <span>New Quest</span>
              </button>
            </div>
          )}

          {/* FAB Button */}
          <button
            className={`fab-button ${fabOpen ? "fab-open" : ""}`}
            onClick={() => setFabOpen(!fabOpen)}
            aria-label={fabOpen ? "Close menu" : "Add new"}
          >
            {fabOpen ? <X size={24} /> : <Plus size={24} />}
          </button>
        </div>
      )}

      <style jsx>{`
        .travel-app-container {
          padding-bottom: 24px;
        }

        /* Mobile FAB - only visible on mobile */
        .mobile-fab-container {
          display: none;
        }

        @media (max-width: 1023px) {
          .travel-app-container {
            padding-bottom: 100px;
          }

          .mobile-fab-container {
            display: block;
            position: fixed;
            bottom: max(24px, env(safe-area-inset-bottom, 24px));
            right: 20px;
            z-index: 100;
          }

          .fab-button {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, var(--rpg-teal) 0%, rgba(95, 191, 138, 0.8) 100%);
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 20px var(--rpg-teal-glow), 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
          }

          .fab-button:active {
            transform: scale(0.95);
          }

          .fab-button.fab-open {
            background: var(--rpg-card);
            border: 2px solid var(--rpg-border);
            color: var(--rpg-muted);
            transform: rotate(45deg);
          }

          .fab-menu {
            position: absolute;
            bottom: 68px;
            right: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: fab-menu-in 0.2s ease;
          }

          @keyframes fab-menu-in {
            from {
              opacity: 0;
              transform: translateY(10px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .fab-menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: var(--rpg-card);
            border: 2px solid var(--rpg-border);
            border-radius: 12px;
            color: var(--rpg-text);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.15s ease;
          }

          .fab-menu-item:active {
            transform: scale(0.98);
            background: var(--rpg-border);
          }

          .fab-xp {
            margin-left: auto;
            font-size: 12px;
            color: var(--rpg-gold);
          }
        }
      `}</style>
    </div>
  );
}
