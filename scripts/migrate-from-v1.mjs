#!/usr/bin/env node
// Baseline V1 (Neon/Prisma) → V2 (Supabase) data migration. See docs/MIGRATION.md.
//
//   node scripts/migrate-from-v1.mjs --source "$V1_DATABASE_URL" --target "$SUPABASE_DB_URL" [--dry-run]
//
// Safety:
// - The V1 side is only ever read: one REPEATABLE READ, READ ONLY transaction (a consistent snapshot).
// - The target side is ONE transaction: copy V1 tables verbatim into legacy.*, prove the copy is identical (row counts
//   + content hashes on both sides), run legacy.import_v1(), run every legacy.reconcile_v1() check. Any failure (or
//   --dry-run) rolls everything back, so the target is either fully migrated and verified, or untouched.
// - Prints counts and check results only, never row contents. Connection strings are never printed.
import postgres from "postgres";
import { pipeline } from "node:stream/promises";

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const source = arg("--source"), target = arg("--target"), dryRun = args.includes("--dry-run");
if (!source || !target) { console.error("usage: --source <v1 url> --target <supabase db url> [--dry-run]"); process.exit(2); }
if (source === target) { console.error("source and target must differ"); process.exit(2); }

// V1 tables in a safe copy order, with their primary key (for deterministic ordering and hashing)
const TABLES = [["User", "userId"], ["Matches", "matchId"], ["MatchDetails", "detailId"], ["MessageThread", "threadId"], ["Message", "messageId"], ["_prisma_migrations", "id"]];

const fingerprint = async (sql, schema) => {
  const out = {};
  for (const [table, pk] of TABLES) {
    const [r] = await sql`select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x.${sql(pk)}), '')) as h from ${sql(schema)}.${sql(table)} x`;
    out[table] = { rows: r.n, hash: r.h };
  }
  return out;
};

class DryRun extends Error {}
const src = postgres(source, { max: 1, ssl: /localhost|127\.0\.0\.1/.test(source) ? false : "require", onnotice: () => {} });
const dst = postgres(target, { max: 1, ssl: /localhost|127\.0\.0\.1/.test(target) ? false : "require", onnotice: () => {} });

let report;
try {
  await src.begin("isolation level repeatable read read only", async (s) => {
    const sourceFp = await fingerprint(s, "public");
    console.log("V1 snapshot:", Object.entries(sourceFp).map(([t, v]) => `${t} ${v.rows}`).join(", "));
    await dst.begin(async (t) => {
      for (const [table] of TABLES) {
        const [{ n }] = await t`select count(*)::int as n from legacy.${t(table)}`;
        if (n !== 0) throw new Error(`legacy.${table} already has rows: this target was already migrated`);
      }
      for (const [table, pk] of TABLES) {
        const out = await s`copy (select * from public.${s(table)} order by ${s(pk)}) to stdout`.readable();
        const into = await t`copy legacy.${t(table)} from stdin`.writable();
        await pipeline(out, into);
      }
      const targetFp = await fingerprint(t, "legacy");
      const copyOk = TABLES.every(([table]) => sourceFp[table].rows === targetFp[table].rows && sourceFp[table].hash === targetFp[table].hash);
      console.log(`Verbatim copy: ${copyOk ? "identical" : "MISMATCH"} (${TABLES.length} tables, counts + content hashes)`);
      if (!copyOk) throw new Error("the copy differs from V1; nothing was changed");

      const [{ import_v1: imported }] = await t`select legacy.import_v1()`;
      console.log("Imported:", JSON.stringify(imported));
      const checks = await t`select * from legacy.reconcile_v1()`;
      for (const c of checks) console.log(`${c.ok ? "  ok  " : "  FAIL"} ${c.check_name}: expected ${c.expected}, got ${c.actual}`);
      const failed = checks.filter((c) => !c.ok);
      if (failed.length) throw new Error(`${failed.length} reconciliation check(s) failed; nothing was changed`);
      report = { imported, checks: checks.map((c) => ({ ...c })) };
      await t`insert into legacy.import_runs (source_fingerprint, target_fingerprint, report) values (${t.json(sourceFp)}, ${t.json(targetFp)}, ${t.json(report)})`;
      if (dryRun) throw new DryRun();
    });
  });
  console.log("\nMIGRATION COMMITTED: every check passed.");
} catch (e) {
  if (e instanceof DryRun) console.log("\nDRY RUN: every check passed; rolled back, the target is unchanged.");
  else { console.error("\nMIGRATION FAILED, rolled back:", e.message); process.exitCode = 1; }
} finally {
  await src.end(); await dst.end();
}
