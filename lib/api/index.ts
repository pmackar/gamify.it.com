/**
 * Shared API utilities
 *
 * Usage:
 * import { withAuth, Errors, validateBody, CommonSchemas } from '@/lib/api';
 */

export * from "./errors";
export * from "./withAuth";
export * from "./validation";

/**
 * Common field selections for Prisma queries
 * Use these to ensure consistent user data across API responses
 */
export const SelectFields = {
  /** Public user fields (safe to expose to other users) */
  userPublic: {
    id: true,
    username: true,
    display_name: true,
    avatar_url: true,
  } as const,

  /** User fields with level (for leaderboards, profiles) */
  userWithLevel: {
    id: true,
    username: true,
    display_name: true,
    avatar_url: true,
    main_level: true,
  } as const,

  /** Full user profile (for own profile view) */
  userFull: {
    id: true,
    email: true,
    username: true,
    display_name: true,
    avatar_url: true,
    main_level: true,
    total_xp: true,
    created_at: true,
  } as const,
};

/**
 * Type for public user data
 */
export interface PublicUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Type for user with level
 */
export interface UserWithLevel extends PublicUser {
  main_level: number;
}
