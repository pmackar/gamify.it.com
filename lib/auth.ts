import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;

        // Fetch additional user data
        const userData = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            level: true,
            xp: true,
            xpToNext: true,
            currentStreak: true,
          },
        });

        if (userData) {
          session.user.level = userData.level;
          session.user.xp = userData.xp;
          session.user.xpToNext = userData.xpToNext;
          session.user.currentStreak = userData.currentStreak;
        }
      }
      return session;
    },
  },
};

// Helper to get user from session (for server components)
import { getServerSession } from "next-auth";

export async function getUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
