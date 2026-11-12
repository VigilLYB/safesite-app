/**
 * After every live run: delete what the run created, so the database ends as it started.
 * Needs E2E_DATABASE_URL (see the README). Without it nothing is deleted: the suites' own afterAll
 * only retires their reports (reject / finish), and this says so loudly and keeps the manifest.
 */
const fs = require("node:fs");
const { purge, readManifest } = require("./purge");

module.exports = async () => {
  const file = process.env.E2E_MANIFEST;
  const created = readManifest(file);
  const total = created.incident.length + created.user.length + created.blueprint.length;
  if (total === 0) return;
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    process.stderr.write(
      `\nE2E: ${total} created rows were NOT deleted (E2E_DATABASE_URL is not set).\n` +
        `     Delete them later with: E2E_DATABASE_URL=… node e2e/purge.js ${file}\n`,
    );
    return;
  }
  const { deleted, kept } = await purge(file, url);
  process.stdout.write(`\nE2E purge deleted: ${JSON.stringify(deleted)}\n`);
  if (kept.length > 0) {
    // Kept on purpose; the manifest stays so the leftovers can be found again.
    process.stderr.write(
      `E2E purge kept ${kept.length} report(s) that a non-test report is linked under: ${kept.join(", ")}\n`,
    );
    return;
  }
  fs.rmSync(file, { force: true });
};
