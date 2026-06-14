import { useState, useEffect, useCallback } from 'react';

export function useRotations() {
  const [rotations, setRotations] = useState([]);
  const [currentRotation, setCurrentRotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRotations = useCallback(async () => {
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch current rotation
      const currentRes = await fetch('/api/rotations/current', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!currentRes.ok) throw new Error('Failed to fetch current rotation');
      const currentData = await currentRes.json();
      setCurrentRotation(currentData);

      // Fetch list of rotations (default range ±30 days)
      const listRes = await fetch('/api/rotations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listRes.ok) throw new Error('Failed to fetch rotations list');
      const listData = await listRes.json();
      setRotations(listData);
    } catch (err) {
      console.error('[useRotations] Error fetching rotations:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const currentRes = await fetch('/api/rotations/current', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const currentData = currentRes.ok ? await currentRes.json() : null;

        const listRes = await fetch('/api/rotations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const listData = listRes.ok ? await listRes.json() : [];

        if (isMounted) {
          setCurrentRotation(currentData);
          setRotations(listData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    rotations,
    currentRotation,
    loading,
    error,
    refresh: fetchRotations,
  };
}
