/** Starts each live run with an empty manifest of created entities (see e2e/purge.js). */
const fs = require("node:fs");
const path = require("node:path");

module.exports = async () => {
  const file = process.env.E2E_MANIFEST;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "");
};
