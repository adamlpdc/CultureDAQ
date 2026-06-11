#!/usr/bin/env node
/**
 * Apply notifications migration via Supabase SQL API (requires DATABASE_URL or manual run).
 * Run: node scripts/apply-notifications.mjs
 * Or paste supabase/notifications.sql into the Supabase SQL Editor.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "../supabase/notifications.sql"), "utf8");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("DATABASE_URL not set. Run this SQL in Supabase SQL Editor:\n");
  console.log(sql);
  process.exit(0);
}

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();
try {
  await client.query(sql);
  console.log("Notifications migration applied successfully.");
} finally {
  await client.end();
}
