import { useState, useCallback } from 'react';

export function useChecklistPanel() {
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = useCallback((panelName) => {
    setActivePanel(panelName);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  return { activePanel, openPanel, closePanel };
}
