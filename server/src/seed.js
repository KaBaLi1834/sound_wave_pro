/**
 * Seeds Neo4j with 40 products, co-purchase graph edges, and sample reviews.
 * Run: cd server && npm install && cp .env.example .env && npm run seed
 */
import { randomInt, randomUUID } from "node:crypto";
import { neo4jConnectionSummary, session, verifyConnectivity } from "./db.js";

const CATEGORY_PLANS = [
  { category: "EARPODS", sub: "True Wireless", count: 12 },
  { category: "SPEAKERS", sub: "Portable / shelf", count: 8 },
  { category: "HEADPHONES", sub: "Over-ear / on-ear", count: 10 },
  { category: "SOUNDBAR", sub: "Home cinema", count: 5 },
  { category: "ACCESSORY", sub: "Cases, cables, DAC", count: 5 },
];

const PREFIX = {
  EARPODS: ["Aura", "Pulse", "Nimbus", "Vertex", "Lumen", "Echo", "Stride", "Halo"],
  SPEAKERS: ["Arc", "Monolith", "Field", "Studio", "Column", "Drift"],
  HEADPHONES: ["Aeon", "Phantom", "Meridian", "Signal", "Forge", "Canvas"],
  SOUNDBAR: ["Horizon", "Ridge", "Vault", "Frame"],
  ACCESSORY: ["Shield", "Link", "Core", "Vault", "Sleeve"],
};

function slugify(name, idx) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${idx}`;
}

function buildProducts() {
  let idx = 0;
  const list = [];
  for (const plan of CATEGORY_PLANS) {
    const pool = PREFIX[plan.category];
    for (let i = 0; i < plan.count; i++) {
      idx += 1;
      const series = pool[i % pool.length];
      const kind =
        plan.category === "EARPODS"
          ? "Earpods"
          : plan.category === "SPEAKERS"
            ? "Speaker"
            : plan.category === "HEADPHONES"
              ? "Headphones"
              : plan.category === "SOUNDBAR"
                ? "Soundbar"
                : "Accessory";
      const name = `${series} ${kind} ${idx}`;
      const priceInr =
        plan.category === "ACCESSORY"
          ? randomInt(899, 8999)
          : plan.category === "EARPODS"
            ? randomInt(2999, 18999)
            : plan.category === "SPEAKERS"
              ? randomInt(4999, 34999)
              : plan.category === "HEADPHONES"
                ? randomInt(5999, 42999)
                : randomInt(12999, 89999);
      const slug = slugify(name, idx);
      list.push({
        id: randomUUID(),
        slug,
        name,
        description: `${name} — engineered for clarity, low distortion, and reliable wireless performance. Tuned in-house; two-year limited warranty.`,
        priceInr,
        category: plan.category,
        subcategory: plan.sub,
        stock: randomInt(5, 120),
        salesCount: randomInt(0, 5000),
      });
    }
  }
  return list;
}

async function run() {
  await verifyConnectivity();
  const s = session();
  const products = buildProducts();
  if (products.length !== 40) {
    throw new Error(`Expected 40 products, got ${products.length}`);
  }

  try {
    await s.executeWrite(async (tx) => {
      await tx.run(`MATCH (n) DETACH DELETE n`);
    });
    // Neo4j 5+: schema DDL cannot share a transaction with data writes.
    await s.executeWrite(async (tx) => {
      await tx.run(
        `CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE`,
      );
      await tx.run(
        `CREATE CONSTRAINT product_slug IF NOT EXISTS FOR (p:Product) REQUIRE p.slug IS UNIQUE`,
      );
      await tx.run(
        `CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE`,
      );
      await tx.run(
        `CREATE CONSTRAINT review_id IF NOT EXISTS FOR (r:Review) REQUIRE r.id IS UNIQUE`,
      );
    });

    await s.executeWrite(async (tx) => {
      for (const p of products) {
        await tx.run(
          `
          CREATE (x:Product {
            id: $id,
            slug: $slug,
            name: $name,
            description: $description,
            priceInr: $priceInr,
            category: $category,
            subcategory: $subcategory,
            stock: $stock,
            salesCount: $salesCount
          })
        `,
          p,
        );
      }
    });

    await s.executeWrite(async (tx) => {
      for (const p of products) {
        const targets = new Set();
        while (targets.size < 4) {
          const other = products[randomInt(0, products.length)];
          if (other.id !== p.id) targets.add(other.id);
        }
        for (const tid of targets) {
          const weight = randomInt(3, 99);
          await tx.run(
            `
            MATCH (a:Product {id: $a}), (b:Product {id: $b})
            MERGE (a)-[r:CO_PURCHASED]->(b)
            ON CREATE SET r.weight = $weight
            ON MATCH SET r.weight = r.weight + $weight
          `,
            { a: p.id, b: tid, weight },
          );
        }
      }
    });

    const reviewAuthors = [
      "Aditi Rao",
      "Rohan Mehta",
      "Neha Kulkarni",
      "Vikram Singh",
      "Sara Ali",
      "Dev Patel",
      "Isha Nair",
      "Arjun Bose",
    ];

    await s.executeWrite(async (tx) => {
      let ridx = 0;
      for (let n = 0; n < 36; n++) {
        const p = products[randomInt(0, products.length)];
        ridx += 1;
        const rating = randomInt(3, 5);
        const title =
          rating >= 4 ? "Excellent value" : rating === 3 ? "Solid, a few caveats" : "Mixed experience";
        const body =
          rating >= 4
            ? "Clear mids, controlled bass, and comfortable for long sessions. Pairing was instant."
            : "Sound is good for the price. Battery met expectations; case could be sturdier.";
        await tx.run(
          `
          CREATE (r:Review {
            id: $id,
            rating: $rating,
            title: $title,
            body: $body,
            authorName: $authorName,
            createdAt: datetime()
          })
          WITH r
          MATCH (p:Product {id: $pid})
          CREATE (r)-[:FOR]->(p)
        `,
          {
            id: randomUUID(),
            rating,
            title,
            body,
            authorName: reviewAuthors[randomInt(0, reviewAuthors.length)],
            pid: p.id,
          },
        );
      }
    });

    await s.executeWrite(async (tx) => {
      const terms = [
        "noise cancelling",
        "earpods",
        "bluetooth speaker",
        "soundbar",
        "gaming headset",
        "usb-c dac",
        "studio monitor",
      ];
      for (const term of terms) {
        await tx.run(
          `
          MERGE (s:SearchStat {term: $term})
          ON CREATE SET s.count = $c, s.lastAt = datetime()
          ON MATCH SET s.count = coalesce(s.count,0) + $c, s.lastAt = datetime()
        `,
          { term, c: randomInt(20, 800) },
        );
      }
    });

    console.log(`Seeded ${products.length} products, co-purchase edges, reviews, and search stats.`);
  } finally {
    await s.close();
  }
}

function printNeo4jAuthHelp(err) {
  const msg = String(err?.message || err);
  if (
    !msg.includes("Unauthorized") &&
    !msg.includes("unauthorized") &&
    err?.code !== "Neo.ClientError.Security.Unauthorized"
  ) {
    return;
  }
  const info = neo4jConnectionSummary();
  console.error("\n--- Neo4j authentication failed ---");
  console.error("Using URI:", info.uri);
  console.error("Using USER:", info.user, "(Aura must be exactly: neo4j)");
  console.error("Password set:", info.passwordSet ? "yes" : "NO — add NEO4J_PASSWORD in server/.env");
  console.error("\nFix checklist:");
  console.error("1. Aura console → your instance → Reset password → copy the NEW password into NEO4J_PASSWORD=");
  console.error("2. URI must match Aura \"Connect\" (neo4j+s://....databases.neo4j.io) — no typos.");
  console.error("3. .env: no spaces around = ; if password has # or $ wrap in double quotes.");
  console.error("4. Aura → Network / Access: allow your IP or 0.0.0.0/0 while testing.");
  console.error("5. Instance must be Running (not paused).\n");
}

run().catch((e) => {
  printNeo4jAuthHelp(e);
  console.error(e);
  process.exit(1);
});
