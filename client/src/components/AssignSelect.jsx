import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

function extractId(assignedTo) {
  if (!assignedTo) return '';
  if (typeof assignedTo === 'string') return assignedTo;
  return assignedTo._id || assignedTo.id || '';
}

export default function AssignSelect({ lead, members, onChanged }) {
  const [saving, setSaving] = useState(false);
  const currentId = extractId(lead.assignedTo);

  const handleChange = async (e) => {
    const next = e.target.value === '' ? null : e.target.value;
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}/assign`, { assignedTo: next });
      toast.success(next ? 'Lead assigned' : 'Lead unassigned');
      onChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={currentId}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      className="text-xs rounded border border-gray-300 px-2 py-1 bg-white cursor-pointer disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
