/**
 * Retention job for public forms: deletes contact-page submissions older than
 * FORM_SUBMISSION_RETENTION_MONTHS and complaint attachments that were uploaded but never attached
 * within GRIEVANCE_UPLOAD_TTL_HOURS. Run from cron or a scheduled task: `npm run forms:purge`. Safe to re-run.
 */
import "dotenv/config";
import { purgeExpiredSubmissions } from "../src/features/forms/service";
import { purgeExpiredGrievanceUploads } from "../src/features/grievances/attachments";
import { db } from "../src/lib/db";

Promise.all([purgeExpiredSubmissions(), purgeExpiredGrievanceUploads()])
  .then(([n, m]) => console.log(`Deleted ${n} expired form submission(s) and ${m} unattached complaint upload(s).`))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
