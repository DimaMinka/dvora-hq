import 'dotenv/config';

export const config = {
  appName: process.env.APP_NAME || 'Dvora HQ',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  aiApiKey: process.env.AI_API_KEY
};

console.log(`[System] Booting ${config.appName} in ${config.env} mode...`);
