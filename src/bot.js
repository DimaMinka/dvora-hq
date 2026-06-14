import { Bot } from 'grammy';
import argon2 from 'argon2';
import { config } from './config.js';
import { getDb } from './db.js';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList,
} from '../shared/loadout-data.js';

if (!config.botToken || config.botToken === 'your_bot_token') {
  console.log('[Bot] TELEGRAM_BOT_TOKEN not configured. Bot execution disabled.');
}

const bot =
  config.botToken && config.botToken !== 'your_bot_token' ? new Bot(config.botToken) : null;

// Active conversation states keyed by chatId
const conversationState = new Map();

// Helper to set state and schedule a 5 minute timeout
function setConversationState(chatId, state) {
  const oldState = conversationState.get(chatId);
  if (oldState && oldState.timeoutId) {
    clearTimeout(oldState.timeoutId);
  }

  if (state === null) {
    conversationState.delete(chatId);
    return;
  }

  const timeoutId = setTimeout(async () => {
    const currentState = conversationState.get(chatId);
    if (currentState && currentState.timeoutId === timeoutId) {
      conversationState.delete(chatId);
      try {
        if (bot) {
          await bot.api.sendMessage(chatId, '⏱ *Сессия истекла*. Начните заново с помощью команд.', { parse_mode: 'Markdown' });
        }
      } catch (err) {
        console.error('[Bot Timeout] Failed to send timeout notice:', err.message);
      }
    }
  }, 5 * 60 * 1000);

  state.timeoutId = timeoutId;
  conversationState.set(chatId, state);
}

// Helper to generate a secure PIN: 5 digits + 1 uppercase letter
function generateTacticalPin() {
  const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `${digits}${letter}`;
}

async function hashPin(pin) {
  return argon2.hash(pin, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

// Helper: Get unique squads from existing users in the db
async function getSquads(db) {
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
function buildSquadKeyboard(squads, { addNew = false, disabledList = [] } = {}) {
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
    controlRow.push({ text: '➕ Новый отряд', callback_data: 'squad:__new__' });
  }
  controlRow.push({ text: '❌ Отмена', callback_data: 'cancel' });
  rows.push(controlRow);

  return { inline_keyboard: rows };
}

// Date helpers
function parseDate(str) {
  const parts = str.split('.');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

function getWeekRange(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(tempDate.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISODate(str) {
  const parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const RU_MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatWeekRangeRU(monday, sunday) {
  const mMonth = monday.getMonth();
  const sMonth = sunday.getMonth();

  if (mMonth === sMonth) {
    return `${monday.getDate()}–${sunday.getDate()} ${RU_MONTHS[mMonth]} ${monday.getFullYear()}`;
  } else {
    return `${monday.getDate()} ${RU_MONTHS_SHORT[mMonth]} – ${sunday.getDate()} ${RU_MONTHS_SHORT[sMonth]} ${monday.getFullYear()}`;
  }
}

// Conversation step processors - Callback query handlers
async function handleAddUserCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data === 'squad:__new__') {
      state.step = 'squad_text';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText('Введите название нового отряда (например, ALPHA, BRAVO):', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    } else if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;
      state.step = 'username';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(`Выбран отряд: *${squad}*\n\nВведите @username нового пользователя:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_add') {
      const pin = generateTacticalPin();
      const pinHash = await hashPin(pin);
      const role = state.flow === 'add_fighter' ? 'fighter' : 'commander';

      const db = getDb();
      await db.collection('users').doc(pin).set({
        pin_code: pin,
        pin_hash: pinHash,
        role: role,
        squad_id: state.data.squad_id,
        tg_username: state.data.tg_username.toLowerCase().replace(/^@/, ''),
        created_at: new Date().toISOString(),
      });

      const roleLabel = role.toUpperCase();
      await ctx.editMessageText(
        `✅ *${roleLabel} AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${state.data.squad_id}\`\n` +
          `• *TG Username:* \`@${state.data.tg_username}\`\n` +
          `• *One-Time PIN:* \`${pin}\`\n\n` +
          `_Distribute PIN securely. Token will wipe in 120 min post-login._`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

async function handleRemoveUserCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;

      const db = getDb();
      const snapshot = await db.collection('users').where('squad_id', '==', squad).get();
      if (snapshot.empty) {
        return ctx.editMessageText(`⚠️ В отряде *${squad}* нет бойцов.`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
        });
      }

      const buttons = [];
      snapshot.forEach((doc) => {
        const u = doc.data();
        const label = `@${u.tg_username} | ${u.role.toUpperCase()}`;
        buttons.push({ text: label, callback_data: `user:${doc.id}` });
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
      }
      rows.push([{ text: '❌ Отмена', callback_data: 'cancel' }]);

      state.step = 'user';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(`Отряд: *${squad}*\nВыберите бойца для удаления:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows },
      });
    }
  } else if (state.step === 'user') {
    if (data.startsWith('user:')) {
      const pin = data.split(':')[1];

      const db = getDb();
      const doc = await db.collection('users').doc(pin).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Пользователь не найден.');
      }

      const u = doc.data();
      state.data.pin_code = pin;
      state.data.tg_username = u.tg_username;

      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *Удалить @${u.tg_username} из ${u.squad_id}?*\n` +
          `PIN: \`${pin}\` будет аннулирован.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Удалить', callback_data: 'confirm_remove' },
                { text: '❌ Отмена', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_remove') {
      const pin = state.data.pin_code;
      const db = getDb();
      await db.collection('users').doc(pin).delete();

      await ctx.editMessageText(
        `✅ *USER EVICTED*: Пользователь @${state.data.tg_username} удален. PIN \`${pin}\` аннулирован.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

async function handleListUsersCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      const db = getDb();

      let snapshot;
      if (squad === '__all__') {
        snapshot = await db.collection('users').get();
      } else {
        snapshot = await db.collection('users').where('squad_id', '==', squad).get();
      }

      if (snapshot.empty) {
        await ctx.editMessageText('⚠️ *NO USERS*: База данных пуста для выбранного фильтра.', {
          parse_mode: 'Markdown',
        });
        setConversationState(ctx.chat.id, null);
        return;
      }

      let response = `⚡ *DVORA HQ // AUTHORIZED OPERATORS* ⚡\n\n`;
      let idx = 1;
      snapshot.forEach((doc) => {
        const row = doc.data();
        const usernameDisplay = row.tg_username ? `@${row.tg_username.replace(/^@/, '')}` : 'N/A';
        response += `${idx}. *[${row.role.toUpperCase()}]* \`${usernameDisplay}\` (Squad: \`${row.squad_id || 'N/A'}\`) | PIN: \`${row.pin_code}\`\n`;
        idx++;
      });

      await ctx.editMessageText(response, { parse_mode: 'Markdown' });
      setConversationState(ctx.chat.id, null);
    }
  }
}

async function handleAddRotationCallback(ctx, state, data) {
  const db = getDb();
  const squads = await getSquads(db);

  if (state.step === 'alert') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.alert = squad;
      state.step = 'standby';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `📅 Период: *${state.data.formattedRange}*\n` +
          `🔴 Дежурный: *${state.data.alert}*\n\n` +
          `Выберите *РЕЗЕРВНЫЙ* отряд (Standby):`,
        {
          parse_mode: 'Markdown',
          reply_markup: buildSquadKeyboard(squads, { disabledList: [state.data.alert] }),
        }
      );
    }
  } else if (state.step === 'standby') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.standby = squad;
      state.step = 'rest';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `📅 Период: *${state.data.formattedRange}*\n` +
          `🔴 Дежурный: *${state.data.alert}*\n` +
          `🔵 Резерв: *${state.data.standby}*\n\n` +
          `Выберите отряд на *ОТДЫХЕ* (Rest):`,
        {
          parse_mode: 'Markdown',
          reply_markup: buildSquadKeyboard(squads, { disabledList: [state.data.alert, state.data.standby] }),
        }
      );
    }
  } else if (state.step === 'rest') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.rest = squad;
      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `📅 *Создать ротацию?*\n\n` +
          `• *Период:* ${state.data.formattedRange}\n` +
          `• 🔴 *Дежурный:* \`${state.data.alert}\`\n` +
          `• 🔵 *Резерв:* \`${state.data.standby}\`\n` +
          `• ⬜ *Отдых:* \`${state.data.rest}\`\n\n` +
          `Подтвердите создание:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Создать', callback_data: 'confirm_add_rotation' },
                { text: '❌ Отмена', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_add_rotation') {
      const docRef = db.collection('rotations').doc(state.data.start_date);
      const doc = await docRef.get();

      if (doc.exists) {
        state.step = 'overwrite';
        setConversationState(ctx.chat.id, state);
        return ctx.editMessageText(
          `⚠️ *ВНИМАНИЕ*: График на период *${state.data.formattedRange}* уже существует.\nПерезаписать?`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Да, перезаписать', callback_data: 'confirm_overwrite' },
                  { text: '❌ Нет, отмена', callback_data: 'cancel' },
                ],
              ],
            },
          }
        );
      } else {
        await saveRotation(ctx, state);
      }
    }
  } else if (state.step === 'overwrite') {
    if (data === 'confirm_overwrite') {
      await saveRotation(ctx, state);
    }
  }
}

async function saveRotation(ctx, state) {
  const db = getDb();
  await db.collection('rotations').doc(state.data.start_date).set({
    start_date: state.data.start_date,
    end_date: state.data.end_date,
    squads: {
      alert: state.data.alert,
      standby: state.data.standby,
      rest: state.data.rest,
    },
    created_by: ctx.from?.username || 'unknown',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await ctx.editMessageText(
    `✅ *РОТАЦИЯ УСПЕШНО СОЗДАНА*\n\n` +
      `• *Период:* ${state.data.formattedRange}\n` +
      `• 🔴 *Дежурный:* \`${state.data.alert}\`\n` +
      `• 🔵 *Резерв:* \`${state.data.standby}\`\n` +
      `• ⬜ *Отдых:* \`${state.data.rest}\``,
    { parse_mode: 'Markdown' }
  );
  setConversationState(ctx.chat.id, null);
}

async function handleRemoveRotationCallback(ctx, state, data) {
  if (state.step === 'select') {
    if (data.startsWith('rotation:')) {
      const startDate = data.split(':')[1];
      state.data.start_date = startDate;

      const db = getDb();
      const doc = await db.collection('rotations').doc(startDate).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Ротация не найдена.');
      }

      const r = doc.data();
      const monday = parseISODate(r.start_date);
      const sunday = parseISODate(r.end_date);
      state.data.formattedRange = formatWeekRangeRU(monday, sunday);
      state.data.alert = r.squads.alert;
      state.data.standby = r.squads.standby;
      state.data.rest = r.squads.rest;

      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *Удалить ротацию на период ${state.data.formattedRange}?*\n` +
          `• 🔴 Alert: \`${state.data.alert}\`\n` +
          `• 🔵 Standby: \`${state.data.standby}\`\n` +
          `• ⬜ Rest: \`${state.data.rest}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Удалить', callback_data: 'confirm_remove_rotation' },
                { text: '❌ Отмена', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_remove_rotation') {
      const db = getDb();
      await db.collection('rotations').doc(state.data.start_date).delete();

      await ctx.editMessageText(
        `✅ *РОТАЦИЯ УДАЛЕНА*: График на период *${state.data.formattedRange}* успешно очищен.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

// Conversation step processors - Text input handlers
async function handleAddUserText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;

  if (state.step === 'squad_text') {
    const squadId = text.toUpperCase();
    state.data.squad_id = squadId;
    state.step = 'username';
    setConversationState(ctx.chat.id, state);
    return ctx.reply(`Выбран новый отряд: *${squadId}*\n\nВведите @username нового пользователя:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
    });
  }

  if (state.step === 'username') {
    const tgUsername = text.replace(/^@/, '');
    state.data.tg_username = tgUsername;
    state.step = 'confirm';
    setConversationState(ctx.chat.id, state);

    const roleLabel = state.flow === 'add_fighter' ? 'FIGHTER' : 'COMMANDER';
    const confirmText =
      `➕ *Добавить ${roleLabel}?*\n\n` +
      `• *Отряд:* \`${state.data.squad_id}\`\n` +
      `• *Username:* \`@${tgUsername}\`\n\n` +
      `Подтвердите действие:`;

    return ctx.reply(confirmText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Подтвердить', callback_data: 'confirm_add' },
            { text: '❌ Отмена', callback_data: 'cancel' },
          ],
        ],
      },
    });
  }
}

async function handleAddRotationText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;

  if (state.step === 'date') {
    const date = parseDate(text);
    if (!date) {
      return ctx.reply('⚠️ *НЕВЕРНЫЙ ФОРМАТ*. Введите дату начала в формате ДД.ММ.ГГГГ (например, 15.06.2026):', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    }

    const { monday, sunday } = getWeekRange(date);
    const today = new Date();
    const { monday: currentMonday } = getWeekRange(today);

    if (monday < currentMonday) {
      return ctx.reply('⚠️ *ПРОШЕДШИЙ ПЕРИОД*. Нельзя создавать ротации на прошедшие недели. Введите другую дату:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    }

    state.data.start_date = formatDateISO(monday);
    state.data.end_date = formatDateISO(sunday);
    state.data.formattedRange = formatWeekRangeRU(monday, sunday);

    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length < 3) {
      setConversationState(ctx.chat.id, null);
      return ctx.reply('⚠️ *ОШИБКА*: Для создания ротации в системе должно быть минимум 3 отряда. Добавьте бойцов в другие отряды.');
    }

    state.step = 'alert';
    setConversationState(ctx.chat.id, state);

    return ctx.reply(
      `📅 Период: *${state.data.formattedRange}*\n\n` +
        `Выберите *ДЕЖУРНЫЙ* отряд (Alert):`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildSquadKeyboard(squads),
      }
    );
  }
}

if (bot) {
  const adminString = config.telegramAdminUsernames;
  const adminUsernames = adminString
    .split(',')
    .map((name) => name.trim().toLowerCase().replace(/^@/, ''));

  const isAdmin = (ctx) => {
    const username = ctx.from?.username?.toLowerCase();
    return username && adminUsernames.includes(username);
  };

  // Command: Help and Start
  bot.command(['start', 'help'], async (ctx) => {
    const verDisplay = config.version ? ` \`[${config.version.substring(0, 7)}]\`` : '';
    if (!isAdmin(ctx)) {
      return ctx.reply(
        `⚡ *DVORA HQ // SECURE PROTOCOL* ${verDisplay} ⚡\n\n` +
          `Authorized access detected. Launch the Web App via the menu command or link to sync readiness status.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Dynamically register full admin commands autocomplete scope for this admin user chat
    try {
      await ctx.api.setMyCommands(
        [
          { command: 'start', description: 'Показать справку по командам' },
          { command: 'help', description: 'Показать справку по командам' },
          { command: 'my_profile', description: 'Показать профиль и PIN доступа' },
          { command: 'add_fighter', description: '➕ Добавить бойца в отряд' },
          { command: 'add_commander', description: '➕ Добавить командира в отряд' },
          { command: 'remove_user', description: '➖ Удалить пользователя' },
          { command: 'list_users', description: '📋 Список пользователей' },
          { command: 'add_rotation', description: '📅 Создать ротацию отрядов' },
          { command: 'remove_rotation', description: '📅 Удалить ротацию отрядов' },
          { command: 'list_rotations', description: '📅 Посмотреть график ротаций' },
        ],
        {
          scope: { type: 'chat', chat_id: ctx.chat.id },
        }
      );
    } catch (err) {
      console.error('[Bot] Failed to dynamically set admin commands:', err.message);
    }

    const helpMessage =
      `⚡ *DVORA HQ // INTEL BOT CLI* ${verDisplay} ⚡\n\n` +
      `Доступные тактические протоколы:\n` +
      `• \`/add_fighter\` — Добавить бойца (пошаговый диалог)\n` +
      `• \`/add_commander\` — Добавить командира (пошаговый диалог)\n` +
      `• \`/remove_user\` — Удалить оператора из базы данных\n` +
      `• \`/list_users\` — Показать список зарегистрированных операторов\n` +
      `• \`/add_rotation\` — Запланировать недельную ротацию\n` +
      `• \`/remove_rotation\` — Удалить запланированную ротацию\n` +
      `• \`/list_rotations\` — Посмотреть график ротаций на 4 недели\n\n` +
      `_Протоколы безопасности активны. Управление через кнопки инлайн-клавиатур._`;
    return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Command: Add Fighter
  bot.command('add_fighter', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length === 0) {
      setConversationState(ctx.chat.id, {
        flow: 'add_fighter',
        step: 'squad_text',
        data: {},
      });
      return ctx.reply('Отрядов в системе пока нет. Введите название нового отряда (например, ALPHA):', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    }

    setConversationState(ctx.chat.id, {
      flow: 'add_fighter',
      step: 'squad',
      data: {},
    });
    return ctx.reply('Выберите отряд для добавления бойца:', {
      reply_markup: buildSquadKeyboard(squads, { addNew: true }),
    });
  });

  // Command: Add Commander
  bot.command('add_commander', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length === 0) {
      setConversationState(ctx.chat.id, {
        flow: 'add_commander',
        step: 'squad_text',
        data: {},
      });
      return ctx.reply('Отрядов в системе пока нет. Введите название нового отряда (например, ALPHA):', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      });
    }

    setConversationState(ctx.chat.id, {
      flow: 'add_commander',
      step: 'squad',
      data: {},
    });
    return ctx.reply('Выберите отряд для добавления командира:', {
      reply_markup: buildSquadKeyboard(squads, { addNew: true }),
    });
  });

  // Command: Remove User
  bot.command('remove_user', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    try {
      const db = getDb();
      const snapshot = await db.collection('users').get();
      if (snapshot.empty) {
        return ctx.reply('⚠️ База данных пользователей пуста.');
      }

      const squadCounts = {};
      snapshot.forEach((doc) => {
        const u = doc.data();
        const squad = u.squad_id ? u.squad_id.toUpperCase() : 'N/A';
        squadCounts[squad] = (squadCounts[squad] || 0) + 1;
      });

      const squadList = Object.keys(squadCounts).sort();
      const keyboardRows = [];
      const buttons = squadList.map((squad) => ({
        text: `${squad} (${squadCounts[squad]})`,
        callback_data: `squad:${squad}`,
      }));

      for (let i = 0; i < buttons.length; i += 2) {
        keyboardRows.push(buttons.slice(i, i + 2));
      }
      keyboardRows.push([{ text: '❌ Отмена', callback_data: 'cancel' }]);

      setConversationState(ctx.chat.id, {
        flow: 'remove_user',
        step: 'squad',
        data: {},
      });

      return ctx.reply('Выберите отряд, из которого хотите удалить пользователя:', {
        reply_markup: { inline_keyboard: keyboardRows },
      });
    } catch (err) {
      console.error('[Bot] Remove user initialization error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: List Users
  bot.command('list_users', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    try {
      const db = getDb();
      const squads = await getSquads(db);

      if (squads.length === 0) {
        return ctx.reply('⚠️ База данных пользователей пуста.');
      }

      const keyboardRows = [];
      const buttons = squads.map((squad) => ({
        text: squad,
        callback_data: `squad:${squad}`,
      }));

      for (let i = 0; i < buttons.length; i += 2) {
        keyboardRows.push(buttons.slice(i, i + 2));
      }
      keyboardRows.push([{ text: '📋 Показать всех', callback_data: 'squad:__all__' }]);
      keyboardRows.push([{ text: '❌ Отмена', callback_data: 'cancel' }]);

      setConversationState(ctx.chat.id, {
        flow: 'list_users',
        step: 'squad',
        data: {},
      });

      return ctx.reply('Выберите отряд для просмотра списка:', {
        reply_markup: { inline_keyboard: keyboardRows },
      });
    } catch (err) {
      console.error('[Bot] List users initialization error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: My Profile (Available to all registered operators, unchanged)
  bot.command('my_profile', async (ctx) => {
    const tgUsername = ctx.from?.username;
    if (!tgUsername) {
      return ctx.reply(
        '⚠️ *ERROR*: Telegram username handle not found. Please set one in Telegram settings.',
        {
          parse_mode: 'Markdown',
        }
      );
    }

    try {
      const db = getDb();
      const cleaned = tgUsername.toLowerCase().replace(/^@/, '');

      const snapshot = await db
        .collection('users')
        .where('tg_username', 'in', [cleaned, `@${cleaned}`])
        .get();

      if (snapshot.empty) {
        return ctx.reply(
          `❌ *ACCESS DENIED*\n\n` +
            `Your Telegram handle \`@${tgUsername}\` is not paired with any authorized operator node.\n` +
            `Contact a commander to whitelist your access PIN.`,
          { parse_mode: 'Markdown' }
        );
      }

      const userDoc = snapshot.docs[0];
      const u = userDoc.data();
      const roleDoc = u.role ? u.role.toUpperCase() : 'OPERATOR';
      let response =
        `⚡ *DVORA HQ // ${roleDoc} PROFILE* ⚡\n\n` +
        `• *TG Username:* \`@${tgUsername}\`\n` +
        `• *Role:* \`${roleDoc}\`\n` +
        `• *Squad:* \`${u.squad_id}\`\n` +
        `• *Access PIN:* \`${u.pin_code}\`\n`;

      if (u.specialization) {
        const formattedSpec = u.specialization
          .split(',')
          .map((s) => {
            const match = specializationsList.find((x) => x.id === s.trim().toLowerCase());
            return match ? match.en : s.trim();
          })
          .join(' + ')
          .toUpperCase();

        const parts = u.weaponry ? u.weaponry.split(';') : ['N/A'];
        const primaryId = parts[0];
        const secondaryIds = parts[1] ? parts[1].split(',') : [];

        const pMatch = primaryWeaponsList.find((w) => w.id === primaryId.trim().toLowerCase());
        const primaryLabel = pMatch ? pMatch.en : primaryId;

        let weaponryLabel = primaryLabel;
        if (secondaryIds.length > 0) {
          const secondaryLabels = secondaryIds.map((id) => {
            const match = secondaryWeaponsList.find((w) => w.id === id.trim().toLowerCase());
            return match ? match.en : id.trim();
          });
          weaponryLabel = `${primaryLabel} [SEC: ${secondaryLabels.join(', ')}]`;
        }
        const formattedWeaponry = weaponryLabel.toUpperCase();

        let formattedOptics = 'NONE';
        if (u.optics) {
          formattedOptics = u.optics
            .split(',')
            .map((id) => {
              const match = opticsList.find((o) => o.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedAccessories = 'NONE';
        if (u.accessories) {
          formattedAccessories = u.accessories
            .split(',')
            .map((id) => {
              const match = accessoriesList.find((a) => a.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedGear = 'NONE';
        if (u.gear) {
          formattedGear = u.gear
            .split(',')
            .map((id) => {
              const cleanId = id.trim().toLowerCase();
              const match =
                gearsList.find((g) => g.id === cleanId) || medsList.find((m) => m.id === cleanId);
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedMeds = 'NONE';
        if (u.meds) {
          formattedMeds = u.meds
            .split(',')
            .map((id) => {
              const match = medsList.find((m) => m.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        response +=
          `• *Specialization:* \`${formattedSpec}\`\n` +
          `• *Weaponry:* \`${formattedWeaponry}\`\n` +
          `• *Optics:* \`${formattedOptics.toUpperCase()}\`\n` +
          `• *Accessories:* \`${formattedAccessories}\`\n` +
          `• *Medical:* \`${formattedMeds}\`\n` +
          `• *Selected Gear:* \`${formattedGear}\`\n`;
      }

      response += `\n_Keep your access PIN secure. Do not share it with unauthorized personnel._`;

      return ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Bot] My Profile command error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: Add Rotation
  bot.command('add_rotation', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length < 3) {
      return ctx.reply('⚠️ *ОШИБКА*: Для планирования ротаций требуется минимум 3 зарегистрированных отряда в системе.');
    }

    setConversationState(ctx.chat.id, {
      flow: 'add_rotation',
      step: 'date',
      data: {},
    });

    return ctx.reply(
      '📅 *НОВАЯ РОТАЦИЯ*\n\n' +
        'Введите дату начала ротации в формате ДД.ММ.ГГГГ (например, `15.06.2026`).\n' +
        'Период будет автоматически выровнен по понедельнику соответствующей недели.',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ Отмена', callback_data: 'cancel' }]] },
      }
    );
  });

  // Command: Remove Rotation
  bot.command('remove_rotation', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    try {
      const db = getDb();
      const todayStr = formatDateISO(getWeekRange(new Date()).monday);

      const snapshot = await db.collection('rotations')
        .where('start_date', '>=', todayStr)
        .orderBy('start_date')
        .limit(8)
        .get();

      if (snapshot.empty) {
        return ctx.reply('⚠️ *НЕТ РОТАЦИЙ*: График ротаций пуст на будущие недели.');
      }

      const buttons = [];
      snapshot.forEach((doc) => {
        const r = doc.data();
        const monday = parseISODate(r.start_date);
        const sunday = parseISODate(r.end_date);
        const label = `📅 ${formatWeekRangeRU(monday, sunday)}: ${r.squads.alert}/${r.squads.standby}/${r.squads.rest}`;
        buttons.push([{ text: label, callback_data: `rotation:${doc.id}` }]);
      });
      buttons.push([{ text: '❌ Отмена', callback_data: 'cancel' }]);

      setConversationState(ctx.chat.id, {
        flow: 'remove_rotation',
        step: 'select',
        data: {},
      });

      return ctx.reply('Выберите ротацию для удаления:', {
        reply_markup: { inline_keyboard: buttons },
      });
    } catch (err) {
      console.error('[Bot] Remove rotation initialization error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: List Rotations
  bot.command('list_rotations', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    try {
      const db = getDb();
      const todayStr = formatDateISO(getWeekRange(new Date()).monday);

      const snapshot = await db.collection('rotations')
        .where('start_date', '>=', todayStr)
        .orderBy('start_date')
        .limit(4)
        .get();

      if (snapshot.empty) {
        return ctx.reply('⚠️ *ГРАФИК ПУСТ*: Нет запланированных ротаций.');
      }

      let response = `📅 *ГРАФИК РОТАЦИЙ (ближайшие 4 недели)*\n\n`;
      snapshot.forEach((doc) => {
        const r = doc.data();
        const monday = parseISODate(r.start_date);
        const sunday = parseISODate(r.end_date);
        response += `• *${formatWeekRangeRU(monday, sunday)}*:\n` +
                    `  🔴 Дежурный: *${r.squads.alert}*\n` +
                    `  🔵 Резерв: *${r.squads.standby}*\n` +
                    `  ⬜ Отдых: *${r.squads.rest}*\n\n`;
      });

      return ctx.reply(response, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '❌ Закрыть', callback_data: 'cancel' }]]
        }
      });
    } catch (err) {
      console.error('[Bot] List rotations error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Handle callback queries
  bot.on('callback_query:data', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCallbackQuery({ text: 'Access Denied', show_alert: true });
    }

    const data = ctx.callbackQuery.data;
    if (data === 'noop') {
      return ctx.answerCallbackQuery();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (data === 'cancel') {
      setConversationState(chatId, null);
      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText('❌ Операция отменена. /help');
      } catch {
        await ctx.reply('❌ Операция отменена. /help');
      }
      return;
    }

    if (!state) {
      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText('⏱ Сессия истекла. Начните заново с помощью команд.');
      } catch {
        await ctx.reply('⏱ Сессия истекла. Начните заново с помощью команд.');
      }
      return;
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      await ctx.answerCallbackQuery();
      if (state.flow === 'add_fighter' || state.flow === 'add_commander') {
        await handleAddUserCallback(ctx, state, data);
      } else if (state.flow === 'remove_user') {
        await handleRemoveUserCallback(ctx, state, data);
      } else if (state.flow === 'list_users') {
        await handleListUsersCallback(ctx, state, data);
      } else if (state.flow === 'add_rotation') {
        await handleAddRotationCallback(ctx, state, data);
      } else if (state.flow === 'remove_rotation') {
        await handleRemoveRotationCallback(ctx, state, data);
      }
    } catch (err) {
      console.error('[Bot Callback Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ОШИБКА*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Handle text messages for active flows
  bot.on('message:text', async (ctx, next) => {
    if (!isAdmin(ctx)) {
      return next();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (!state) {
      return next();
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      if (state.flow === 'add_fighter' || state.flow === 'add_commander') {
        await handleAddUserText(ctx, state);
      } else if (state.flow === 'add_rotation') {
        await handleAddRotationText(ctx, state);
      } else {
        return next();
      }
    } catch (err) {
      console.error('[Bot Message Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ОШИБКА*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Catch unhandled bot errors
  bot.catch((err) => {
    console.error('[Bot] Unhandled error occurred:', err.message);
  });
}

export async function startBot() {
  if (bot) {
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Show help and available commands' },
        { command: 'help', description: 'Show help and available commands' },
        { command: 'my_profile', description: 'Display your tactical profile and access PIN' },
      ]);
      console.log('[Bot] Commands registered with Telegram successfully.');
    } catch (err) {
      console.error('[Bot] Failed to set commands in Telegram:', err.message);
    }

    bot
      .start({
        onStart: () => {
          console.log('[Bot] Grammy Telegram Bot CLI is running...');
        },
      })
      .catch((err) => {
        console.error('[Bot] Telegram Bot failed to start/run:', err.message);
      });
  }
}
