import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-8">
      <div className="text-8xl mb-6 font-bold text-amber-500">404</div>
      <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
      <p className="text-gray-400 mb-8 max-w-md text-center">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
        >
          Go Home
        </Link>
        <Link
          href="/travel"
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          Explore Travel
        </Link>
      </div>
    </div>
  );
}
