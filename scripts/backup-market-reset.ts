import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for a full database backup");

const directory = resolve(process.cwd(), "backups");
mkdirSync(directory, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(":", "-");
const output = resolve(directory, `culturedaq-market-reset-${timestamp}.dump`);

const result = spawnSync(
  "pg_dump",
  ["--format=custom", "--no-owner", "--no-privileges", `--file=${output}`, databaseUrl],
  { stdio: "inherit" }
);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`pg_dump exited with status ${result.status}`);
console.log(`Full database backup created: ${output}`);
