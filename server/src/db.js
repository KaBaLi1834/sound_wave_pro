import { fileURLToPath } from "node:url";
import neo4j from "neo4j-driver";
import dotenv from "dotenv";

// override: true so server/.env wins over stale NEO4J_* exported in your shell
dotenv.config({
  path: new URL("../.env", import.meta.url),
  override: true,
});

function envTrim(key, fallback) {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  return String(v).trim();
}

const uri = envTrim("NEO4J_URI", "bolt://localhost:7687");
const user = envTrim("NEO4J_USER", "neo4j");
const password = envTrim("NEO4J_PASSWORD", "soundwave_dev_secret");
/** When unset/empty, open sessions without `database` so the server default graph is used (needed for some Aura setups that have no `neo4j` database). */
function envDatabaseName() {
  const v = process.env.NEO4J_DATABASE;
  if (v == null || v === "") return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}
const database = envDatabaseName();

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function verifyConnectivity() {
  await driver.verifyConnectivity();
}

export function session() {
  return database == null ? driver.session() : driver.session({ database });
}

/**
 * User graph name for the active session (Aura often uses the instance id from the URI, not "neo4j").
 * Use this in Neo4j Browser’s database picker / :use `name`.
 */
export async function resolveGraphDatabaseName(s) {
  try {
    const r = await s.run(
      "SHOW DATABASES YIELD name, home WHERE home = true RETURN name LIMIT 1",
    );
    const n = r.records[0]?.get("name");
    if (n != null) return String(n);
  } catch {
    /* */
  }
  try {
    const r = await s.run("SHOW CURRENT DATABASE");
    const n = r.records[0]?.get("name");
    if (n != null) return String(n);
  } catch {
    /* editions where SHOW CURRENT DATABASE is unsupported */
  }
  return null;
}

/** For debugging (no secrets in URI for Aura — password is separate). */
export function neo4jConnectionSummary() {
  return {
    uri,
    user,
    database: database ?? "(server default)",
    passwordSet: Boolean(password && password.length > 0),
    passwordLength: password ? password.length : 0,
    envFile: fileURLToPath(new URL("../.env", import.meta.url)),
  };
}
