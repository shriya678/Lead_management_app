import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

const CLASSES = {
  new: 'bg-gray-100 text-gray-700 border-gray-200',
  contacted: 'bg-blue-100 text-blue-700 border-blue-200',
  qualified: 'bg-amber-100 text-amber-700 border-amber-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-rose-100 text-rose-700 border-rose-200',
};

export default function StatusSelect({ lead, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(lead.status);

  const handleChange = async (e) => {
    const next = e.target.value;
    const prev = value;
    setValue(next);
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}`, { status: next });
      toast.success('Status updated');
      onChanged?.();
    } catch (err) {
      setValue(prev);
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const cls = CLASSES[value] || CLASSES.new;

  return (
    <select
      value={value}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      className={`text-xs font-medium rounded border px-2 py-1 cursor-pointer disabled:opacity-50 ${cls}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
