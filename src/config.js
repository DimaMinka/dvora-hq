import 'dotenv/config';
import { version } from './version.js';

export const config = {
  version,
  appName: process.env.APP_NAME || 'Dvora HQ',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  jwtSecret: process.env.JWT_SECRET,
  aiApiKey: process.env.AI_API_KEY,
  telegramAdminUsernames: process.env.TELEGRAM_ADMIN_USERNAMES || 'dimaminka',
  gcpProjectId: process.env.GCP_PROJECT_ID,
  gcpRegion: process.env.GCP_REGION || 'europe-west1',
  gcsAvatarBucket: process.env.GCS_AVATAR_BUCKET,
  cloudTasksQueueName: process.env.CLOUDTASKS_QUEUE_NAME || 'avatar-generation',
  cloudSqlInstanceName: process.env.CLOUDSQL_INSTANCE_NAME || 'dvora-db',
};

console.log(`[System] Booting ${config.appName} in ${config.env} mode...`);
