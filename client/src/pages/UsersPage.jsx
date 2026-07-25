import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/format';
import EmptyState from '../components/EmptyState';
import AddUserModal from '../components/AddUserModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    api
      .get('/users')
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add user
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {error ? (
          <EmptyState
            title="Failed to load users"
            message={error.message}
            action={
              <button
                onClick={fetchUsers}
                className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Retry
              </button>
            }
          />
        ) : loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No users" message="Add your first team member." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
                    Email
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
                    Role
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide">
                    Since
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchUsers}
      />
    </div>
  );
}
