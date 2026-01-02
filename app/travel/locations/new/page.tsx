"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Check, Sparkles, Loader2, Link2, X } from "lucide-react";
import Link from "next/link";

interface City {
  id: string;
  name: string;
  country: string;
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

// Geocode address using Nominatim (OpenStreetMap)
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
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [success, setSuccess] = useState<{ xpGained: number; leveledUp: boolean } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [cityId, setCityId] = useState("");
  const [newCity, setNewCity] = useState({ name: "", country: "" });
  const [isNewCity, setIsNewCity] = useState(false);
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [tags, setTags] = useState("");

  // Google Maps import state
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCoords, setImportedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch existing cities
  useEffect(() => {
    async function fetchCities() {
      try {
        const res = await fetch("/api/cities");
        if (res.ok) {
          const data = await res.json();
          setCities(data);
        }
      } catch (error) {
        console.error("Failed to fetch cities:", error);
      }
    }
    fetchCities();
  }, []);

  // Import from Google Maps URL
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

      // Auto-fill form fields
      if (location.name) {
        setName(location.name);
      }
      if (location.address) {
        setAddress(location.address);
      } else if (location.name) {
        // Use name as address hint if no explicit address
        setAddress(location.name);
      }
      if (location.latitude && location.longitude) {
        setImportedCoords({ lat: location.latitude, lng: location.longitude });
      }

      // Clear the URL field after successful import
      setGoogleMapsUrl("");
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import location");
    } finally {
      setImportLoading(false);
    }
  };

  const clearImportedCoords = () => {
    setImportedCoords(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeocoding(true);

    try {
      // Use imported coordinates if available, otherwise geocode
      let coords = importedCoords;
      if (!coords) {
        coords = await geocodeAddress(address);
      }
      setGeocoding(false);

      if (!coords) {
        throw new Error("Could not find coordinates for this address. Please check the address and try again.");
      }

      let finalCityId = cityId;

      // Create new city if needed
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

      // Create location
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
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create location");
      }

      const data = await res.json();
      setSuccess({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
      });

      // Redirect after showing success
      setTimeout(() => {
        router.push(`/travel/locations/${data.location.id}`);
      }, 2000);
    } catch (error) {
      console.error("Error creating location:", error);
      alert(error instanceof Error ? error.message : "Failed to create location");
    } finally {
      setLoading(false);
      setGeocoding(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Location Added!</h1>
          <div className="flex items-center justify-center gap-2 text-cyan-400 mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="text-lg font-semibold">+{success.xpGained} XP</span>
          </div>
          {success.leveledUp && (
            <p className="text-yellow-400 font-semibold mb-4">Level Up!</p>
          )}
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/travel/locations"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add New Location</h1>
          <p className="text-gray-400">Log a place you've visited</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Google Maps Import */}
        <div className="p-4 rounded-lg border border-dashed border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-gray-300">Import from Google Maps</span>
            <span className="text-xs text-gray-500">(optional)</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={googleMapsUrl}
              onChange={(e) => {
                setGoogleMapsUrl(e.target.value);
                setImportError(null);
              }}
              placeholder="Paste Google Maps link here..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={handleGoogleMapsImport}
              disabled={importLoading || !googleMapsUrl.trim()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </button>
          </div>
          {importError && (
            <p className="mt-2 text-sm text-red-400">{importError}</p>
          )}
          {importedCoords && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
              <Check className="w-4 h-4" />
              <span>Location imported ({importedCoords.lat.toFixed(4)}, {importedCoords.lng.toFixed(4)})</span>
              <button
                type="button"
                onClick={clearImportedCoords}
                className="ml-auto p-1 hover:bg-gray-800 rounded"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Copy a place link from Google Maps app or website to auto-fill the form
          </p>
        </div>

        {/* Location Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Location Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., The Coffee House"
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Location Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Type *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {LOCATION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors flex flex-col items-center gap-1 ${
                  type === t.value
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Address *
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Philadelphia, PA 19103"
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Full address including city and country for accurate location
          </p>
        </div>

        {/* City Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            City *
          </label>
          <div className="space-y-3">
            {/* Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNewCity(false)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  !isNewCity
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400"
                }`}
              >
                Existing City
              </button>
              <button
                type="button"
                onClick={() => setIsNewCity(true)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isNewCity
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-900 border border-gray-800 text-gray-400"
                }`}
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
                  className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  value={newCity.country}
                  onChange={(e) => setNewCity({ ...newCity, country: e.target.value })}
                  placeholder="Country"
                  required={isNewCity}
                  className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            ) : (
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                required={!isNewCity}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
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

        {/* Optional Fields */}
        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Optional Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notes about this place..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Price Level</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriceLevel(priceLevel === level ? null : level)}
                    className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                      priceLevel === level
                        ? "bg-cyan-500 text-white"
                        : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {"$".repeat(level)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="romantic, outdoor, family-friendly (comma separated)"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country))}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              {geocoding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding location...
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              )}
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              Add Location
            </>
          )}
        </button>
      </form>
    </div>
  );
}
