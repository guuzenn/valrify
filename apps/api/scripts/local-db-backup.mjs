import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const backupDirectory = resolve(root, ".data/backups");
const [mode, suppliedPath] = process.argv.slice(2);
assert.ok(["backup", "verify"].includes(mode), "Use backup or verify <backup.dump>.");
const archive = mode === "backup" ? resolve(backupDirectory, `valrify-${Date.now()}-${randomUUID()}.dump`) : resolve(root, suppliedPath ?? "");
const archiveRelative = relative(backupDirectory, archive);
assert.ok(!isAbsolute(archiveRelative) && !archiveRelative.startsWith("..") && archive.endsWith(".dump"), "Backup must be a .dump file inside .data/backups.");
const temporaryDatabase = `valrify_restore_${randomUUID().replaceAll("-", "")}`;
const containerFile = `/tmp/${temporaryDatabase}.dump`;
let createdDatabase = false;

function docker(...args) {
  const result = spawnSync("docker", ["compose", "-f", resolve(root, "docker-compose.yml"), ...args], { cwd: root, encoding: "utf8" });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Docker ${args[0]} failed: ${result.stderr}`);
}

const quote = (value) => `"${value.replaceAll('"', '""')}"`;
async function fingerprint(client) {
  const { rows: tables } = await client.query("select schemaname, tablename from pg_tables where schemaname in ('public', 'drizzle') order by schemaname, tablename");
  for (const required of ["users", "reports", "auth_sessions"]) assert.ok(tables.some((table) => table.schemaname === "public" && table.tablename === required), `Missing table: ${required}`);
  const result = [];
  // shortcut: whole-table fingerprints are for the small local database; use streamed hashes for large production databases.
  for (const { schemaname, tablename } of tables) {
    const { rows } = await client.query(`select count(*)::text as count, md5(coalesce(string_agg(row_json, ',' order by row_json), '')) as digest from (select to_jsonb(t)::text as row_json from ${quote(schemaname)}.${quote(tablename)} t) table_rows`);
    result.push({ schema: schemaname, table: tablename, ...rows[0] });
  }
  return result;
}

async function run() {
  mkdirSync(backupDirectory, { recursive: true });
  // Deliberately fixed to Docker Compose's local database; never loads production DATABASE_URL or .env.
  const client = new pg.Client({ host: "127.0.0.1", port: 5434, user: "valrify", password: "valrify_dev", database: mode === "backup" ? "valrify" : temporaryDatabase });
  try {
    if (mode === "verify") {
      assert.ok(existsSync(archive), "Backup does not exist.");
      const metadata = JSON.parse(readFileSync(`${archive}.json`, "utf8"));
      assert.equal(createHash("sha256").update(readFileSync(archive)).digest("hex"), metadata.sha256, "Backup checksum mismatch.");
      docker("cp", archive, `postgres:${containerFile}`);
      docker("exec", "-T", "postgres", "createdb", "-U", "valrify", temporaryDatabase);
      createdDatabase = true;
      docker("exec", "-T", "postgres", "pg_restore", "-U", "valrify", "-d", temporaryDatabase, "--exit-on-error", "--no-owner", "--no-privileges", containerFile);
      await client.connect();
      assert.deepEqual(await fingerprint(client), metadata.tables, "Restored table contents differ from backup snapshot.");
      console.log(`Restore verified: ${metadata.tables.length} tables match the backup snapshot. Source database unchanged.`);
    } else {
      await client.connect();
      await client.query("begin isolation level repeatable read read only");
      const { rows: [snapshot] } = await client.query("select pg_export_snapshot() as id");
      docker("exec", "-T", "postgres", "pg_dump", "-U", "valrify", "-d", "valrify", "--format=custom", `--snapshot=${snapshot.id}`, `--file=${containerFile}`);
      const tables = await fingerprint(client);
      await client.query("commit");
      docker("cp", `postgres:${containerFile}`, `${archive}.partial`);
      const sha256 = createHash("sha256").update(readFileSync(`${archive}.partial`)).digest("hex");
      writeFileSync(`${archive}.json`, JSON.stringify({ createdAt: new Date().toISOString(), sha256, tables }, null, 2) + "\n", { flag: "wx" });
      renameSync(`${archive}.partial`, archive);
      console.log(`Backup saved: ${relative(root, archive)} (${tables.length} tables).`);
      console.log(`Verify with: pnpm db:restore:test "${relative(root, archive)}"`);
    }
  } finally {
    await client.end();
    if (createdDatabase) docker("exec", "-T", "postgres", "dropdb", "-U", "valrify", temporaryDatabase);
    docker("exec", "-T", "postgres", "rm", "-f", "--", containerFile);
  }
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; });
