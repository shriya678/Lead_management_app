import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function NoteForm({ leadId, onCreated }) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await api.post(`/leads/${leadId}/notes`, { body: trimmed });
      setBody('');
      toast.success('Note added');
      onCreated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note…"
        maxLength={5000}
        rows={3}
        disabled={submitting}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 resize-y"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{body.length}/5000</span>
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Posting…' : 'Post note'}
        </button>
      </div>
    </form>
  );
}
