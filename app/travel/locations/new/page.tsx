"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Check, Sparkles, Loader2, Link2, X, ChevronDown, ChevronUp, Star, Heart, CheckCircle2 } from "lucide-react";
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
  const [success, setSuccess] = useState<{ xpGained: number; leveledUp: boolean; locationId: string } | null>(null);

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
  const [showHowTo, setShowHowTo] = useState(false);

  // Status options (set on creation)
  const [markVisited, setMarkVisited] = useState(true);
  const [addToHotlist, setAddToHotlist] = useState(false);
  const [initialRating, setInitialRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);

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

      // Create location with status options
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
          // Status options
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
      setSuccess({
        xpGained: data.xpGained,
        leveledUp: data.leveledUp,
        locationId: data.location.id,
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
          <h1 className="text-2xl mb-2" style={{ color: 'var(--rpg-text)' }}>Location Added!</h1>
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

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/travel/locations"
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--rpg-muted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl" style={{ color: 'var(--rpg-text)' }}>Add New Location</h1>
          <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>Log a place you've visited</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Google Maps Import */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'var(--rpg-card)',
            border: '2px dashed var(--rpg-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Import from Google Maps</span>
            <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>(optional)</span>
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
                cursor: importLoading || !googleMapsUrl.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {importLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </span>
              ) : (
                "Import"
              )}
            </button>
          </div>

          {importError && (
            <p className="mt-2 text-sm" style={{ color: '#ff6b6b' }}>{importError}</p>
          )}

          {importedCoords && (
            <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--rpg-teal)' }}>
              <Check className="w-4 h-4" />
              <span>Location imported successfully</span>
              <button
                type="button"
                onClick={clearImportedCoords}
                className="ml-auto p-1 rounded hover:opacity-70"
              >
                <X className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
              </button>
            </div>
          )}

          {/* How To Section */}
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
            <div
              className="mt-3 p-3 rounded text-xs space-y-2"
              style={{ background: 'var(--rpg-bg-dark)', border: '1px solid var(--rpg-border)' }}
            >
              <p className="font-medium" style={{ color: 'var(--rpg-text)' }}>On Mobile (Google Maps App):</p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--rpg-muted)' }}>
                <li>Open Google Maps and find the place</li>
                <li>Tap on the place name to open details</li>
                <li>Tap <strong>Share</strong> → <strong>Copy link</strong></li>
                <li>Paste the link above</li>
              </ol>

              <p className="font-medium mt-3" style={{ color: 'var(--rpg-text)' }}>On Desktop (Browser):</p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--rpg-muted)' }}>
                <li>Go to <a href="https://maps.google.com" target="_blank" rel="noopener" className="underline" style={{ color: 'var(--rpg-teal)' }}>maps.google.com</a></li>
                <li>Search for and click on the place</li>
                <li>Copy the URL from your browser's address bar</li>
                <li>Paste the link above</li>
              </ol>

              <p className="mt-3" style={{ color: 'var(--rpg-muted)' }}>
                <strong style={{ color: 'var(--rpg-text)' }}>Supported formats:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--rpg-muted)' }}>
                <li><code className="px-1 rounded" style={{ background: 'var(--rpg-border)' }}>maps.app.goo.gl/...</code> (share links)</li>
                <li><code className="px-1 rounded" style={{ background: 'var(--rpg-border)' }}>google.com/maps/place/...</code> (full URLs)</li>
              </ul>
            </div>
          )}
        </div>

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
            {importedCoords
              ? "Coordinates imported from Google Maps - address is for display only"
              : "Full address including city and country for accurate location"
            }
          </p>
        </div>

        {/* City Selection */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
            City <span style={{ color: 'var(--rpg-teal)' }}>*</span>
          </label>
          <div className="space-y-3">
            {/* Toggle */}
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
        <div
          className="p-4 rounded-lg space-y-4"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
          }}
        >
          <h3 className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Status</h3>

          {/* Visited Toggle */}
          <button
            type="button"
            onClick={() => {
              const newValue = !markVisited;
              setMarkVisited(newValue);
              if (!newValue) {
                setInitialRating(0);
                setHoverRating(0);
              }
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{
              background: markVisited ? 'rgba(95, 191, 138, 0.2)' : 'var(--rpg-bg-dark)',
              border: `2px solid ${markVisited ? 'var(--rpg-teal)' : 'var(--rpg-border)'}`,
            }}
          >
            <CheckCircle2
              className="w-5 h-5"
              style={{ color: markVisited ? 'var(--rpg-teal)' : 'var(--rpg-muted)' }}
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Mark as Visited</p>
              <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>I've been to this place</p>
            </div>
            <div
              className="w-10 h-6 rounded-full relative transition-colors"
              style={{ background: markVisited ? 'var(--rpg-teal)' : 'var(--rpg-border)' }}
            >
              <div
                className="w-4 h-4 rounded-full absolute top-1 transition-all"
                style={{
                  background: 'white',
                  left: markVisited ? '22px' : '4px',
                }}
              />
            </div>
          </button>

          {/* Hotlist Toggle */}
          <button
            type="button"
            onClick={() => setAddToHotlist(!addToHotlist)}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition-all"
            style={{
              background: addToHotlist ? 'rgba(255, 107, 107, 0.2)' : 'var(--rpg-bg-dark)',
              border: `2px solid ${addToHotlist ? '#ff6b6b' : 'var(--rpg-border)'}`,
            }}
          >
            <Heart
              className="w-5 h-5"
              style={{ color: addToHotlist ? '#ff6b6b' : 'var(--rpg-muted)', fill: addToHotlist ? '#ff6b6b' : 'none' }}
            />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Add to Hotlist</p>
              <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Save to your favorites</p>
            </div>
            <div
              className="w-10 h-6 rounded-full relative transition-colors"
              style={{ background: addToHotlist ? '#ff6b6b' : 'var(--rpg-border)' }}
            >
              <div
                className="w-4 h-4 rounded-full absolute top-1 transition-all"
                style={{
                  background: 'white',
                  left: addToHotlist ? '22px' : '4px',
                }}
              />
            </div>
          </button>

          {/* Rating - only enabled if visited */}
          <div
            className="p-3 rounded-lg transition-opacity"
            style={{
              background: 'var(--rpg-bg-dark)',
              border: '2px solid var(--rpg-border)',
              opacity: markVisited ? 1 : 0.5,
            }}
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5" style={{ color: markVisited && initialRating > 0 ? 'var(--rpg-gold)' : 'var(--rpg-muted)' }} />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>Initial Rating</p>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                  {markVisited ? 'Rate this place (optional)' : 'Mark as visited to rate'}
                </p>
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={!markVisited}
                  onClick={() => setInitialRating(initialRating === star ? 0 : star)}
                  onMouseEnter={() => markVisited && setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform"
                  style={{ cursor: markVisited ? 'pointer' : 'not-allowed' }}
                >
                  <Star
                    className="w-8 h-8"
                    style={{
                      color: markVisited && (hoverRating || initialRating) >= star ? 'var(--rpg-gold)' : 'var(--rpg-border)',
                      fill: markVisited && (hoverRating || initialRating) >= star ? 'var(--rpg-gold)' : 'none',
                    }}
                  />
                </button>
              ))}
              {initialRating > 0 && markVisited && (
                <button
                  type="button"
                  onClick={() => setInitialRating(0)}
                  className="ml-2 px-2 text-xs rounded"
                  style={{ color: 'var(--rpg-muted)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Optional Fields */}
        <div
          className="p-4 rounded-lg"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
          }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--rpg-text)' }}>Optional Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Description / Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Your notes about this place..."
                rows={3}
                className="rpg-input w-full resize-none"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="rpg-input w-full"
              />
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Price Level</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriceLevel(priceLevel === level ? null : level)}
                    className="flex-1 py-2 rounded-lg text-sm transition-all"
                    style={{
                      background: priceLevel === level ? 'var(--rpg-gold)' : 'var(--rpg-bg-dark)',
                      border: `2px solid ${priceLevel === level ? 'var(--rpg-gold)' : 'var(--rpg-border)'}`,
                      color: priceLevel === level ? 'var(--rpg-bg-dark)' : 'var(--rpg-text)',
                    }}
                  >
                    {"$".repeat(level)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="romantic, outdoor, family-friendly (comma separated)"
                className="rpg-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country))}
          className="rpg-btn w-full py-3 flex items-center justify-center gap-2"
          style={{
            opacity: loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country)) ? 0.5 : 1,
            cursor: loading || !name || !type || !address || (!cityId && (!newCity.name || !newCity.country)) ? 'not-allowed' : 'pointer',
          }}
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
