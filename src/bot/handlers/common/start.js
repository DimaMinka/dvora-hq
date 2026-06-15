import { config } from '../../../config.js';
import { isAdmin } from '../../helpers.js';

export async function handleStartHelp(ctx) {
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
        { command: 'start', description: 'Show command help' },
        { command: 'help', description: 'Show command help' },
        { command: 'my_profile', description: 'Show profile and access PIN' },
        { command: 'add_fighter', description: '➕ Add a fighter to squad' },
        { command: 'add_commander', description: '➕ Add a commander to squad' },
        { command: 'remove_user', description: '➖ Remove a user' },
        { command: 'remove_squad', description: '➖ Remove a squad and all its fighters' },
        { command: 'list_users', description: '📋 List authorized operators' },
        { command: 'add_rotation', description: '📅 Schedule a weekly rotation' },
        { command: 'remove_rotation', description: '📅 Remove a scheduled rotation' },
        { command: 'list_rotations', description: '📅 View rotation schedule' },
        { command: 'set_mission', description: '⏱ Set a mission time' },
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
    `Available tactical protocols:\n` +
    `• \`/add_fighter\` — Add fighter (wizard dialog)\n` +
    `• \`/add_commander\` — Add commander (wizard dialog)\n` +
    `• \`/remove_user\` — Remove operator from the database\n` +
    `• \`/remove_squad\` — Delete a squad and all associated fighters\n` +
    `• \`/list_users\` — Show list of registered operators\n` +
    `• \`/add_rotation\` — Schedule a weekly rotation\n` +
    `• \`/remove_rotation\` — Remove a scheduled rotation\n` +
    `• \`/list_rotations\` — View rotation schedule for the next 4 weeks\n` +
    `• \`/set_mission\` — Set a mission time for a specific day\n\n` +
    `_Security protocols active. Management via inline keyboard buttons._`;
  return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}
