// Flags DRAFT manuscripts with an attached file that haven't been touched
// in 30+ days — abandoned uploads, most likely never going anywhere.
//
// Scope, honestly: this only catches files we actually know about (a
// confirmed upload has a manuscripts.file_url). A file that reached R2 via
// a presigned PUT but never got its confirmUploadAction call (browser
// closed mid-flow, network drop between the two steps) is invisible to our
// database entirely — there's no row anywhere pointing at it. Catching
// *those* orphans requires an R2-side lifecycle rule keyed on object age,
// not a database query; see docs/BACKUP_RECOVERY.md for that.
//
// Read-only — lists candidates, deletes nothing. Run manually:
//   npx tsx scripts/audit-stale-drafts.ts

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const STALE_DAYS = 30;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const staleDrafts = await prisma.manuscript.findMany({
    where: {
      status: "DRAFT",
      file_url: { not: null },
      updated_at: { lt: cutoff },
    },
    orderBy: { updated_at: "asc" },
  });

  if (staleDrafts.length === 0) {
    console.log(`No DRAFT manuscripts with an attached file older than ${STALE_DAYS} days.`);
    return;
  }

  const authorIds = [...new Set(staleDrafts.map((m) => m.primary_author_id))];
  const authors = await prisma.user.findMany({ where: { id: { in: authorIds } } });
  const emailById = new Map(authors.map((a) => [a.id, a.email]));

  console.log(`${staleDrafts.length} stale draft(s) with an attached file (older than ${STALE_DAYS} days):\n`);
  for (const m of staleDrafts) {
    const daysStale = Math.floor((Date.now() - m.updated_at.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`- ${m.id}`);
    console.log(`  title: ${m.title || "(untitled)"}`);
    console.log(`  author: ${emailById.get(m.primary_author_id) ?? "unknown"}`);
    console.log(`  file: ${m.file_url}`);
    console.log(`  last updated: ${m.updated_at.toISOString()} (${daysStale} days ago)\n`);
  }

  console.log("Nothing was deleted — this is a read-only report. Review before taking any action.");
}

main()
  .catch((err) => {
    console.error("Audit failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
