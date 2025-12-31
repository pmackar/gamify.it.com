"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Check, Sparkles, Search } from "lucide-react";
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

export default function NewLocationPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ xpGained: number; leveledUp: boolean } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [cityId, setCityId] = useState("");
  const [newCity, setNewCity] = useState({ name: "", country: "" });
  const [isNewCity, setIsNewCity] = useState(false);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [tags, setTags] = useState("");

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

  // Get current location
  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please enter coordinates manually.");
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalCityId = cityId;

      // Create new city if needed
      if (isNewCity && newCity.name && newCity.country) {
        const cityRes = await fetch("/api/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCity.name,
            country: newCity.country,
            latitude: parseFloat(latitude) || undefined,
            longitude: parseFloat(longitude) || undefined,
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
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
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
        router.push(`/locations/${data.location.id}`);
      }, 2000);
    } catch (error) {
      console.error("Error creating location:", error);
      alert(error instanceof Error ? error.message : "Failed to create location");
    } finally {
      setLoading(false);
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
          href="/locations"
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

        {/* Coordinates */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">
              Coordinates *
            </label>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300"
            >
              <MapPin className="w-4 h-4" />
              Use current location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude"
              required
              className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude"
              required
              className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Optional Fields */}
        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Optional Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

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
          disabled={loading || !name || !type || (!cityId && (!newCity.name || !newCity.country)) || !latitude || !longitude}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
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
