/**
 * Deletes exactly the rows a live e2e run created, so the shared database ends as it started.
 *
 * The API has no DELETE endpoints and `incident_versions` is append-only (a trigger refuses
 * UPDATE/DELETE), so this talks to Postgres directly. It only ever touches ids the suites wrote to
 * the run manifest (one JSON line per created entity), never a time range or a text pattern.
 * The append-only trigger is disabled inside the same transaction and re-enabled before commit,
 * so no other session sees the table unprotected (ALTER TABLE holds an exclusive lock until then).
 *
 *   E2E_DATABASE_URL=postgres://… node e2e/purge.js <manifest.jsonl>
 *
 * Uploaded media in S3 is not removed here; the bucket's lifecycle rule deletes it after 14 days.
 */
const fs = require("node:fs");
const pg = require("pg");

function readManifest(file) {
  const out = { incident: new Set(), user: new Set(), blueprint: new Set() };
  if (file && fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const { kind, id } = JSON.parse(line);
      out[kind]?.add(id);
    }
  }
  return { incident: [...out.incident], user: [...out.user], blueprint: [...out.blueprint] };
}

/** @returns {Promise<{ deleted: Record<string, number>, kept: string[] }>} */
async function purge(file, databaseUrl) {
  const ids = readManifest(file);
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: local ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  const deleted = {};
  const run = async (label, sql, params) => {
    const { rowCount } = await client.query(sql, params);
    deleted[label] = rowCount;
  };
  try {
    await client.query("BEGIN");
    // A report that isn't ours but was linked under one of ours keeps that parent alive:
    // deleting it would rewrite someone else's history (and break the foreign key).
    const { rows: referenced } = await client.query(
      `SELECT DISTINCT v.cluster_parent_id AS id FROM incident_versions v
        WHERE v.cluster_parent_id = ANY($1::uuid[]) AND NOT (v.incident_id = ANY($1::uuid[]))`,
      [ids.incident],
    );
    const kept = referenced.map((r) => r.id);
    const incidents = ids.incident.filter((id) => !kept.includes(id));

    // ALTER TABLE refuses to run while deferred constraint checks are queued (incidents.head_version_id
    // is DEFERRABLE), so: disable before any DML, delete, flush the deferred checks, then re-enable.
    await client.query(
      "ALTER TABLE incident_versions DISABLE TRIGGER incident_versions_append_only",
    );
    await run("ppe_scans", "DELETE FROM ppe_scans WHERE incident_id = ANY($1::uuid[])", [
      incidents,
    ]);
    // action_milestones cascade with their action.
    await run("actions", "DELETE FROM actions WHERE incident_id = ANY($1::uuid[])", [incidents]);
    await run(
      "incident_versions",
      "DELETE FROM incident_versions WHERE incident_id = ANY($1::uuid[])",
      [incidents],
    );
    await run("incidents", "DELETE FROM incidents WHERE id = ANY($1::uuid[])", [incidents]);
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await client.query(
      "ALTER TABLE incident_versions ENABLE TRIGGER incident_versions_append_only",
    );
    // areas cascade with their blueprint.
    await run("blueprints", "DELETE FROM blueprints WHERE id = ANY($1::uuid[])", [ids.blueprint]);
    await run("users", "DELETE FROM users WHERE id = ANY($1::uuid[])", [ids.user]);
    await client.query("COMMIT");
    return { deleted, kept };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = { purge, readManifest };

if (require.main === module) {
  const [file] = process.argv.slice(2);
  const url = process.env.E2E_DATABASE_URL;
  if (!file || !url) {
    process.stderr.write("usage: E2E_DATABASE_URL=… node e2e/purge.js <manifest.jsonl>\n");
    process.exit(2);
  }
  purge(file, url).then(
    (result) => process.stdout.write(`${JSON.stringify(result)}\n`),
    (error) => {
      process.stderr.write(`purge failed: ${error.message}\n`);
      process.exit(1);
    },
  );
}
