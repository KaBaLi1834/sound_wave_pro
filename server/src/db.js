import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
const user = process.env.NEO4J_USER || "neo4j";
const password = process.env.NEO4J_PASSWORD || "soundwave_dev_secret";

export const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

export async function verifyConnectivity() {
  await driver.verifyConnectivity();
}

export function session() {
  return driver.session({ database: process.env.NEO4J_DATABASE || "neo4j" });
}
