/**
 * Import a Gram Panchayat content dataset (data/gp-datasets/<name>.json) into a website.
 *
 *   npx tsx scripts/import-gp-dataset.ts --tenant savardari --dataset ganeshwadi --dry-run   # report only
 *   npx tsx scripts/import-gp-dataset.ts --tenant savardari --dataset ganeshwadi             # import
 *
 * The dataset's pictures and PDFs must already be in public/ (they are committed with the dataset).
 * See src/features/content-import/import-gp-dataset.ts for exactly what is changed. Uses DATABASE_URL like the
 * other scripts; run against production only on purpose.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gpDatasetSchema } from "../src/features/content-import/gp-dataset";
import { importGpDataset } from "../src/features/content-import/import-gp-dataset";
import { db } from "../src/lib/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const tenantSlug = arg("tenant");
  const name = arg("dataset");
  const dryRun = process.argv.includes("--dry-run");
  if (!tenantSlug || !name || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error("Usage: npx tsx scripts/import-gp-dataset.ts --tenant <slug> --dataset <name> [--dry-run]");
  }
  const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "gp-datasets", `${name}.json`), "utf8")) as unknown;
  const parsed = gpDatasetSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid dataset: ${parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);

  const r = await importGpDataset(db, { tenantSlug, dataset: parsed.data, datasetName: name, dryRun });
  const tag = dryRun ? "[dry run] would" : "";
  console.log(`Website: ${r.tenant}  (dataset: ${name})`);
  console.log(`Media: ${tag} create ${r.media.created}, reuse ${r.media.reused}`);
  console.log(`Settings: ${r.settings}`);
  console.log(`Sections ${tag} publish ${r.sections.published.length}: ${r.sections.published.join(", ")}`);
  console.log(`Sections unchanged ${r.sections.unchanged.length}: ${r.sections.unchanged.join(", ")}`);
  if (r.sections.invalid.length) console.log(`Sections skipped (invalid) ${r.sections.invalid.length}:\n  ${r.sections.invalid.join("\n  ")}`);
  console.log(`Schemes: ${tag} create ${r.schemes.created}, update ${r.schemes.updated}, archive ${r.schemes.archived}`);
  console.log(`Announcements: ${tag} create ${r.announcements.created}, update ${r.announcements.updated}, archive ${r.announcements.archived}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
