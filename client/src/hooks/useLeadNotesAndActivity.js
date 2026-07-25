import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

const PAGE_SIZE = 20;

export default function useLeadNotesAndActivity(id) {
  const [notes, setNotes] = useState([]);
  const [notesPage, setNotesPage] = useState(1);
  const [notesTotalPages, setNotesTotalPages] = useState(1);
  const [notesLoading, setNotesLoading] = useState(false);

  const [activities, setActivities] = useState([]);
  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(false);

  const fetchPage = useCallback(
    async (kind, page) => {
      const res = await api.get(`/leads/${id}/${kind}`, {
        params: { page, limit: PAGE_SIZE },
      });
      return res.data;
    },
    [id]
  );

  const refetchAll = useCallback(async () => {
    if (!id) return;
    setNotesLoading(true);
    setActivityLoading(true);
    try {
      const [n, a] = await Promise.all([fetchPage('notes', 1), fetchPage('activity', 1)]);
      setNotes(n.items);
      setNotesPage(1);
      setNotesTotalPages(n.pages);
      setActivities(a.items);
      setActPage(1);
      setActTotalPages(a.pages);
    } catch {
      // errors surface via the individual sections
    } finally {
      setNotesLoading(false);
      setActivityLoading(false);
    }
  }, [id, fetchPage]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  const loadMoreNotes = async () => {
    if (notesLoading || notesPage >= notesTotalPages) return;
    setNotesLoading(true);
    try {
      const next = await fetchPage('notes', notesPage + 1);
      setNotes((prev) => [...prev, ...next.items]);
      setNotesPage(notesPage + 1);
      setNotesTotalPages(next.pages);
    } finally {
      setNotesLoading(false);
    }
  };

  const loadMoreActivity = async () => {
    if (activityLoading || actPage >= actTotalPages) return;
    setActivityLoading(true);
    try {
      const next = await fetchPage('activity', actPage + 1);
      setActivities((prev) => [...prev, ...next.items]);
      setActPage(actPage + 1);
      setActTotalPages(next.pages);
    } finally {
      setActivityLoading(false);
    }
  };

  return {
    notes,
    notesHasMore: notesPage < notesTotalPages,
    notesLoading,
    loadMoreNotes,

    activities,
    activityHasMore: actPage < actTotalPages,
    activityLoading,
    loadMoreActivity,

    refetchAll,
  };
}
