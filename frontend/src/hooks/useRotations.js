import { useState, useEffect, useCallback } from 'react';
import { registerSquads } from '../constants/squadColors.js';

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

      // Register all unique squads
      const squadsToRegister = [];
      if (currentData?.squads) {
        if (currentData.squads.alert) squadsToRegister.push(currentData.squads.alert);
        if (currentData.squads.standby) squadsToRegister.push(currentData.squads.standby);
        if (currentData.squads.rest) squadsToRegister.push(currentData.squads.rest);
      }
      listData.forEach((r) => {
        if (r.squads) {
          if (r.squads.alert) squadsToRegister.push(r.squads.alert);
          if (r.squads.standby) squadsToRegister.push(r.squads.standby);
          if (r.squads.rest) squadsToRegister.push(r.squads.rest);
        }
      });
      registerSquads(squadsToRegister);
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

    const loadData = async (showLoading = false) => {
      if (showLoading) setLoading(true);
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

          // Register all unique squads
          const squadsToRegister = [];
          if (currentData?.squads) {
            if (currentData.squads.alert) squadsToRegister.push(currentData.squads.alert);
            if (currentData.squads.standby) squadsToRegister.push(currentData.squads.standby);
            if (currentData.squads.rest) squadsToRegister.push(currentData.squads.rest);
          }
          listData.forEach((r) => {
            if (r.squads) {
              if (r.squads.alert) squadsToRegister.push(r.squads.alert);
              if (r.squads.standby) squadsToRegister.push(r.squads.standby);
              if (r.squads.rest) squadsToRegister.push(r.squads.rest);
            }
          });
          registerSquads(squadsToRegister);
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

    loadData(true);

    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
