"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MapPin, Check, Sparkles, Loader2, Link2, X, ChevronDown, ChevronUp, Star, Heart, CheckCircle2, Search, Plus } from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import Link from "next/link";

interface City {
  id: string;
  name: string;
  country: string;
}

interface SearchResult {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: { name: string; country: string } | null;
  neighborhood: { name: string } | null;
  visited: boolean;
  hotlist: boolean;
  rating: number | null;
}

interface Quest {
  id: string;
  name: string;
  cities: Array<{ name: string }>;
}

const LOCATION_TYPES = [
  { value: "RESTAURANT", label: "Restaurant", icon: "🍽️" },
  { value: "BAR", label: "Bar", icon: "🍺" },
  { value: "CAFE", label: "Cafe", icon: "☕" },
  { value: "ATTRACTION", label: "Attraction", icon: "🎡" },
  { value: "HOTEL", label: "Hotel", icon: "🏨" },
  { value: "SHOP", label: "Shop", icon: "🛍️" },
  { value: "NATURE", label: "Nature", icon: "🌲" },
  { value: "MUSEUM", label: "Museum", icon: "🏛️" },
  { value: "BEACH", label: "Beach", icon: "🏖️" },
  { value: "NIGHTLIFE", label: "Nightlife", icon: "🌙" },
  { value: "OTHER", label: "Other", icon: "📍" },
];

const TYPE_ICONS: Record<string, string> = {
  RESTAURANT: "🍽️",
  BAR: "🍺",
  CAFE: "☕",
  ATTRACTION: "🎡",
  HOTEL: "🏨",
  SHOP: "🛍️",
  NATURE: "🌲",
  MUSEUM: "🏛️",
  BEACH: "🏖️",
  NIGHTLIFE: "🌙",
  OTHER: "📍",
};

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      { headers: { 'User-Agent': 'GamifyTravel/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function NewLocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToQuestId = searchParams.get("addToQuest");
  const prefillName = searchParams.get("name");

  // Step state: "search" or "create"
  const [step, setStep] = useState<"search" | "create">("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState(prefillName || "");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Google Maps import state
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedData, setImportedData] = useState<{
    name: string;
    address: string;
    coords: { lat: number; lng: number };
    city?: string;
    country?: string;
  } | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  // Cities and quests
  const [cities, setCities] = useState<City[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);

  // Form state (for create step)
  const [name, setName] = useState("");
  const [selectedQuestId, setSelectedQuestId] = useState(addToQuestId || "");
  const [type, setType] = useState("");
  const [cityId, setCityId] = useState("");
  const [newCity, setNewCity] = useState({ name: "", country: "" });
  const [isNewCity, setIsNewCity] = useState(false);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [importedCoords, setImportedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Status options
  const [markVisited, setMarkVisited] = useState(true);
  const [addToHotlist, setAddToHotlist] = useState(false);
  const [initialRating, setInitialRating] = useState<number>(0);

  // Loading/success state
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [success, setSuccess] = useState<{ xpGained: number; leveledUp: boolean; locationId: string; addedToQuest?: boolean } | null>(null);

  // Fetch cities and quests
  useEffect(() => {
    async function fetchData() {
      try {
        const [citiesRes, questsRes] = await Promise.all([
          fetch("/api/cities"),
          fetch("/api/quests?status=PLANNING&status=ACTIVE"),
        ]);
        if (citiesRes.ok) {
          setCities(await citiesRes.json());
        }
        if (questsRes.ok) {
          const data = await questsRes.json();
          setQuests(data.quests || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    }
    fetchData();
  }, []);

  // Search for existing locations
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.locations || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle Google Maps import
  const handleGoogleMapsImport = async () => {
    if (!googleMapsUrl.trim()) return;

    setImportLoading(true);
    setImportError(null);

    try {
      const res = await fetch("/api/parse-google-maps-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: googleMapsUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse URL");
      }

      const { location } = data;

      // Check for duplicate first
      if (location.latitude && location.longitude) {
        const dupRes = await fetch("/api/locations/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            name: location.name,
          }),
        });

        if (dupRes.ok) {
          const dupData = await dupRes.json();
          if (dupData.isDuplicate && dupData.location) {
            // Add to search results
            setSearchResults([{
              id: dupData.location.id,
              name: dupData.location.name,
              type: dupData.location.type,
              address: dupData.location.address,
              city: dupData.location.city,
              neighborhood: null,
              visited: dupData.location.visited,
              hotlist: dupData.location.hotlist,
              rating: dupData.location.rating,
            }]);
            setSearchQuery(location.name || "");
            setGoogleMapsUrl("");
            return;
          }
        }
      }

      // No duplicate - save imported data and update search
      setImportedData({
        name: location.name || "",
        address: location.address || location.name || "",
        coords: { lat: location.latitude, lng: location.longitude },
        city: location.city,
        country: location.country,
      });

      if (location.name) {
        setSearchQuery(location.name);
      }
      setGoogleMapsUrl("");
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import location");
    } finally {
      setImportLoading(false);
    }
  };

  // Go to create form with prefilled data
  const goToCreateForm = () => {
    // Prefill form with search query and imported data
    setName(importedData?.name || searchQuery);
    setAddress(importedData?.address || "");
    if (importedData?.coords) {
      setImportedCoords(importedData.coords);
    }
    if (importedData?.city && importedData?.country) {
      const existingCity = cities.find(
        (c) => c.name.toLowerCase() === importedData.city!.toLowerCase() &&
               c.country.toLowerCase() === importedData.country!.toLowerCase()
      );
      if (existingCity) {
        setCityId(existingCity.id);
        setIsNewCity(false);
      } else {
        setNewCity({ name: importedData.city, country: importedData.country });
        setIsNewCity(true);
      }
    }
    setStep("create");
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeocoding(true);

    try {
      let coords = importedCoords;
      if (!coords) {
        coords = await geocodeAddress(address);
      }
      setGeocoding(false);

      if (!coords) {
        throw new Error("Could not find coordinates for this address. Please check the address and try again.");
      }

      let finalCityId = cityId;

      if (isNewCity && newCity.name && newCity.country) {
        const cityRes = await fetch("/api/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCity.name,
            country: newCity.country,
            latitude: coords.lat,
            longitude: coords.lng,
          }),
        });

        if (!cityRes.ok) {
          throw new Error("Failed to create city");
        }

        const cityData = await cityRes.json();
        finalCityId = cityData.city.id;
      }

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          cityId: finalCityId,
          address,
          latitude: coords.lat,
          longitude: coords.lng,
          description,
          website,
          priceLevel,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          markVisited,
          addToHotlist,
          initialRating: initialRating > 0 ? initialRating : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create location");
      }

      const data = await res.json();
      const locationId = data.location.id;
      let addedToQuest = false;

      const questToAddTo = selectedQuestId || addToQuestId;
      if (questToAddTo) {
        try {
          const questRes = await fetch(`/api/quests/${questToAddTo}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationId }),
          });
          if (questRes.ok) {
            addedToQuest = true;
          }
        } catch (questError) {
          console.error("Error adding location to quest:", questError);
        }
      }

      setSuccess({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        locationId,
        addedToQuest,
      });

      setTimeout(() => {
        if (questToAddTo && addedToQuest) {
          router.push(`/travel/quests/${questToAddTo}`);
        } else {
          router.push(`/travel/locations/${locationId}`);
        }
      }, 2000);
    } catch (error) {
      console.error("Error creating location:", error);
      alert(error instanceof Error ? error.message : "Failed to create location");
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="text-center p-8 rounded-lg"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{ background: 'rgba(95, 191, 138, 0.2)', border: '2px solid var(--rpg-teal)' }}
          >
            <Check className="w-10 h-10" style={{ color: 'var(--rpg-teal)' }} />
          </div>
          <h1 className="text-2xl mb-2" style={{ color: 'var(--rpg-text)' }}>
            {success.addedToQuest ? "Added to Quest!" : "Location Added!"}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4" style={{ color: 'var(--rpg-gold)' }}>
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-semibold">+{success.xpGained} XP</span>
          </div>
          {success.leveledUp && (
            <p className="font-semibold mb-4" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 10px var(--rpg-gold-glow)' }}>
              Level Up!
            </p>
          )}
          <p style={{ color: 'var(--rpg-muted)' }}>Redirecting...</p>
        </div>
      </div>
    );
  }

  // STEP 1: Search screen
  if (step === "search") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={addToQuestId ? `/travel/quests/${addToQuestId}` : "/travel/locations"}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--rpg-muted)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl" style={{ color: 'var(--rpg-text)' }}>
              Add Location
            </h1>
            <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
              Search existing or create new
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--rpg-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location..."
              autoFocus
              className="w-full pl-12 pr-4 py-4 rounded-lg text-base"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                color: 'var(--rpg-text)',
                outline: 'none',
              }}
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin" style={{ color: 'var(--rpg-muted)' }} />
            )}
          </div>
        </div>

        {/* Google Maps Import */}
        <div
          className="p-4 rounded-lg mb-6"
          style={{
            background: 'var(--rpg-card)',
            border: '2px dashed var(--rpg-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Or import from Google Maps</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={googleMapsUrl}
              onChange={(e) => {
                setGoogleMapsUrl(e.target.value);
                setImportError(null);
              }}
              placeholder="Paste Google Maps link..."
              className="rpg-input flex-1 text-sm"
              style={{ padding: '0.5rem 0.75rem' }}
            />
            <button
              type="button"
              onClick={handleGoogleMapsImport}
              disabled={importLoading || !googleMapsUrl.trim()}
              className="rpg-btn"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                opacity: importLoading || !googleMapsUrl.trim() ? 0.5 : 1,
              }}
            >
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Import"}
            </button>
          </div>
          {importError && (
            <p className="mt-2 text-sm" style={{ color: '#ff6b6b' }}>{importError}</p>
          )}
          {importedData && (
            <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--rpg-teal)' }}>
              <Check className="w-4 h-4" />
              <span>Imported: {importedData.name}</span>
              <button onClick={() => setImportedData(null)} className="ml-auto p-1">
                <X className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowHowTo(!showHowTo)}
            className="mt-3 flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--rpg-muted)' }}
          >
            {showHowTo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            How to get a Google Maps link
          </button>
          {showHowTo && (
            <div className="mt-3 p-3 rounded text-xs space-y-2" style={{ background: 'var(--rpg-bg-dark)', border: '1px solid var(--rpg-border)' }}>
              <p className="font-medium" style={{ color: 'var(--rpg-text)' }}>On Mobile:</p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--rpg-muted)' }}>
                <li>Open Google Maps and find the place</li>
                <li>Tap Share → Copy link</li>
                <li>Paste the link above</li>
              </ol>
              <p className="font-medium mt-3" style={{ color: 'var(--rpg-text)' }}>On Desktop:</p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--rpg-muted)' }}>
                <li>Go to maps.google.com</li>
                <li>Search for and click on the place</li>
                <li>Copy URL from address bar</li>
              </ol>
            </div>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--rpg-muted)' }}>
              Existing Locations
            </h3>
            <div className="space-y-2">
              {searchResults.map((location) => (
                <Link
                  key={location.id}
                  href={`/travel/locations/${location.id}`}
                  className="block p-4 rounded-lg transition-all hover:scale-[1.01]"
                  style={{
                    background: 'var(--rpg-card)',
                    border: '2px solid var(--rpg-border)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{TYPE_ICONS[location.type] || "📍"}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate" style={{ color: 'var(--rpg-text)' }}>
                        {location.name}
                      </h4>
                      <p className="text-sm truncate" style={{ color: 'var(--rpg-muted)' }}>
                        {location.city ? `${location.city.name}, ${location.city.country}` : location.address}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {location.visited && (
                          <span className="px-2 py-0.5 text-xs rounded flex items-center gap-1" style={{ background: 'rgba(95, 191, 138, 0.2)', color: 'var(--rpg-teal)' }}>
                            <CheckCircle2 className="w-3 h-3" /> Visited
                          </span>
                        )}
                        {location.hotlist && (
                          <span className="px-2 py-0.5 text-xs rounded flex items-center gap-1" style={{ background: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b' }}>
                            <Heart className="w-3 h-3" style={{ fill: '#ff6b6b' }} /> Hotlist
                          </span>
                        )}
                        {location.rating && (
                          <span className="px-2 py-0.5 text-xs rounded flex items-center gap-1" style={{ background: 'rgba(255, 215, 0, 0.2)', color: 'var(--rpg-gold)' }}>
                            <Star className="w-3 h-3" style={{ fill: 'var(--rpg-gold)' }} /> {location.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180 flex-shrink-0" style={{ color: 'var(--rpg-muted)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Create New Location Button */}
        <button
          onClick={goToCreateForm}
          className="w-full p-4 rounded-lg flex items-center justify-center gap-3 transition-all"
          style={{
            background: 'rgba(95, 191, 138, 0.1)',
            border: '2px dashed var(--rpg-teal)',
            color: 'var(--rpg-teal)',
          }}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">
            {searchQuery || importedData ? `Create "${importedData?.name || searchQuery}" as new location` : "Create New Location"}
          </span>
        </button>
      </div>
    );
  }

  // STEP 2: Create form
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => setStep("search")}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--rpg-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl" style={{ color: 'var(--rpg-text)' }}>
            Create New Location
          </h1>
          <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
            Fill in the details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Add to Quest */}
        {quests.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
              Add to Quest <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>(optional)</span>
            </label>
            <select
              value={selectedQuestId}
              onChange={(e) => setSelectedQuestId(e.target.value)}
              className="rpg-input w-full"
            >
              <option value="">Don&apos;t add to a quest</option>
              {quests.map((quest) => (
                <option key={quest.id} value={quest.id}>
                  {quest.name} {quest.cities.length > 0 && `(${quest.cities.map(c => c.name).join(", ")})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location Name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
            Location Name <span style={{ color: 'var(--rpg-teal)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Coffee House"
            required
            className="rpg-input w-full"
          />
        </div>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
            Type <span style={{ color: 'var(--rpg-teal)' }}>*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LOCATION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="px-3 py-3 rounded-lg text-sm transition-all flex flex-col items-center gap-1"
                style={{
                  background: type === t.value ? 'var(--rpg-teal)' : 'var(--rpg-card)',
                  border: `2px solid ${type === t.value ? 'var(--rpg-teal)' : 'var(--rpg-border)'}`,
                  color: type === t.value ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
                  boxShadow: type === t.value ? '0 0 10px var(--rpg-teal-glow)' : 'none',
                }}
              >
                <span className="text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
            Address <span style={{ color: 'var(--rpg-teal)' }}>*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Philadelphia, PA 19103"
            required
            className="rpg-input w-full"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--rpg-muted)' }}>
            {importedCoords ? "Coordinates imported - address is for display" : "Full address for accurate location"}
          </p>
        </div>

        {/* City Selection */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
            City <span style={{ color: 'var(--rpg-teal)' }}>*</span>
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewCity(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: !isNewCity ? 'var(--rpg-teal)' : 'var(--rpg-card)',
                  border: `2px solid ${!isNewCity ? 'var(--rpg-teal)' : 'var(--rpg-border)'}`,
                  color: !isNewCity ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
                }}
              >
                Existing City
              </button>
              <button
                type="button"
                onClick={() => setIsNewCity(true)}
                className="flex-1 px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: isNewCity ? 'var(--rpg-teal)' : 'var(--rpg-card)',
                  border: `2px solid ${isNewCity ? 'var(--rpg-teal)' : 'var(--rpg-border)'}`,
                  color: isNewCity ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
                }}
              >
                New City
              </button>
            </div>

            {isNewCity ? (
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newCity.name}
                  onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                  placeholder="City name"
                  required={isNewCity}
                  className="rpg-input"
                />
                <input
                  type="text"
                  value={newCity.country}
                  onChange={(e) => setNewCity({ ...newCity, country: e.target.value })}
                  placeholder="Country"
                  required={isNewCity}
                  className="rpg-input"
                />
              </div>
            ) : (
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                required={!isNewCity}
                className="rpg-input w-full"
              >
                <option value="">Select a city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}, {city.country}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Status Options */}
        <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}>
          <h3 className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Status</h3>

          <button
            type="button"
            onClick={() => { setMarkVisited(!markVisited); if (markVisited) setInitialRating(0); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{
              background: markVisited ? 'rgba(95, 191, 138, 0.2)' : 'var(--rpg-bg-dark)',
              border: `2px solid ${markVisited ? 'var(--rpg-teal)' : 'var(--rpg-border)'}`,
            }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: markVisited ? 'var(--rpg-teal)' : 'var(--rpg-muted)' }} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Mark as Visited</p>
              <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>I&apos;ve been to this place</p>
            </div>
            <div className="w-10 h-6 rounded-full relative" style={{ background: markVisited ? 'var(--rpg-teal)' : 'var(--rpg-border)' }}>
              <div className="w-4 h-4 rounded-full absolute top-1" style={{ background: 'white', left: markVisited ? '22px' : '4px' }} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAddToHotlist(!addToHotlist)}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{
              background: addToHotlist ? 'rgba(255, 107, 107, 0.2)' : 'var(--rpg-bg-dark)',
              border: `2px solid ${addToHotlist ? '#ff6b6b' : 'var(--rpg-border)'}`,
            }}
          >
            <Heart className="w-5 h-5" style={{ color: addToHotlist ? '#ff6b6b' : 'var(--rpg-muted)', fill: addToHotlist ? '#ff6b6b' : 'none' }} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Add to Hotlist</p>
              <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Save to your favorites</p>
            </div>
            <div className="w-10 h-6 rounded-full relative" style={{ background: addToHotlist ? '#ff6b6b' : 'var(--rpg-border)' }}>
              <div className="w-4 h-4 rounded-full absolute top-1" style={{ background: 'white', left: addToHotlist ? '22px' : '4px' }} />
            </div>
          </button>

          <div className="p-3 rounded-lg" style={{ background: 'var(--rpg-bg-dark)', border: '2px solid var(--rpg-border)', opacity: markVisited ? 1 : 0.5 }}>
            <div className="flex items-center gap-3 mb-3">
              <Star className="w-5 h-5" style={{ color: markVisited && initialRating > 0 ? 'var(--rpg-gold)' : 'var(--rpg-muted)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Initial Rating</p>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>{markVisited ? 'Rate this place (optional)' : 'Mark as visited to rate'}</p>
              </div>
            </div>
            <StarRating value={initialRating} onChange={setInitialRating} disabled={!markVisited} />
          </div>
        </div>

        {/* Optional Fields */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--rpg-text)' }}>Optional Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Description / Notes</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Your notes about this place..." rows={3} className="rpg-input w-full resize-none" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="rpg-input w-full" />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Price Level</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button key={level} type="button" onClick={() => setPriceLevel(priceLevel === level ? null : level)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: priceLevel === level ? 'var(--rpg-gold)' : 'var(--rpg-bg-dark)', border: `2px solid ${priceLevel === level ? 'var(--rpg-gold)' : 'var(--rpg-border)'}`, color: priceLevel === level ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)' }}>
                    {"$".repeat(level)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Tags</label>
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="romantic, outdoor, family-friendly" className="rpg-input w-full" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country))}
          className="rpg-btn w-full py-3 flex items-center justify-center gap-2"
          style={{ opacity: loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country)) ? 0.5 : 1 }}
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />{geocoding ? "Finding location..." : "Creating..."}</>
          ) : (
            <><MapPin className="w-5 h-5" />Add Location</>
          )}
        </button>
      </form>
    </div>
  );
}
