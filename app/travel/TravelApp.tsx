"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import { Plus, MapPin, Compass, X, ListPlus } from "lucide-react";
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
  const pathname = usePathname();
  const [mode] = useState<"home" | "quest" | "location-search" | "city-search" | "quest-create">("home");
  const [query, setQuery] = useState("");
  const [fabOpen, setFabOpen] = useState(false);

  // Detect if we're on a quest detail page
  const questDetailMatch = pathname?.match(/^\/travel\/quests\/([^\/]+)$/);
  const isOnQuestDetail = !!questDetailMatch && questDetailMatch[1] !== "new";
  const currentQuestId = questDetailMatch?.[1];

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
          {/* FAB Menu Items - Context aware */}
          {fabOpen && (
            <div className="fab-menu">
              {isOnQuestDetail ? (
                <>
                  {/* Quest detail context: Add location to this quest */}
                  <button
                    className="fab-menu-item fab-menu-item-primary"
                    onClick={() => {
                      router.push(`/travel/locations/new?addToQuest=${currentQuestId}`);
                      setFabOpen(false);
                    }}
                  >
                    <ListPlus size={16} />
                    <span>Add Location</span>
                  </button>
                  <button
                    className="fab-menu-item"
                    onClick={() => {
                      router.push(`/travel/quests/${currentQuestId}/suggestions`);
                      setFabOpen(false);
                    }}
                  >
                    <MapPin size={16} />
                    <span>Browse</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Default context */}
                  <button
                    className="fab-menu-item"
                    onClick={() => {
                      router.push("/travel/locations/new");
                      setFabOpen(false);
                    }}
                  >
                    <MapPin size={16} />
                    <span>New Location</span>
                  </button>
                  <button
                    className="fab-menu-item"
                    onClick={() => {
                      router.push("/travel/quests/new");
                      setFabOpen(false);
                    }}
                  >
                    <Compass size={16} />
                    <span>New Quest</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* FAB Button */}
          <button
            className={`fab-button ${fabOpen ? "fab-open" : ""}`}
            onClick={() => setFabOpen(!fabOpen)}
            aria-label={fabOpen ? "Close menu" : "Add new"}
          >
            {fabOpen ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>
      )}

      <style jsx>{`
        .travel-app-container {
          padding-bottom: 120px; /* Space for desktop command bar */
        }

        /* Mobile FAB - only visible on mobile */
        .mobile-fab-container {
          display: none;
        }

        @media (max-width: 1023px) {
          .travel-app-container {
            padding-bottom: 100px; /* Space for mobile FAB */
          }

          .mobile-fab-container {
            display: block;
            position: fixed;
            bottom: max(24px, env(safe-area-inset-bottom, 24px));
            right: 20px;
            z-index: 100;
          }

          .fab-button {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--rpg-teal) 0%, rgba(95, 191, 138, 0.8) 100%);
            border: none;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 3px 12px var(--rpg-teal-glow), 0 2px 6px rgba(0, 0, 0, 0.25);
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
            bottom: 52px;
            right: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
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
            gap: 8px;
            padding: 8px 12px;
            background: var(--rpg-card);
            border: 1px solid var(--rpg-border);
            border-radius: 8px;
            color: var(--rpg-text);
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            white-space: nowrap;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
            transition: all 0.15s ease;
          }

          .fab-menu-item:active {
            transform: scale(0.98);
            background: var(--rpg-border);
          }

          .fab-menu-item-primary {
            background: rgba(95, 191, 138, 0.15);
            border-color: var(--rpg-teal);
          }

          .fab-menu-item-primary:active {
            background: rgba(95, 191, 138, 0.25);
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
