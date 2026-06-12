import mysql from 'mysql2/promise';
import { Connector } from '@google-cloud/cloud-sql-connector';
import { config } from './config.js';

let pool;

export async function getDbPool() {
  if (pool) return pool;

  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'dvora_db';

  console.log('[DB] Initializing Cloud SQL Connector...');
  const connector = new Connector();
  const clientOpts = await connector.getOptions({
    instanceConnectionName: `${config.gcpProjectId}:${config.gcpRegion}:${config.cloudSqlInstanceName}`,
    type: 'PUBLIC',
  });

  pool = mysql.createPool({
    ...clientOpts,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    connectionLimit: 2, // Keep connection pool size small for serverless environments
  });

  return pool;
}

export async function setupDatabase() {
  const activePool = await getDbPool();

  console.log('[DB] Ensuring database schema and tables exist in Cloud SQL...');

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(20) NULL,
      pin_hash VARCHAR(255) NOT NULL,
      pin_code VARCHAR(10) UNIQUE NULL,
      role ENUM('fighter', 'commander') NOT NULL DEFAULT 'fighter',
      squad_id VARCHAR(50) NOT NULL,
      callsign VARCHAR(100) NULL,
      specialization VARCHAR(100) NULL,
      weaponry VARCHAR(100) NULL,
      gear VARCHAR(100) NULL,
      avatar_url LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `ALTER TABLE users MODIFY COLUMN phone_number VARCHAR(20) NULL;`,
    `ALTER TABLE users ADD COLUMN pin_code VARCHAR(10) UNIQUE NULL;`,
    `ALTER TABLE users MODIFY COLUMN avatar_url LONGTEXT NULL;`,
    `ALTER TABLE users ADD COLUMN callsign VARCHAR(100) NULL;`,

    `CREATE TABLE IF NOT EXISTS readiness_status (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      weapons_ready TINYINT NOT NULL DEFAULT 0,
      transport_ready TINYINT NOT NULL DEFAULT 0,
      comms_ready TINYINT NOT NULL DEFAULT 0,
      meds_ready TINYINT NOT NULL DEFAULT 0,
      note TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    `ALTER TABLE readiness_status MODIFY COLUMN weapons_ready TINYINT NOT NULL DEFAULT 0;`,
    `ALTER TABLE readiness_status MODIFY COLUMN transport_ready TINYINT NOT NULL DEFAULT 0;`,
    `ALTER TABLE readiness_status MODIFY COLUMN comms_ready TINYINT NOT NULL DEFAULT 0;`,
    `ALTER TABLE readiness_status MODIFY COLUMN meds_ready TINYINT NOT NULL DEFAULT 0;`,

    `CREATE TABLE IF NOT EXISTS commander_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      squad_id VARCHAR(50) NOT NULL,
      alarm_active BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(36) PRIMARY KEY,
      expires_at DATETIME NOT NULL,
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB;`,
  ];

  for (const q of queries) {
    try {
      await activePool.query(q);
    } catch (err) {
      if (err.errno === 1060 || err.sqlState === '42S21') {
        continue;
      }
      console.error('[DB] Error executing schema query:', err.message);
      throw err;
    }
  }

  console.log('[DB] Schema setup successfully completed.');
}
