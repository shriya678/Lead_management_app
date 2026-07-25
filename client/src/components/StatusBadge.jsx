const CLASSES = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-rose-100 text-rose-700',
};

export default function StatusBadge({ status }) {
  const cls = CLASSES[status] || CLASSES.new;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${cls}`}>
      {status}
    </span>
  );
}
