import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      level?: number;
      xp?: number;
      xpToNext?: number;
      currentStreak?: number;
    } & DefaultSession["user"];
  }
}
