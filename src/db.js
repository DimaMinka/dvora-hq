import mysql from 'mysql2/promise';
import { Connector } from '@google-cloud/cloud-sql-connector';
import { config } from './config.js';

let pool;

export async function getDbPool() {
  if (pool) return pool;

  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'dvora_db';

  // In production (GCP Cloud Run) or if configured to use the Cloud SQL Connector
  if (
    process.env.NODE_ENV === 'production' &&
    config.cloudSqlInstanceName &&
    config.gcpProjectId &&
    config.gcpRegion
  ) {
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
      connectionLimit: 2, // As per spec, keep pool small for serverless environment
    });
  } else {
    // Development local connection
    const host = process.env.DB_HOST || '127.0.0.1';
    console.log(`[DB] Connecting to local database at ${host}:3306...`);
    pool = mysql.createPool({
      host,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      connectionLimit: 10,
    });
  }

  return pool;
}

export async function setupDatabase() {
  const dbName = process.env.DB_NAME || 'dvora_db';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || '127.0.0.1';

  let initialConn;
  try {
    // Connect without database to create it if not exists
    initialConn = await mysql.createConnection({
      host: process.env.NODE_ENV === 'production' ? undefined : host,
      user: dbUser,
      password: dbPassword,
    });
    await initialConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`[DB] Database "${dbName}" ensured.`);
  } catch (err) {
    console.error('[DB] Failed to ensure database exists:', err.message);
  } finally {
    if (initialConn) await initialConn.end();
  }

  const activePool = await getDbPool();

  // Create tables
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone_number VARCHAR(20) UNIQUE NOT NULL,
      pin_hash VARCHAR(255) NOT NULL,
      role ENUM('fighter', 'commander') NOT NULL DEFAULT 'fighter',
      squad_id VARCHAR(50) NOT NULL,
      specialization VARCHAR(100) NULL,
      weaponry VARCHAR(100) NULL,
      gear VARCHAR(100) NULL,
      avatar_url VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS readiness_status (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      weapons_ready BOOLEAN NOT NULL DEFAULT FALSE,
      transport_ready BOOLEAN NOT NULL DEFAULT FALSE,
      comms_ready BOOLEAN NOT NULL DEFAULT FALSE,
      meds_ready BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

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
      console.error('[DB] Error executing schema query:', err.message);
      throw err;
    }
  }

  console.log('[DB] Schema setup successfully completed.');
}
