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
const database = envTrim("NEO4J_DATABASE", "neo4j");

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function verifyConnectivity() {
  await driver.verifyConnectivity();
}

export function session() {
  return driver.session({ database });
}

/** For debugging (no secrets in URI for Aura — password is separate). */
export function neo4jConnectionSummary() {
  return {
    uri,
    user,
    database,
    passwordSet: Boolean(password && password.length > 0),
    passwordLength: password ? password.length : 0,
    envFile: fileURLToPath(new URL("../.env", import.meta.url)),
  };
}
