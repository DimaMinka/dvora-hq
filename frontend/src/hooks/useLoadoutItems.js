import { useMemo, useCallback } from 'react';
import { parseWeaponry, parseCommaList } from '../utils/loadout.js';
import { gearsList, medsList } from '@shared/loadout-data.js';

export function useLoadoutItems(user, lang, statusMap = {}, onToggleChecklist) {
  const { weaponStatus = {}, medicalStatus = {}, gearStatus = {} } = statusMap;

  const weaponItems = useMemo(() => {
    return parseWeaponry(user, lang);
  }, [user, lang]);

  const medItems = useMemo(() => {
    if (!user || !user.meds) return [];
    return parseCommaList(user.meds, medsList, 'med', 'MEDICAL', lang);
  }, [user, lang]);

  const gearItems = useMemo(() => {
    if (!user || !user.gear) return [];
    return parseCommaList(user.gear, gearsList, 'gear', 'GEAR', lang);
  }, [user, lang]);

  const handleToggleItem = useCallback((category, itemId) => {
    if (!onToggleChecklist) return;

    let nextStatusMap;
    let allItems;

    if (category === 'wpn') {
      const nextStatus = weaponStatus[itemId] === false ? true : false;
      nextStatusMap = { ...weaponStatus, [itemId]: nextStatus };
      allItems = weaponItems;
    } else if (category === 'med') {
      const nextStatus = medicalStatus[itemId] === false ? true : false;
      nextStatusMap = { ...medicalStatus, [itemId]: nextStatus };
      allItems = medItems;
    } else if (category === 'gear') {
      const nextStatus = gearStatus[itemId] === false ? true : false;
      nextStatusMap = { ...gearStatus, [itemId]: nextStatus };
      allItems = gearItems;
    } else {
      return;
    }

    const hasIssue = allItems.some((item) => nextStatusMap[item.id] === false);
    onToggleChecklist(category, hasIssue ? 2 : 1, nextStatusMap);
  }, [onToggleChecklist, weaponStatus, medicalStatus, gearStatus, weaponItems, medItems, gearItems]);

  return { weaponItems, medItems, gearItems, handleToggleItem };
}
