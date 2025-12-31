import { Location, UserLocationData, Review, Quest, QuestItem, User, LocationCategory } from '@prisma/client';

// Re-export Prisma types
export type { Location, UserLocationData, Review, Quest, QuestItem, User, LocationCategory };
export { LocationCategory as LocationCategoryEnum } from '@prisma/client';

// Location with user-specific data
export type LocationWithUserData = Location & {
  userSpecific?: UserLocationData | null;
  createdBy?: Pick<User, 'id' | 'username' | 'avatarUrl'>;
};

// Location with reviews
export type LocationWithReviews = Location & {
  reviews: (Review & {
    author: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  })[];
};

// Location list item (for browse/search)
export type LocationListItem = Pick<
  Location,
  | 'id'
  | 'name'
  | 'description'
  | 'city'
  | 'state'
  | 'category'
  | 'latitude'
  | 'longitude'
  | 'photoUrl'
  | 'averageRating'
  | 'totalVisits'
  | 'totalReviews'
> & {
  userSpecific?: Pick<UserLocationData, 'hotlist' | 'visited' | 'rating'> | null;
  distanceKm?: number;
};

// Create location input
export interface CreateLocationInput {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  category: LocationCategory;
  tags?: string[];
  googlePlaceId?: string;
  photoUrl?: string;
  website?: string;
  phone?: string;
}

// Update location input
export interface UpdateLocationInput extends Partial<CreateLocationInput> {}

// Location search params
export interface LocationSearchParams {
  city?: string;
  state?: string;
  category?: LocationCategory;
  query?: string;
  limit?: number;
  offset?: number;
}

// Nearby search params
export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: LocationCategory;
  limit?: number;
}

// Quest with items
export type QuestWithItems = Quest & {
  items: (QuestItem & {
    location: LocationListItem;
  })[];
};

// User profile (public view)
export type UserProfile = Pick<User, 'id' | 'username' | 'avatarUrl' | 'bio' | 'totalXp' | 'level' | 'createdAt'> & {
  visitedCount: number;
  reviewCount: number;
  questCount: number;
};

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
