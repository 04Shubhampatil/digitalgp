/**
 * Copy all application data from one database to another (e.g. local → Vercel / Prisma Postgres).
 *
 *   SOURCE_DATABASE_URL=...  TARGET_DATABASE_URL=...  npx tsx scripts/copy-data.ts
 *
 * - The target must already have the schema (`prisma migrate deploy`) and must be empty: the script
 *   refuses to run otherwise, so it can never mix or overwrite data.
 * - Everything is copied in one transaction: on any error nothing is written.
 * - Tables are copied in foreign-key order. Self/circular references (AdminUnit.parentId,
 *   User.createdById, Section.draftId/publishedId) are handled by inserting first and linking after.
 * - Not copied: sessions, password-reset tokens, rate-limit buckets, migration history.
 * - Media rows are copied, but the files live in the source's UPLOADS_DIR and are NOT copied.
 */
import { Client } from "pg";

/** `noId`: link tables keyed by a composite primary key (no "id" column to order by). */
type TableSpec = { name: string; orderBy?: string; deferred?: string[]; noId?: boolean };

const TABLES: TableSpec[] = [
  { name: "AdminUnit", orderBy: 'length("path"), "id"' },
  { name: "Tenant" },
  { name: "User", deferred: ["createdById"] },
  { name: "RoleAssignment" },
  { name: "ModulePermission" },
  { name: "Media" },
  { name: "Page" },
  { name: "Section", deferred: ["draftId", "publishedId"] },
  { name: "SectionRevision" },
  { name: "Announcement" },
  { name: "AnnouncementTarget", noId: true },
  { name: "Scheme" },
  { name: "SchemeTarget", noId: true },
  { name: "SchemeWardCoverage" },
  { name: "Project" },
  { name: "Grievance" },
  { name: "GrievanceEvent" },
  { name: "GrievanceAttachment", noId: true },
  { name: "FormSubmission" },
  { name: "AuditLog" },
];
const SKIPPED = new Set(["Session", "PasswordResetToken", "RateLimitBucket", "_prisma_migrations"]);
const BATCH = 200;

const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`;

async function tableNames(c: Client): Promise<string[]> {
  const r = await c.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
  );
  return r.rows.map((x) => x.table_name);
}

async function jsonColumns(c: Client, table: string): Promise<Set<string>> {
  const r = await c.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND data_type IN ('json','jsonb')",
    [table],
  );
  return new Set(r.rows.map((x) => x.column_name));
}

async function main(): Promise<void> {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!sourceUrl || !targetUrl) throw new Error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL");
  if (sourceUrl === targetUrl) throw new Error("Source and target are the same database");

  const source = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 20_000 });
  const target = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 20_000 });
  const log = (m: string) => console.error(`[copy] ${m}`);
  log("connecting to source...");
  await source.connect();
  log("connecting to target...");
  await target.connect();
  log("connected.");
  try {
    // Every source table must be either copied or deliberately skipped.
    const unknown = (await tableNames(source)).filter((t) => !SKIPPED.has(t) && !TABLES.some((s) => s.name === t));
    if (unknown.length) throw new Error(`Tables not handled by this script: ${unknown.join(", ")}`);

    // Refuse to write into a database that already has data.
    for (const t of TABLES) {
      const n = Number((await target.query(`SELECT count(*)::int AS n FROM ${q(t.name)}`)).rows[0].n);
      if (n > 0) throw new Error(`Target table ${t.name} is not empty (${n} rows). Aborting without changes.`);
    }

    await target.query("BEGIN");
    const deferredUpdates: { table: string; id: string; values: Record<string, unknown> }[] = [];
    const counts: Record<string, number> = {};

    for (const spec of TABLES) {
      const orderBy = spec.orderBy ?? (spec.noId ? null : '"id"');
      const rows = (await source.query(`SELECT * FROM ${q(spec.name)}${orderBy ? ` ORDER BY ${orderBy}` : ""}`)).rows;
      counts[spec.name] = rows.length;
      log(`${spec.name}: ${rows.length} rows`);
      if (rows.length === 0) continue;
      const jsonCols = await jsonColumns(target, spec.name);
      const columns = Object.keys(rows[0]);

      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const params: unknown[] = [];
        const tuples = chunk.map((row) => {
          if (spec.deferred) {
            const later: Record<string, unknown> = {};
            for (const col of spec.deferred) if (row[col] !== null) later[col] = row[col];
            if (Object.keys(later).length) deferredUpdates.push({ table: spec.name, id: row.id as string, values: later });
          }
          const placeholders = columns.map((col) => {
            let v = row[col];
            if (spec.deferred?.includes(col)) v = null;
            else if (jsonCols.has(col) && v !== null) v = JSON.stringify(v);
            params.push(v);
            return `$${params.length}`;
          });
          return `(${placeholders.join(", ")})`;
        });
        await target.query(`INSERT INTO ${q(spec.name)} (${columns.map(q).join(", ")}) VALUES ${tuples.join(", ")}`, params);
      }
    }

    for (const u of deferredUpdates) {
      const cols = Object.keys(u.values);
      const sets = cols.map((col, i) => `${q(col)} = $${i + 1}`).join(", ");
      await target.query(`UPDATE ${q(u.table)} SET ${sets} WHERE "id" = $${cols.length + 1}`, [...cols.map((c) => u.values[c]), u.id]);
    }

    log(`linking ${deferredUpdates.length} deferred references...`);
    await target.query("COMMIT");
    for (const [t, n] of Object.entries(counts)) console.log(`${t.padEnd(22)} ${n}`);
    console.log("Copy complete.");
  } catch (err) {
    await target.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
