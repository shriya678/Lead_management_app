import { Plus, ArrowRight, UserCheck, MessageSquare, Edit } from 'lucide-react';
import { formatRelative, formatDateTime } from '../lib/format';

const ICONS = {
  created: Plus,
  status_changed: ArrowRight,
  assigned: UserCheck,
  note_added: MessageSquare,
  updated: Edit,
};

function renderCopy(activity, memberMap, currentUserId) {
  const actor = activity.actorId?.name || 'System';
  const meta = activity.meta || {};

  switch (activity.type) {
    case 'created':
      return `Lead created${meta.source ? ` via ${meta.source}` : ''}`;
    case 'status_changed':
      return `${actor} moved status from ${meta.from} to ${meta.to}`;
    case 'assigned': {
      if (meta.to === null || meta.to === undefined) {
        return `${actor} unassigned this lead`;
      }
      const toName = memberMap?.[meta.to]?.name;
      if (toName) return `${actor} assigned to ${toName}`;
      if (String(meta.to) === String(currentUserId)) return `${actor} assigned to you`;
      return `${actor} assigned to a member`;
    }
    case 'note_added':
      return `${actor} added a note`;
    case 'updated':
      return `${actor} updated ${(meta.fields || []).join(', ')}`;
    default:
      return `${actor} did something`;
  }
}

export default function ActivityTimeline({
  activities,
  hasMore,
  loading,
  onLoadMore,
  memberMap,
  currentUserId,
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No activity yet.</p>;
  }

  return (
    <div>
      <ul className="space-y-4">
        {activities.map((a) => {
          const Icon = ICONS[a.type] || Plus;
          return (
            <li key={a.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Icon className="w-3.5 h-3.5 text-indigo-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  {renderCopy(a, memberMap, currentUserId)}
                </p>
                {a.type === 'note_added' && a.meta?.preview && (
                  <p className="text-xs text-gray-500 mt-0.5 italic truncate">
                    &ldquo;{a.meta.preview}&rdquo;
                  </p>
                )}
                <p
                  className="text-xs text-gray-400 mt-0.5"
                  title={formatDateTime(a.createdAt)}
                >
                  {formatRelative(a.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <div className="text-center mt-4">
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
