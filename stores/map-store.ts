import { create } from 'zustand';
import { LocationCategory } from '@/types';

interface MapFilters {
  category?: LocationCategory;
  showHotlistOnly?: boolean;
  showVisitedOnly?: boolean;
  showUnvisitedOnly?: boolean;
}

interface MapState {
  // Map state
  center: [number, number]; // [lng, lat]
  zoom: number;
  bounds: [[number, number], [number, number]] | null; // [[sw_lng, sw_lat], [ne_lng, ne_lat]]

  // Selection
  selectedLocationId: string | null;
  hoveredLocationId: string | null;

  // Filters
  filters: MapFilters;

  // UI state
  isMapLoaded: boolean;
  isSidebarOpen: boolean;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBounds: (bounds: [[number, number], [number, number]] | null) => void;
  selectLocation: (id: string | null) => void;
  hoverLocation: (id: string | null) => void;
  setFilters: (filters: MapFilters) => void;
  clearFilters: () => void;
  setMapLoaded: (loaded: boolean) => void;
  toggleSidebar: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

// Philadelphia center as default
const DEFAULT_CENTER: [number, number] = [-75.1652, 39.9526];
const DEFAULT_ZOOM = 12;

export const useMapStore = create<MapState>((set, get) => ({
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  bounds: null,
  selectedLocationId: null,
  hoveredLocationId: null,
  filters: {},
  isMapLoaded: false,
  isSidebarOpen: true,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBounds: (bounds) => set({ bounds }),
  selectLocation: (id) => set({ selectedLocationId: id }),
  hoverLocation: (id) => set({ hoveredLocationId: id }),
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  clearFilters: () => set({ filters: {} }),
  setMapLoaded: (loaded) => set({ isMapLoaded: loaded }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  flyTo: (center, zoom) => set({ center, ...(zoom !== undefined && { zoom }) }),
}));
