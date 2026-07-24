import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 underline">
        Go home
      </Link>
    </div>
  );
}
