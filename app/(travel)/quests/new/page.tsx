'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SuggestedLocation {
  id: string;
  name: string;
  description: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  category: string;
  photoUrl: string | null;
  averageRating: number | null;
  distanceKm?: number;
  userSpecific: {
    hotlist: boolean;
    visited: boolean;
    rating: number | null;
  } | null;
}

type AreaMode = 'city' | 'radius';

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    RESTAURANT: '🍽️',
    BAR: '🍺',
    CAFE: '☕',
    MUSEUM: '🏛️',
    PARK: '🌳',
    LANDMARK: '🏛️',
    SHOP: '🛍️',
    ENTERTAINMENT: '🎭',
    NATURE: '🌲',
    BEACH: '🏖️',
    HOTEL: '🏨',
    TRANSIT: '🚇',
    OTHER: '📍',
  };
  return icons[category] || '📍';
}

export default function NewQuestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Area selection
  const [areaMode, setAreaMode] = useState<AreaMode>('city');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [centerLat, setCenterLat] = useState<number | null>(null);
  const [centerLng, setCenterLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);

  // Step 3: Location selection
  const [suggestedLocations, setSuggestedLocations] = useState<SuggestedLocation[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string>>(new Set());
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        includeVisited: false,
        limit: 30,
      };

      if (areaMode === 'city') {
        if (!city.trim()) {
          setError('Please enter a city');
          setLoadingSuggestions(false);
          return;
        }
        body.city = city;
        if (neighborhood.trim()) {
          body.neighborhood = neighborhood;
        }
      } else {
        if (centerLat === null || centerLng === null) {
          setError('Please set a center location');
          setLoadingSuggestions(false);
          return;
        }
        body.centerLat = centerLat;
        body.centerLng = centerLng;
        body.radiusKm = radiusKm;
      }

      const res = await fetch('/api/quests/autopopulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to create quests');
        }
        throw new Error('Failed to fetch suggestions');
      }

      const data = await res.json();
      setSuggestedLocations(data.data);

      // Auto-select all by default
      setSelectedLocationIds(new Set(data.data.map((loc: SuggestedLocation) => loc.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenterLat(position.coords.latitude);
        setCenterLng(position.coords.longitude);
      },
      () => {
        setError('Unable to get your location');
      }
    );
  };

  const toggleLocation = (id: string) => {
    const newSelected = new Set(selectedLocationIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLocationIds(newSelected);
  };

  const selectAll = () => {
    setSelectedLocationIds(new Set(suggestedLocations.map((loc) => loc.id)));
  };

  const selectNone = () => {
    setSelectedLocationIds(new Set());
  };

  const handleCreateQuest = async () => {
    if (!title.trim()) {
      setError('Please enter a quest title');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the quest
      const questBody: Record<string, unknown> = {
        title,
        description: description || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (areaMode === 'city') {
        questBody.city = city;
        questBody.neighborhood = neighborhood || undefined;
      } else {
        questBody.centerLat = centerLat;
        questBody.centerLng = centerLng;
        questBody.radiusKm = radiusKm;
      }

      const questRes = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questBody),
      });

      if (!questRes.ok) {
        throw new Error('Failed to create quest');
      }

      const { data: quest } = await questRes.json();

      // Add selected items
      if (selectedLocationIds.size > 0) {
        const itemsRes = await fetch(`/api/quests/${quest.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationIds: Array.from(selectedLocationIds) }),
        });

        if (!itemsRes.ok) {
          console.error('Failed to add items to quest');
        }
      }

      router.push(`/quests/${quest.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = title.trim().length > 0;
  const canProceedStep2 =
    areaMode === 'city' ? city.trim().length > 0 : centerLat !== null && centerLng !== null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create New Quest</h1>
        <p className="text-gray-400">Plan your adventure by selecting locations to visit</p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-0.5 mx-1 ${
                  step > s ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
        <div className="ml-4 text-sm text-gray-400">
          {step === 1 && 'Basic Info'}
          {step === 2 && 'Select Area'}
          {step === 3 && 'Choose Locations'}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quest Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Philadelphia Food Tour"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this quest about?"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                canProceedStep1
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next: Select Area
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Area Selection */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Area mode tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setAreaMode('city')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                areaMode === 'city'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              By City / Neighborhood
            </button>
            <button
              onClick={() => setAreaMode('radius')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                areaMode === 'radius'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              By Radius
            </button>
          </div>

          {areaMode === 'city' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Philadelphia"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Neighborhood (optional)
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="e.g., Center City"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300">Center Point</span>
                  <button
                    onClick={handleGetCurrentLocation}
                    className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                  >
                    Use My Location
                  </button>
                </div>
                {centerLat !== null && centerLng !== null ? (
                  <p className="text-sm text-green-400">
                    Location set: {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Click "Use My Location" or enter coordinates
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={centerLat ?? ''}
                      onChange={(e) => setCenterLat(parseFloat(e.target.value) || null)}
                      placeholder="39.9526"
                      className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={centerLng ?? ''}
                      onChange={(e) => setCenterLng(parseFloat(e.target.value) || null)}
                      placeholder="-75.1652"
                      className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Radius: {radiusKm} km
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => {
                fetchSuggestions();
                setStep(3);
              }}
              disabled={!canProceedStep2}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                canProceedStep2
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next: Choose Locations
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location Selection */}
      {step === 3 && (
        <div className="space-y-6">
          {loadingSuggestions ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Finding locations from your hotlist...</p>
            </div>
          ) : suggestedLocations.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-medium text-white mb-2">No Hotlisted Locations Found</h3>
              <p className="text-gray-400 mb-4">
                Add some locations to your hotlist first, then come back to create a quest.
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Explore Locations
              </button>
            </div>
          ) : (
            <>
              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <p className="text-gray-400">
                  {selectedLocationIds.size} of {suggestedLocations.length} locations selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={selectNone}
                    className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Location grid */}
              <div className="grid gap-3 max-h-96 overflow-y-auto pr-2">
                {suggestedLocations.map((location) => {
                  const isSelected = selectedLocationIds.has(location.id);
                  return (
                    <button
                      key={location.id}
                      onClick={() => toggleLocation(location.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        isSelected
                          ? 'bg-purple-500/20 border-purple-500/30'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-500'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Photo */}
                      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                        {location.photoUrl ? (
                          <Image
                            src={location.photoUrl}
                            alt={location.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-lg">
                            {getCategoryIcon(location.category)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{location.name}</h4>
                        <p className="text-sm text-gray-400 truncate">
                          {getCategoryIcon(location.category)} {location.city}
                          {location.neighborhood && `, ${location.neighborhood}`}
                          {location.distanceKm !== undefined && (
                            <span className="ml-2">({location.distanceKm.toFixed(1)} km)</span>
                          )}
                        </p>
                      </div>

                      {/* Rating */}
                      {location.averageRating && (
                        <span className="text-sm text-yellow-400">
                          ⭐ {location.averageRating.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-700">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 transition-all"
            >
              Back
            </button>
            <button
              onClick={handleCreateQuest}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                loading
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              {loading ? 'Creating...' : `Create Quest${selectedLocationIds.size > 0 ? ` (${selectedLocationIds.size} locations)` : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
