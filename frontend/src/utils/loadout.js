import {
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList
} from '@shared/loadout-data.js';

export function resolveLabel(id, list, lang) {
  if (!id) return '';
  const cleanId = id.trim().toLowerCase();
  const match = list.find((item) => item.id === cleanId);
  if (match) {
    return lang === 'he' ? match.he : match.en;
  }
  return id.trim();
}

export function parseCommaList(str, list, prefix, type, lang) {
  if (!str) return [];
  return str
    .split(',')
    .map((id) => {
      const cleanId = id.trim();
      if (!cleanId) return null;
      return {
        id: `${prefix}-${cleanId}`,
        label: resolveLabel(cleanId, list, lang),
        type,
      };
    })
    .filter(Boolean);
}

export function parseWeaponry(user, lang) {
  const items = [];
  if (!user) return items;

  const parts = user.weaponry ? user.weaponry.split(';') : [];
  const primaryId = parts[0] ? parts[0].trim() : '';
  if (primaryId) {
    items.push({
      id: `wpn-${primaryId}`,
      label: resolveLabel(primaryId, primaryWeaponsList, lang),
      type: 'PRIMARY',
    });
  }

  const secondaryIds = parts[1] ? parts[1].split(',') : [];
  secondaryIds.forEach((id) => {
    const cleanId = id.trim();
    if (cleanId) {
      items.push({
        id: `wpn-${cleanId}`,
        label: resolveLabel(cleanId, secondaryWeaponsList, lang),
        type: 'SECONDARY',
      });
    }
  });

  if (user.optics) {
    items.push(...parseCommaList(user.optics, opticsList, 'opt', 'OPTIC', lang));
  }

  if (user.accessories) {
    items.push(...parseCommaList(user.accessories, accessoriesList, 'acc', 'ACCESSORY', lang));
  }

  return items;
}

export function computeChecklistStatus(items, statusMap) {
  return items.some((item) => statusMap[item.id] === false);
}

export function formatWeaponryLabel(wpnStr, lang) {
  if (!wpnStr) return '';
  const parts = wpnStr.split(';');
  const primaryId = parts[0] ? parts[0].trim() : '';
  const secondaryIds = parts[1] ? parts[1].split(',') : [];

  const primaryLabel = resolveLabel(primaryId, primaryWeaponsList, lang);

  if (secondaryIds.length === 0) {
    return primaryLabel.toUpperCase();
  }

  const secondaryLabels = secondaryIds
    .map((id) => resolveLabel(id, secondaryWeaponsList, lang))
    .filter(Boolean);

  return `${primaryLabel} + ${secondaryLabels.join(' + ')}`.toUpperCase();
}

export function formatCommaLabel(str, list, lang) {
  if (!str) return '';
  return str
    .split(',')
    .map((id) => resolveLabel(id, list, lang))
    .filter(Boolean)
    .join(' + ')
    .toUpperCase();
}
