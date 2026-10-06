import "dotenv/config";
import pg from "pg";
import type { PoolClient } from "pg";

// Base de datos: PostgreSQL alojado en Supabase. La cadena de conexión la inyecta la
// integración de Supabase (POSTGRES_URL usa el pooler, ideal para funciones de Vercel).
const connectionString = (
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  ""
).trim();

// pg trata `sslmode=require` como verificación estricta del certificado y Supabase usa
// una cadena propia: se quita del URL y se activa SSL explícitamente.
const urlSinSslmode = connectionString.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");

const urlInfo = (() => {
  try {
    const u = new URL(connectionString);
    return { host: u.hostname, port: Number(u.port) || 5432, database: u.pathname.slice(1) || "postgres" };
  } catch {
    return { host: "(sin configurar)", port: 5432, database: "postgres" };
  }
})();

export const dbConfig = { ...urlInfo, configured: Boolean(connectionString) };

// Mismo formato que devolvía la versión con MySQL: fechas como texto, DECIMAL/COUNT
// como número y booleanos como 1/0 (el frontend compara contra esos valores).
const { types } = pg;
types.setTypeParser(1082, (v) => v); // date → "2026-08-15"
types.setTypeParser(1114, (v) => v.slice(0, 19)); // timestamp
types.setTypeParser(1184, (v) => v.slice(0, 19)); // timestamptz
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // numeric
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // bigint (COUNT)
types.setTypeParser(16, (v) => (v === "t" ? 1 : 0)); // boolean

export const pool = new pg.Pool({
  connectionString: urlSinSslmode,
  ssl: connectionString && !/localhost|127\.0\.0\.1/.test(connectionString) ? { rejectUnauthorized: false } : undefined,
  max: process.env.VERCEL ? 3 : 10,
});

export interface ResultSetHeader {
  insertId: number;
  affectedRows: number;
}

type Ejecutor = { query: PoolClient["query"] };

// Las consultas se escribieron con la sintaxis de mysql2 (`?` como parámetro,
// `INSERT INTO t SET ?` y `UPDATE t SET ? WHERE ...` con un objeto). Acá se traducen
// a la sintaxis de Postgres ($1, $2… y listas de columnas).
function traducir(sql: string, params: any[]): { text: string; values: any[] } {
  const values: any[] = [];
  let i = 0;
  let text = "";
  let enComillas = false;

  for (let pos = 0; pos < sql.length; pos++) {
    const ch = sql[pos];
    if (ch === "'") {
      enComillas = !enComillas;
      text += ch;
      continue;
    }
    if (ch !== "?" || enComillas) {
      text += ch;
      continue;
    }

    const param = params[i++];
    const antes = text.trimEnd();
    const esObjeto = param && typeof param === "object" && !Array.isArray(param) && !(param instanceof Date);

    if (esObjeto && /\bSET$/i.test(antes)) {
      const columnas = Object.keys(param);
      if (/^\s*INSERT\b/i.test(sql)) {
        text = antes.replace(/\s+SET$/i, "");
        const marcadores = columnas.map((c) => {
          values.push(param[c]);
          return `$${values.length}`;
        });
        text += ` (${columnas.map((c) => `"${c}"`).join(", ")}) VALUES (${marcadores.join(", ")})`;
      } else {
        text += " " + columnas
          .map((c) => {
            values.push(param[c]);
            return `"${c}" = $${values.length}`;
          })
          .join(", ");
      }
      continue;
    }

    if (Array.isArray(param)) {
      // `IN (?)` con una lista, como en mysql2
      text += param
        .map((v) => {
          values.push(v);
          return `$${values.length}`;
        })
        .join(", ");
      continue;
    }

    values.push(typeof param === "boolean" ? (param ? 1 : 0) : param);
    text += `$${values.length}`;
  }

  if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    text += " RETURNING *";
  }
  return { text, values };
}

// Igual que mysql2: SELECT devuelve filas; INSERT/UPDATE/DELETE devuelven
// { insertId, affectedRows }.
async function ejecutar(cliente: Ejecutor, sql: string, params: any[] = []): Promise<any> {
  if (params.length === 0) {
    const res: any = await cliente.query(sql);
    const ultimo = Array.isArray(res) ? res[res.length - 1] : res;
    return formatear(ultimo);
  }
  const { text, values } = traducir(sql, params);
  return formatear(await cliente.query(text, values));
}

function formatear(res: pg.QueryResult) {
  if (res.command === "SELECT" || res.command === "SHOW") return res.rows;
  const header: ResultSetHeader & { rows: any[] } = {
    insertId: res.rows?.[0]?.id ?? 0,
    affectedRows: res.rowCount ?? 0,
    rows: res.rows ?? [],
  };
  return header;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return (await ejecutar(pool, sql, params)) as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  return (await ejecutar(pool, sql, params)) as ResultSetHeader;
}

// Conexión dentro de una transacción, con la misma forma que mysql2: query() devuelve [resultado].
export interface Conexion {
  query<T = any>(sql: string, params?: any[]): Promise<[T, undefined]>;
}

export async function transaction<T>(fn: (conn: Conexion) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  const conn: Conexion = {
    query: async (sql, params = []) => [await ejecutar(cliente, sql, params), undefined],
  };
  try {
    await cliente.query("BEGIN");
    const result = await fn(conn);
    await cliente.query("COMMIT");
    return result;
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

export async function withClient<T>(fn: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    return await fn(cliente);
  } finally {
    cliente.release();
  }
}

export { ejecutar };
