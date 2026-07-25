import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export default function useLead(id) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState(null);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    setForbidden(false);
    setError(null);
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data.lead);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) setNotFound(true);
      else if (status === 403) setForbidden(true);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return { lead, loading, notFound, forbidden, error, refetch: fetchLead };
}
