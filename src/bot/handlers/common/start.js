import { config } from '../../../config.js';
import { isAdmin, isCommanderOrAdmin } from '../../helpers.js';

export async function handleStartHelp(ctx) {
  const verDisplay = config.version ? ` \`[${config.version.substring(0, 7)}]\`` : '';
  const isAdm = isAdmin(ctx);
  const isCmdOrAdm = await isCommanderOrAdmin(ctx);

  let canReport = isCmdOrAdm;
  if (!canReport) {
    try {
      const { isUserAuthorizedForReport } = await import('../reports/report.js');
      canReport = await isUserAuthorizedForReport(ctx);
    } catch {
      canReport = false;
    }
  }

  if (!isCmdOrAdm && !canReport) {
    return ctx.reply(
      `⚡ *DVORA HQ // SECURE PROTOCOL* ${verDisplay} ⚡\n\n` +
        `Authorized access detected. Launch the Web App via the menu command or link to sync readiness status.`,
      { parse_mode: 'Markdown' }
    );
  }

  // Dynamically register autocomplete scope depending on role
  try {
    const commands = [
      { command: 'start', description: 'Show command help' },
      { command: 'help', description: 'Show command help' },
      { command: 'my_profile', description: 'Show profile and access PIN' },
    ];

    if (isCmdOrAdm) {
      commands.push(
        { command: 'complete_mission', description: '🛰 Confirm mission completion with AI analysis' },
        { command: 'reset_mission', description: '🗑 Reset/delete a completed mission' }
      );
    }

    if (canReport) {
      commands.push({ command: 'report', description: '📋 Submit weekly equipment inventory report' });
    }

    if (isAdm) {
      commands.push(
        { command: 'add_fighter', description: '➕ Add a fighter to squad' },
        { command: 'add_commander', description: '➕ Add a commander to squad' },
        { command: 'remove_user', description: '➖ Remove a user' },
        { command: 'remove_squad', description: '➖ Remove a squad and all its fighters' },
        { command: 'list_users', description: '📋 List authorized operators' },
        { command: 'add_rotation', description: '📅 Schedule a weekly rotation' },
        { command: 'remove_rotation', description: '📅 Remove a scheduled rotation' },
        { command: 'list_rotations', description: '📅 View rotation schedule' },
        { command: 'set_mission', description: '⏱ Set a mission time' }
      );
    }

    await ctx.api.setMyCommands(commands, {
      scope: { type: 'chat', chat_id: ctx.chat.id },
    });
  } catch (err) {
    console.error('[Bot] Failed to dynamically set commands:', err.message);
  }

  let helpMessage = `⚡ *DVORA HQ // INTEL BOT CLI* ${verDisplay} ⚡\n\n`;

  if (isAdm) {
    helpMessage +=
      `👤 *USER MANAGEMENT*\n` +
      `• \`/add_fighter\` — Add fighter (wizard dialog)\n` +
      `• \`/add_commander\` — Add commander (wizard dialog)\n` +
      `• \`/remove_user\` — Remove operator from database\n` +
      `• \`/remove_squad\` — Delete squad and fighters\n` +
      `• \`/list_users\` — Show list of registered operators\n\n` +
      `📅 *ROTATION SCHEDULING*\n` +
      `• \`/add_rotation\` — Schedule a weekly rotation\n` +
      `• \`/remove_rotation\` — Remove a scheduled rotation\n` +
      `• \`/list_rotations\` — View rotation schedule (4 weeks)\n\n` +
      `🛰 *MISSION OPERATIONS*\n` +
      `• \`/set_mission\` — Set mission time for a specific day\n` +
      `• \`/complete_mission\` — Confirm mission completion with AI analysis & debrief\n` +
      `• \`/reset_mission\` — Delete/reset a completed mission slot\n` +
      `• \`/report\` — Submit weekly equipment inventory report (texts, voices, photos)\n\n` +
      `⚙️ *GENERAL*\n` +
      `• \`/my_profile\` — View your profile & access PIN\n\n` +
      `_Security protocols active. Management via inline keyboards._`;
  } else if (isCmdOrAdm) {
    helpMessage +=
      `🛰 *MISSION OPERATIONS*\n` +
      `• \`/complete_mission\` — Confirm mission completion with AI analysis & debrief\n` +
      `• \`/reset_mission\` — Delete/reset a completed mission slot\n` +
      `• \`/report\` — Submit weekly equipment inventory report (texts, voices, photos)\n\n` +
      `⚙️ *GENERAL*\n` +
      `• \`/my_profile\` — View your profile & access PIN\n\n` +
      `_Security protocols active._`;
  } else {
    // Fighter with canReport
    helpMessage +=
      `🛰 *MISSION OPERATIONS*\n` +
      `• \`/report\` — Submit weekly equipment inventory report (texts, voices, photos)\n\n` +
      `⚙️ *GENERAL*\n` +
      `• \`/my_profile\` — View your profile & access PIN\n\n` +
      `_Security protocols active._`;
  }

  return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

