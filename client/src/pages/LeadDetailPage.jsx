import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import useLead from '../hooks/useLead';
import useLeadNotesAndActivity from '../hooks/useLeadNotesAndActivity';
import StatusSelect from '../components/StatusSelect';
import AssignSelect from '../components/AssignSelect';
import NoteForm from '../components/NoteForm';
import NoteList from '../components/NoteList';
import ActivityTimeline from '../components/ActivityTimeline';
import EmptyState from '../components/EmptyState';
import EditLeadModal from '../components/EditLeadModal';
import { formatDate } from '../lib/format';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const { lead, loading, notFound, forbidden, error, refetch: refetchLead } = useLead(id);
  const {
    notes,
    notesHasMore,
    notesLoading,
    loadMoreNotes,
    activities,
    activityHasMore,
    activityLoading,
    loadMoreActivity,
    refetchAll,
  } = useLeadNotesAndActivity(id);

  const [members, setMembers] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get('/users')
      .then((res) => setMembers(res.data.users.filter((u) => u.role === 'member')))
      .catch(() => {});
  }, [isAdmin]);

  const memberMap = members.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {});

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/leads');
  };

  const handleLeadChanged = () => {
    refetchLead();
    refetchAll();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 bg-gray-100 rounded w-32 animate-pulse mb-4" />
        <div className="h-32 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (notFound || forbidden) {
    return (
      <div className="p-6">
        <EmptyState
          title={notFound ? 'Lead not found' : 'Access denied'}
          message={
            notFound
              ? "This lead doesn't exist or has been deleted."
              : "You don't have access to this lead."
          }
          action={
            <button
              onClick={() => navigate('/leads')}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Back to leads
            </button>
          }
        />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-6">
        <EmptyState
          title="Failed to load lead"
          message={error?.message}
          action={
            <button
              onClick={refetchLead}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to leads
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{lead.name}</h1>
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 flex-shrink-0"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p>
                <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline">
                  {lead.email}
                </a>
                {lead.phone && <span> · {lead.phone}</span>}
              </p>
              {(lead.company || lead.source) && (
                <p>
                  {lead.company || '—'} · <span className="capitalize">{lead.source}</span>
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                Created {formatDate(lead.createdAt)}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                <StatusSelect lead={lead} onChanged={handleLeadChanged} />
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Assigned
                  </span>
                  <AssignSelect
                    lead={lead}
                    members={members}
                    onChanged={handleLeadChanged}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Assigned
                  </span>
                  <span className="text-sm text-gray-700">
                    {lead.assignedTo?.name || '—'}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">
              Notes
            </h2>
            <NoteForm leadId={lead.id} onCreated={refetchAll} />
            <NoteList
              notes={notes}
              hasMore={notesHasMore}
              loading={notesLoading}
              onLoadMore={loadMoreNotes}
            />
          </section>
        </div>

        <div>
          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">
              Activity
            </h2>
            <ActivityTimeline
              activities={activities}
              hasMore={activityHasMore}
              loading={activityLoading}
              onLoadMore={loadMoreActivity}
              memberMap={memberMap}
              currentUserId={user?.id}
            />
          </section>
        </div>
      </div>

      <EditLeadModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lead={lead}
        isAdmin={isAdmin}
        onSaved={handleLeadChanged}
      />
    </div>
  );
}
