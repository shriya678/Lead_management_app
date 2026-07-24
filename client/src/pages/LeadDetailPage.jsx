import { useParams } from 'react-router-dom';

export default function LeadDetailPage() {
  const { id } = useParams();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Lead detail</h1>
      <p className="mt-2 text-gray-500">
        Lead <span className="font-mono">{id}</span> — real content lands in feature 10.
      </p>
    </div>
  );
}
