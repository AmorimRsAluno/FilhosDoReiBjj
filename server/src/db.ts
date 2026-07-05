import pg, { type QueryResultRow } from "pg";
import "dotenv/config";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL precisa estar configurada em produção.");
}

const ssl =
  process.env.DATABASE_SSL === "true" || process.env.PGSSLMODE === "require"
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined;

export const pool = new Pool({
  connectionString: connectionString ?? "postgres://postgres:postgres@localhost:5432/bjjapk",
  ssl
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result;
}
