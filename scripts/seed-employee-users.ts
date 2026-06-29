/**
 * One-off backfill: create a User row (with the same default password used by
 * the Quick Add flow in `app/api/employees/route.ts`) for every legacy
 * Employee that was created before the auto-link logic landed, then point
 * `employee.userId` at the new/reused user.
 *
 * Properties:
 *  - Idempotent — safe to run multiple times. Only processes employees whose
 *    `userId IS NULL`. If a User with the employee's email already exists
 *    (e.g. they self-registered through `/api/auth/register`), we reuse it
 *    without touching its password.
 *  - `--dry-run` reports what would change without touching the DB.
 *  - Exits non-zero on error so CI / manual recovery is obvious.
 *
 * NOTE on concurrency: the findUnique-then-create (and findUnique-then-update
 * on Employee) sequence has a small TOCTOU window. Two simultaneous runs would
 * let both miss the existing row and one would fail with a P2002 / unique
 * violation. That's acceptable for a manual one-off; rerun the script and
 * the second pass will succeed.
 *
 * Usage:
 *   npm run seed:employee-users             # apply changes
 *   npm run seed:employee-users -- --dry-run # preview only
 *
 * Requires DATABASE_URL in the environment. `tsx --env-file=.env ...` loads
 * it automatically when invoked via the npm script.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "password123";
// Match the cost factor used in `app/api/employees/route.ts` and
// `app/api/auth/change-password/route.ts` so newly-minted accounts behave
// identically to ones created by the Quick Add flow.
const BCRYPT_ROUNDS = 12;

const isDryRun = process.argv.slice(2).includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Load it via `tsx --env-file=.env` or your shell before running.",
  );
  process.exit(1);
}

// Use the same Prisma + pg-adapter setup as `lib/prisma.ts` so connection
// behavior matches the rest of the app (e.g. SSL mode, pooling).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type UnlinkedEmployee = {
  id: string;
  name: string;
  email: string;
  role: string;
};

async function main() {
  const unlinked: UnlinkedEmployee[] = await prisma.employee.findMany({
    where: { userId: null },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  if (unlinked.length === 0) {
    console.log("✅ No unlinked employees. Nothing to do.");
    return;
  }

  console.log(
    `Found ${unlinked.length} unlinked employee${
      unlinked.length === 1 ? "" : "s"
    }.${isDryRun ? " (dry run — no writes)" : ""}\n`,
  );

  // Hash once: every newly-created User gets the same password, so we can
  // skip re-hashing per row.
  const hashedDefault = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

  let created = 0;
  let reused = 0;
  let linked = 0;
  let skipped = 0;

  for (const emp of unlinked) {
    if (
      typeof emp.email !== "string" ||
      // Cheap shape check rather than a full RFC-5322 parser: skip rows with
      // obviously-malformed legacy data so we don't pollute `users` with
      // garbage like "@" or "a@@b".
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email)
    ) {
      console.warn(
        `⚠  Skipping ${emp.id} (${emp.name ?? "(no name)"}): missing/invalid email "${emp.email ?? ""}".`,
      );
      skipped++;
      continue;
    }

    let userId: string;
    let createdNewUser: boolean;

    if (isDryRun) {
      // In dry-run we skip the DB read so we don't generate noise; the
      // "would create" / "would reuse" classification is enough.
      const existing = await prisma.user.findUnique({
        where: { email: emp.email },
        select: { id: true },
      });
      if (existing) {
        userId = existing.id;
        createdNewUser = false;
        reused++;
        console.log(
          `✓ ${emp.name} <${emp.email}> → would link to existing user ${userId}`,
        );
      } else {
        userId = "<dry-run>";
        createdNewUser = true;
        created++;
        console.log(
          `✓ ${emp.name} <${emp.email}> → would create new user + link`,
        );
      }
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { email: emp.email },
        select: { id: true },
      });

      if (existingUser) {
        userId = existingUser.id;
        createdNewUser = false;
        reused++;
        console.log(
          `✓ ${emp.name} <${emp.email}> → existing user ${userId} (linked)`,
        );
      } else {
        const newUser = await prisma.user.create({
          data: {
            email: emp.email,
            name: emp.name,
            password: hashedDefault,
            role: "USER",
          },
        });
        userId = newUser.id;
        createdNewUser = true;
        created++;
        console.log(
          `✓ ${emp.name} <${emp.email}> → new user ${userId} (linked)`,
        );
      }
    }

    if (!isDryRun) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { userId },
      });
    }
    linked++;
  }

  const suffix = isDryRun ? " (dry run)" : "";
  console.log(
    `\nDone${suffix}. Created: ${created}, Reused: ${reused}, Linked: ${linked}, Skipped: ${skipped}.`,
  );

  if (isDryRun) {
    console.log("Re-run without --dry-run to apply these changes.");
  } else if (created > 0) {
    // Only echo the default password when we actually minted new accounts this
    // run. On a re-run that links everything to pre-existing users, this line
    // would mislead the operator into thinking new credentials were issued.
    console.log(
      `\nNew accounts were minted with the default password "${DEFAULT_PASSWORD}". Share it with each backfilled employee so they can sign in and change it from their profile page.`,
    );
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
