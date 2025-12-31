import { auth } from '@clerk/nextjs/server';
import prisma from './prisma';

export async function getCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();

  // Check if user has admin role in Clerk metadata
  const { sessionClaims } = await auth();
  const isAdmin = (sessionClaims?.metadata as { role?: string })?.role === 'admin';

  if (!isAdmin) {
    throw new Error('Admin access required');
  }

  return user;
}
