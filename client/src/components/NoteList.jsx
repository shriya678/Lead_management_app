import { formatRelative, formatDateTime } from '../lib/format';

export default function NoteList({ notes, hasMore, loading, onLoadMore }) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No notes yet. Be the first to add one.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {notes.map((n) => (
          <li key={n.id} className="py-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium text-gray-700">
                {n.authorId?.name || 'Unknown'}
              </span>
              <span title={formatDateTime(n.createdAt)}>
                {formatRelative(n.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.body}</p>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="text-center mt-3">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
