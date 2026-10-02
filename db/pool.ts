import "dotenv/config";
import mysql from "mysql2/promise";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

export const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "vetanimal",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vetanimal",
  charset: "utf8mb4",
  // DATE/DATETIME llegan como texto ("2026-08-15") y DECIMAL como número,
  // que es el formato que ya espera el frontend.
  dateStrings: true,
  decimalNumbers: true,
};

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.query(sql, params);
  return result as ResultSetHeader;
}

// Ejecuta `fn` dentro de una transacción: confirma si termina bien y revierte si lanza.
export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
