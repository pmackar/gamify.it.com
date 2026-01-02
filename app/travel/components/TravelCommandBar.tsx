"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type: "navigate" | "action" | "search-result" | "create";
  data?: Record<string, unknown>;
}

interface TravelCommandBarProps {
  mode: "home" | "quest" | "location-search" | "city-search" | "quest-create";
  commands: Command[];
  onCommand: (command: Command) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  query?: string;
}

export default function TravelCommandBar({
  mode,
  commands,
  onCommand,
  onQueryChange,
  placeholder = "What do you want to do?",
  query: externalQuery,
}: TravelCommandBarProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = onQueryChange || setInternalQuery;

  // Filter commands based on query
  const filteredCommands = query.trim()
    ? commands.filter(
        (cmd) =>
          cmd.title.toLowerCase().includes(query.toLowerCase()) ||
          cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // Scroll selected item into view
  useEffect(() => {
    if (suggestionsRef.current && isFocused) {
      const selected = suggestionsRef.current.querySelector(".selected");
      if (selected) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, isFocused]);

  // Global keyboard handler for 'n' to focus
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in another input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 'n' to focus command bar
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredCommands.length - 1)
        );
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onCommand(filteredCommands[selectedIndex]);
          setQuery("");
          inputRef.current?.blur();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        inputRef.current?.blur();
      }
    },
    [filteredCommands, selectedIndex, onCommand, setQuery]
  );

  const handleSuggestionClick = (cmd: Command) => {
    onCommand(cmd);
    setQuery("");
    inputRef.current?.blur();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        background: "var(--rpg-card)",
        borderTop: "2px solid var(--rpg-border)",
      }}
    >
      {/* Suggestions */}
      {isFocused && filteredCommands.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 overflow-y-auto"
          style={{
            maxHeight: "280px",
            background: "var(--rpg-card)",
            borderTop: "2px solid var(--rpg-border)",
            borderLeft: "2px solid var(--rpg-border)",
            borderRight: "2px solid var(--rpg-border)",
            borderRadius: "8px 8px 0 0",
          }}
        >
          {filteredCommands.map((cmd, index) => (
            <div
              key={cmd.id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                index === selectedIndex ? "selected" : ""
              }`}
              style={{
                background:
                  index === selectedIndex
                    ? "rgba(95, 191, 138, 0.15)"
                    : "transparent",
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                handleSuggestionClick(cmd);
              }}
            >
              {cmd.icon && (
                <span className="text-xl w-8 h-8 flex items-center justify-center">
                  {cmd.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-base truncate"
                  style={{ color: "var(--rpg-text)" }}
                >
                  {cmd.title}
                </div>
                {cmd.subtitle && (
                  <div
                    className="text-sm truncate"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    {cmd.subtitle}
                  </div>
                )}
              </div>
              {cmd.type === "create" && (
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: "rgba(95, 191, 138, 0.2)",
                    color: "var(--rpg-teal)",
                  }}
                >
                  Create
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pt-3 pb-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click handlers to fire
            setTimeout(() => setIsFocused(false), 150);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="w-full px-4 py-3 rounded-lg text-base"
          style={{
            background: "var(--rpg-darker)",
            border: "2px solid var(--rpg-border)",
            color: "var(--rpg-text)",
            outline: "none",
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = "var(--rpg-teal)";
            (e.target as HTMLInputElement).style.boxShadow =
              "0 0 0 3px rgba(95, 191, 138, 0.2)";
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor =
              "var(--rpg-border)";
            (e.target as HTMLInputElement).style.boxShadow = "none";
          }}
        />
        {/* Keyboard hint */}
        {!isFocused && (
          <div
            className="text-center mt-2 text-xs"
            style={{ color: "var(--rpg-muted)" }}
          >
            Press <kbd className="px-1.5 py-0.5 rounded" style={{ background: "var(--rpg-border)" }}>N</kbd> to open
          </div>
        )}
      </div>
    </div>
  );
}
