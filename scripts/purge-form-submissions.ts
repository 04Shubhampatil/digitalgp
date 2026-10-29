/**
 * Retention job for contact-page submissions. Deletes rows older than FORM_SUBMISSION_RETENTION_MONTHS.
 * Run from cron or a scheduled task: `npm run forms:purge`. Safe to re-run.
 */
import "dotenv/config";
import { purgeExpiredSubmissions } from "../src/features/forms/service";
import { db } from "../src/lib/db";

purgeExpiredSubmissions()
  .then((n) => console.log(`Deleted ${n} expired form submission(s).`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
