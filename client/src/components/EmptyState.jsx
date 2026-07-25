export default function EmptyState({ title, message, action }) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
