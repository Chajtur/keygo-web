import "server-only";
import { createPool, type Pool } from "mysql2/promise";

declare global {
  var keygoDatabasePool: Pool | undefined;
}

function createDatabasePool() {
  if (process.env.DATABASE_URL) {
    return createPool(process.env.DATABASE_URL);
  }

  const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error("Database configuration is missing.");
  }

  return createPool({
    host: DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
}

export function getDatabase() {
  if (!global.keygoDatabasePool) {
    global.keygoDatabasePool = createDatabasePool();
  }

  return global.keygoDatabasePool;
}