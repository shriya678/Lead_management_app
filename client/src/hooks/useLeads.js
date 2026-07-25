import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';

const LIMIT = 20;

export default function useLeads() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page'), 10) || 1;
  const status = searchParams.get('status') || '';
  const assignedTo = searchParams.get('assignedTo') || '';
  const q = searchParams.get('q') || '';

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (status) params.status = status;
      if (assignedTo) params.assignedTo = assignedTo;
      if (q) params.q = q;
      const res = await api.get('/leads', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [page, status, assignedTo, q]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const setPage = (n) => {
    const next = new URLSearchParams(searchParams);
    if (n <= 1) next.delete('page');
    else next.set('page', String(n));
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return {
    items,
    total,
    pages,
    loading,
    error,
    filters: { status, assignedTo, q },
    page,
    limit: LIMIT,
    setFilter,
    setPage,
    refetch: fetchLeads,
    clearFilters,
  };
}
