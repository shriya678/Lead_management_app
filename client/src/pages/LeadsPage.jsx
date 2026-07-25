import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import useLeads from '../hooks/useLeads';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import StatusSelect from '../components/StatusSelect';
import AssignSelect from '../components/AssignSelect';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const selectClass =
  'text-sm rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export default function LeadsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    items,
    total,
    pages,
    loading,
    error,
    filters,
    page,
    limit,
    setFilter,
    setPage,
    refetch,
    clearFilters,
  } = useLeads();

  const [members, setMembers] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.q);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get('/users')
      .then((res) => setMembers(res.data.users.filter((u) => u.role === 'member')))
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setSearchInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    if (searchInput === filters.q) return;
    const t = setTimeout(() => setFilter('q', searchInput), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await api.delete(`/leads/${lead.id}`);
      toast.success('Lead deleted');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const hasFilters = filters.status || filters.assignedTo || filters.q;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
        <span className="text-sm text-gray-500">
          {isAdmin ? 'All leads' : 'Assigned to you'}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilter('assignedTo', e.target.value)}
            className={selectClass}
          >
            <option value="">All assignments</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`${selectClass} pl-9 w-full`}
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {error ? (
          <EmptyState
            title="Failed to load leads"
            message={error.message}
            action={
              <button
                onClick={refetch}
                className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            }
          />
        ) : loading ? (
          <SkeletonTable />
        ) : items.length === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No leads match your filters"
              action={
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No leads yet"
              message="Share your public capture form to start collecting leads."
              action={
                <a
                  href="/submit"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Open capture form
                </a>
              }
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Company</Th>
                    <Th>Status</Th>
                    <Th>Assigned</Th>
                    <Th>Created</Th>
                    {isAdmin && <Th className="w-12"></Th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <Td className="font-medium text-gray-900">{lead.name}</Td>
                      <Td className="text-gray-600">{lead.email}</Td>
                      <Td className="text-gray-600">{lead.company || '—'}</Td>
                      <Td>
                        <StatusSelect lead={lead} onChanged={refetch} />
                      </Td>
                      <Td>
                        {isAdmin ? (
                          <AssignSelect
                            lead={lead}
                            members={members}
                            onChanged={refetch}
                          />
                        ) : (
                          <span className="text-gray-600">
                            {lead.assignedTo?.name || '—'}
                          </span>
                        )}
                      </Td>
                      <Td className="text-gray-500">{formatDate(lead.createdAt)}</Td>
                      {isAdmin && (
                        <Td>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(lead);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            aria-label="Delete lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={pages}
              total={total}
              limit={limit}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function SkeletonTable() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}
