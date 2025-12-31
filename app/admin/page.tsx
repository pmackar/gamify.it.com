import Link from 'next/link';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Fetch stats
  const [flaggedReviews, pendingSuggestions, totalUsers, totalLocations, totalReviews] = await Promise.all([
    prisma.review.count({ where: { status: 'FLAGGED' } }),
    prisma.locationEditSuggestion.count({ where: { status: 'PENDING' } }),
    prisma.user.count(),
    prisma.location.count({ where: { isActive: true } }),
    prisma.review.count({ where: { status: 'APPROVED' } }),
  ]);

  const stats = [
    {
      label: 'Flagged Reviews',
      value: flaggedReviews,
      href: '/admin/reviews?status=FLAGGED',
      color: 'text-red-400',
      urgent: flaggedReviews > 0,
    },
    {
      label: 'Pending Suggestions',
      value: pendingSuggestions,
      href: '/admin/suggestions',
      color: 'text-yellow-400',
      urgent: pendingSuggestions > 0,
    },
    {
      label: 'Total Users',
      value: totalUsers,
      href: '/admin/users',
      color: 'text-blue-400',
    },
    {
      label: 'Total Locations',
      value: totalLocations,
      href: '/admin/locations',
      color: 'text-green-400',
    },
    {
      label: 'Approved Reviews',
      value: totalReviews,
      href: '/admin/reviews',
      color: 'text-purple-400',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`bg-gray-800 border rounded-lg p-6 hover:border-gray-600 transition-colors ${
              stat.urgent ? 'border-red-500/50' : 'border-gray-700'
            }`}
          >
            <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            {stat.urgent && (
              <p className="text-xs text-red-400 mt-2">Requires attention</p>
            )}
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/reviews?status=FLAGGED"
            className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🚩</span>
            <div>
              <p className="font-medium text-white">Review Moderation</p>
              <p className="text-sm text-gray-400">Check flagged content</p>
            </div>
          </Link>
          <Link
            href="/admin/suggestions"
            className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">📝</span>
            <div>
              <p className="font-medium text-white">Edit Suggestions</p>
              <p className="text-sm text-gray-400">Review location changes</p>
            </div>
          </Link>
          <Link
            href="/explore"
            className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="font-medium text-white">View App</p>
              <p className="text-sm text-gray-400">Return to main app</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
