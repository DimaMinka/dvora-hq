import argon2 from 'argon2';
import { config } from '../config.js';

// Setup admin lists
const adminString = config.telegramAdminUsernames || '';
export const adminUsernames = adminString
  .split(',')
  .map((name) => name.trim().toLowerCase().replace(/^@/, ''));

export function isAdmin(ctx) {
  const username = ctx.from?.username?.toLowerCase();
  return username && adminUsernames.includes(username);
}

export async function isCommanderOrAdmin(ctx) {
  if (isAdmin(ctx)) return true;
  const username = ctx.from?.username;
  if (!username) return false;
  
  try {
    const { getDb } = await import('../db.js');
    const db = getDb();
    const cleaned = username.toLowerCase().replace(/^@/, '');
    const snapshot = await db
      .collection('users')
      .where('tg_username', 'in', [cleaned, `@${cleaned}`])
      .where('role', '==', 'commander')
      .get();
    return !snapshot.empty;
  } catch (err) {
    console.error('[Helper] Error checking commander role:', err.message);
    return false;
  }
}


// Helper to generate a secure PIN: 5 digits + 1 uppercase letter
export function generateTacticalPin() {
  const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `${digits}${letter}`;
}

export async function hashPin(pin) {
  return argon2.hash(pin, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

// Helper: Get unique squads from existing users in the db
export async function getSquads(db) {
  const snapshot = await db.collection('users').select('squad_id').get();
  const squads = new Set();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.squad_id) {
      squads.add(data.squad_id.toUpperCase());
    }
  });
  return Array.from(squads).sort();
}

// Helper: Build inline keyboard with squads
export function buildSquadKeyboard(
  squads,
  { addNew = false, disabledList = [], skipBtn = false } = {}
) {
  const rows = [];
  const squadButtons = squads.map((squad) => {
    const isDisabled = disabledList.includes(squad);
    const label = isDisabled ? `🔒 ${squad}` : squad;
    const callbackData = isDisabled ? 'noop' : `squad:${squad}`;
    return { text: label, callback_data: callbackData };
  });

  for (let i = 0; i < squadButtons.length; i += 2) {
    rows.push(squadButtons.slice(i, i + 2));
  }

  const controlRow = [];
  if (addNew) {
    controlRow.push({ text: '➕ New Squad', callback_data: 'squad:__new__' });
  }
  if (skipBtn) {
    controlRow.push({ text: '⏩ Skip', callback_data: 'skip_rest' });
  }
  controlRow.push({ text: '❌ Cancel', callback_data: 'cancel' });
  rows.push(controlRow);

  return { inline_keyboard: rows };
}

// Date helpers
export function parseDate(str) {
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const currentYear = new Date().getFullYear();
  if (year < currentYear - 1 || year > currentYear + 1) return null;

  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day)
    return null;
  return date;
}

export function getWeekRange(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day; // Align to Sunday
  const sundayStart = new Date(tempDate.setDate(diff));
  sundayStart.setHours(0, 0, 0, 0);

  const saturdayEnd = new Date(sundayStart);
  saturdayEnd.setDate(sundayStart.getDate() + 6);
  saturdayEnd.setHours(23, 59, 59, 999);

  return { monday: sundayStart, sunday: saturdayEnd };
}

export function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(str) {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

export const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const EN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatWeekRangeEN(monday, sunday) {
  const mMonth = monday.getMonth();
  const sMonth = sunday.getMonth();

  if (mMonth === sMonth) {
    return `${monday.getDate()}–${sunday.getDate()} ${EN_MONTHS[mMonth]} ${monday.getFullYear()}`;
  } else {
    return `${monday.getDate()} ${EN_MONTHS_SHORT[mMonth]} – ${sunday.getDate()} ${EN_MONTHS_SHORT[sMonth]} ${monday.getFullYear()}`;
  }
}

export function formatShortDate(date) {
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${daysShort[date.getDay()]} ${dd}.${mm}.${yyyy}`;
}

export function getDaysOfWeekForStartDate(startDateStr) {
  const start = parseISODate(startDateStr);
  const list = [];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = formatDateISO(d);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const label = `${daysShort[d.getDay()]} ${dd}.${mm}`;
    list.push({ dateStr, label });
  }
  return list;
}

export function getDaysOfRotationRange(startDateStr, endDateStr) {
  const start = parseISODate(startDateStr);
  const end = parseISODate(endDateStr);
  const list = [];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const current = new Date(start);
  while (current <= end) {
    const dateStr = formatDateISO(current);
    const dd = String(current.getDate()).padStart(2, '0');
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const label = `${daysShort[current.getDay()]} ${dd}.${mm}`;
    list.push({ dateStr, label });
    current.setDate(current.getDate() + 1);
  }
  return list;
}
