import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Admin header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-xl font-bold text-white">
                Admin Dashboard
              </Link>
              <nav className="flex items-center gap-4">
                <Link
                  href="/admin/reviews"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Reviews
                </Link>
                <Link
                  href="/admin/suggestions"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Edit Suggestions
                </Link>
              </nav>
            </div>
            <Link
              href="/explore"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Admin content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
