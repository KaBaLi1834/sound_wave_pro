/**
 * Quick check: loads server/.env and tries to connect to Neo4j.
 * Run: cd server && npm run verify-neo4j
 */
import { driver, neo4jConnectionSummary, session } from "./db.js";

const info = neo4jConnectionSummary();
console.log("Env file:", info.envFile);
console.log("Trying Neo4j with:", {
  uri: info.uri,
  user: info.user,
  database: info.database,
  passwordSet: info.passwordSet,
  passwordLength: info.passwordLength,
});
if (info.passwordLength > 0 && info.passwordLength < 8) {
  console.warn(
    "Password looks very short — Aura passwords are usually longer; check for a truncated .env line (e.g. unquoted #)."
  );
}

try {
  await driver.verifyConnectivity();
  const s = session();
  try {
    await s.run("RETURN 1 AS ok");
  } finally {
    await s.close();
  }
  console.log("OK: connected, authenticated, and database session works.");
  process.exit(0);
} catch (e) {
  console.error("FAILED:", e.message || e);
  if (
    e?.code === "Neo.ClientError.Database.DatabaseNotFound" ||
    String(e?.message || "").includes("does not exist")
  ) {
    console.error(`
--- Database name ---

The server has no graph/database with the name you configured (often
NEO4J_DATABASE=neo4j). Some Aura instances only expose a default graph
under another name.

Fix: remove NEO4J_DATABASE from server/.env so the driver uses the
server default, or set NEO4J_DATABASE to the exact name from Aura
(Neo4j Browser: SHOW DATABASES).
`);
  }
  if (
    e?.code === "Neo.ClientError.Security.Unauthorized" ||
    String(e?.message || "").includes("Unauthorized")
  ) {
    console.error(`
--- Neo4j Aura: what is "username" vs "id"? ---

The hex string in your URL (e.g. 0fcd6dc1 in ...0fcd6dc1.databases.neo4j.io)
is the INSTANCE ID for routing. It is NOT the database login name.

For Bolt / drivers, the default superuser is always:
  Username:  neo4j
  Password:  the password YOU chose when the instance was created
             (or the new one after "Reset password" in Aura)

So in server/.env keep:
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=<exactly that instance password>

If you are unsure of the password: Aura console → your instance →
Reset database password → copy the new password into NEO4J_PASSWORD.

Also open Aura → Connect / Download connection details — it shows the
same URI and confirms Username: neo4j.

If passwordLength above does not match the password you pasted from Aura,
you are editing a different file than server/.env, or the line is broken
(e.g. # in the password without double quotes: NEO4J_PASSWORD="...#...").

If you ever ran export NEO4J_PASSWORD=... in a terminal, this app now
loads server/.env with override so the file wins — but restart the shell
or unset NEO4J_PASSWORD if you still see a wrong passwordLength.
`);
  }
  process.exit(1);
}
