// Writes resources/server-config.json — the Atlas connection the embedded server
// uses. The URI is a secret, so it never lives in the repo: it comes from the
// MONGODB_URI environment variable (a GitHub Actions secret in CI) or, for local
// builds, from apps/server/.env. The file itself is gitignored.
import fs from "node:fs";
import path from "node:path";

function fromEnvFile() {
  try {
    const txt = fs.readFileSync(path.resolve("../server/.env"), "utf8");
    const get = (k) => (txt.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1];
    return { uri: get("MONGODB_URI"), db: get("MONGODB_DB") };
  } catch {
    return {};
  }
}

const file = fromEnvFile();
const mongodbUri = process.env.MONGODB_URI || file.uri;
const mongodbDb = process.env.MONGODB_DB || file.db || "bureau_ordre";

if (!mongodbUri) {
  console.error(
    "gen-server-config: no MONGODB_URI found. Set the MONGODB_URI env var (CI secret) " +
      "or provide apps/server/.env.",
  );
  process.exit(1);
}

fs.mkdirSync("resources", { recursive: true });
fs.writeFileSync(
  "resources/server-config.json",
  JSON.stringify({ mongodbUri, mongodbDb }, null, 2),
);
console.log(`gen-server-config: wrote resources/server-config.json (db=${mongodbDb})`);
