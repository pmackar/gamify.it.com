"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Check, Loader2 } from "lucide-react";
import TravelApp from "../../TravelApp";

interface City {
  id: string;
  name: string;
  country: string;
  neighborhoods: Array<{ id: string; name: string }>;
}

interface NewQuestClientProps {
  cities: City[];
}

export default function NewQuestClient({ cities }: NewQuestClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>([]);
  const [selectedNeighborhoodIds, setSelectedNeighborhoodIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [autoPopulate, setAutoPopulate] = useState(true);

  // Get available neighborhoods based on selected cities
  const availableNeighborhoods = cities
    .filter((c) => selectedCityIds.includes(c.id))
    .flatMap((c) => c.neighborhoods.map((n) => ({ ...n, cityName: c.name })));

  const toggleCity = (cityId: string) => {
    setSelectedCityIds((prev) =>
      prev.includes(cityId)
        ? prev.filter((id) => id !== cityId)
        : [...prev, cityId]
    );
    // Remove neighborhoods from deselected city
    if (selectedCityIds.includes(cityId)) {
      const city = cities.find((c) => c.id === cityId);
      if (city) {
        setSelectedNeighborhoodIds((prev) =>
          prev.filter((id) => !city.neighborhoods.some((n) => n.id === id))
        );
      }
    }
  };

  const toggleNeighborhood = (neighborhoodId: string) => {
    setSelectedNeighborhoodIds((prev) =>
      prev.includes(neighborhoodId)
        ? prev.filter((id) => id !== neighborhoodId)
        : [...prev, neighborhoodId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCityIds.length === 0) {
      setError("Please select at least one city");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || generateDefaultName(),
          description: description.trim() || null,
          cityIds: selectedCityIds,
          neighborhoodIds: selectedNeighborhoodIds.length > 0 ? selectedNeighborhoodIds : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          autoPopulate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create quest");
      }

      const data = await response.json();
      router.push(`/travel/quests/${data.quest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  };

  const generateDefaultName = () => {
    const selectedCities = cities.filter((c) => selectedCityIds.includes(c.id));
    if (selectedCities.length === 1) {
      return `${selectedCities[0].name} Trip`;
    } else if (selectedCities.length === 2) {
      return `${selectedCities[0].name} & ${selectedCities[1].name}`;
    } else {
      return `${selectedCities[0].name} + ${selectedCities.length - 1} more`;
    }
  };

  return (
    <TravelApp isLoggedIn={true}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/travel/quests"
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--rpg-muted)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1
              className="text-xl md:text-2xl"
              style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
            >
              New Quest
            </h1>
            <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
              Plan your next adventure
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Error message */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "2px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
              }}
            >
              {error}
            </div>
          )}

          {/* City Selection */}
          <div
            className="rounded-lg p-5 mb-6"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <h2 className="text-base font-medium mb-3" style={{ color: "var(--rpg-text)" }}>
              Cities <span style={{ color: "var(--rpg-muted)" }}>*</span>
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
              Select one or more cities for your quest
            </p>

            {cities.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm mb-3" style={{ color: "var(--rpg-muted)" }}>
                  No cities yet. Add a city first!
                </p>
                <Link
                  href="/travel/cities"
                  className="inline-flex items-center gap-2 text-sm"
                  style={{ color: "var(--rpg-teal)" }}
                >
                  <Plus size={16} />
                  Add City
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => toggleCity(city.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm"
                    style={{
                      background: selectedCityIds.includes(city.id)
                        ? "rgba(95, 191, 138, 0.2)"
                        : "var(--rpg-darker)",
                      border: selectedCityIds.includes(city.id)
                        ? "2px solid var(--rpg-teal)"
                        : "2px solid var(--rpg-border)",
                      color: selectedCityIds.includes(city.id)
                        ? "var(--rpg-teal)"
                        : "var(--rpg-text)",
                    }}
                  >
                    {selectedCityIds.includes(city.id) && <Check size={14} />}
                    <span>{city.name}</span>
                    <span style={{ color: "var(--rpg-muted)" }}>{city.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Neighborhood Selection (if cities selected) */}
          {availableNeighborhoods.length > 0 && (
            <div
              className="rounded-lg p-5 mb-6"
              style={{
                background: "var(--rpg-card)",
                border: "2px solid var(--rpg-border)",
              }}
            >
              <h2 className="text-base font-medium mb-3" style={{ color: "var(--rpg-text)" }}>
                Neighborhoods <span className="text-sm font-normal" style={{ color: "var(--rpg-muted)" }}>(optional)</span>
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
                Focus on specific neighborhoods, or leave empty for the whole city
              </p>
              <div className="flex flex-wrap gap-2">
                {availableNeighborhoods.map((neighborhood) => (
                  <button
                    key={neighborhood.id}
                    type="button"
                    onClick={() => toggleNeighborhood(neighborhood.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm"
                    style={{
                      background: selectedNeighborhoodIds.includes(neighborhood.id)
                        ? "rgba(168, 85, 247, 0.2)"
                        : "var(--rpg-darker)",
                      border: selectedNeighborhoodIds.includes(neighborhood.id)
                        ? "2px solid var(--rpg-purple)"
                        : "2px solid var(--rpg-border)",
                      color: selectedNeighborhoodIds.includes(neighborhood.id)
                        ? "var(--rpg-purple)"
                        : "var(--rpg-text)",
                    }}
                  >
                    {selectedNeighborhoodIds.includes(neighborhood.id) && <Check size={14} />}
                    <span>{neighborhood.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quest Details */}
          <div
            className="rounded-lg p-5 mb-6"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <h2 className="text-base font-medium mb-4" style={{ color: "var(--rpg-text)" }}>
              Details
            </h2>

            {/* Name */}
            <div className="mb-4">
              <label
                htmlFor="name"
                className="block text-sm mb-2"
                style={{ color: "var(--rpg-muted)" }}
              >
                Quest Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedCityIds.length > 0 ? generateDefaultName() : "My Adventure"}
                className="w-full px-4 py-3 rounded-lg text-base"
                style={{
                  background: "var(--rpg-darker)",
                  border: "2px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                  outline: "none",
                }}
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm mb-2"
                style={{ color: "var(--rpg-muted)" }}
              >
                Description <span className="text-xs">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about your trip..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-base resize-none"
                style={{
                  background: "var(--rpg-darker)",
                  border: "2px solid var(--rpg-border)",
                  color: "var(--rpg-text)",
                  outline: "none",
                }}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm mb-2"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-base"
                  style={{
                    background: "var(--rpg-darker)",
                    border: "2px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm mb-2"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-base"
                  style={{
                    background: "var(--rpg-darker)",
                    border: "2px solid var(--rpg-border)",
                    color: "var(--rpg-text)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Auto-populate option */}
          <div
            className="rounded-lg p-5 mb-6"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
            }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPopulate}
                onChange={(e) => setAutoPopulate(e.target.checked)}
                className="mt-1 w-5 h-5 rounded"
                style={{ accentColor: "var(--rpg-teal)" }}
              />
              <div>
                <span className="text-base block" style={{ color: "var(--rpg-text)" }}>
                  Auto-populate from hotlist
                </span>
                <span className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                  Add your hotlisted locations from selected cities to the quest
                </span>
              </div>
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || selectedCityIds.length === 0}
            className="w-full py-4 rounded-lg text-base font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: selectedCityIds.length === 0 ? "var(--rpg-border)" : "var(--rpg-teal)",
              color: selectedCityIds.length === 0 ? "var(--rpg-muted)" : "white",
              opacity: isSubmitting ? 0.7 : 1,
              cursor: selectedCityIds.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Create Quest
              </>
            )}
          </button>
        </form>
      </div>
    </TravelApp>
  );
}
