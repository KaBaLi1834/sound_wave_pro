import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { randomUUID } from "node:crypto";
import neo4j from "neo4j-driver";
import { driver, session, verifyConnectivity } from "./db.js";

function trimUrl(u) {
  return String(u || "").replace(/\/$/, "");
}

const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";
const ALLOWED_ORIGINS = String(
  process.env.FRONTEND_URL || "http://localhost:5173",
)
  .split(",")
  .map((s) => trimUrl(s.trim()))
  .filter(Boolean);
/** First FRONTEND_URL entry — used for OAuth redirects. */
const FRONTEND_PRIMARY = ALLOWED_ORIGINS[0] || "http://localhost:5173";
const API_PUBLIC_URL = trimUrl(
  process.env.API_PUBLIC_URL || `http://localhost:${PORT}`,
);

const app = express();
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const o = trimUrl(origin);
      if (ALLOWED_ORIGINS.includes(o)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(passport.initialize());

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function getUserById(id) {
  const s = session();
  try {
    const r = await s.run(`MATCH (u:User {id: $id}) RETURN u`, { id });
    if (r.records.length === 0) return null;
    return r.records[0].get("u").properties;
  } finally {
    await s.close();
  }
}

async function ensureGoogleStrategy() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return false;
  passport.use(
    new GoogleStrategy(
      {
        clientID: id,
        clientSecret: secret,
        callbackURL: `${API_PUBLIC_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));
          const name = profile.displayName || email.split("@")[0];
          const googleId = profile.id;
          const s = session();
          try {
            const existing = await s.run(
              `MATCH (u:User) WHERE u.googleId = $googleId OR u.email = $email RETURN u LIMIT 1`,
              { googleId, email },
            );
            if (existing.records.length) {
              const u = existing.records[0].get("u").properties;
              if (!u.googleId) {
                await s.run(
                  `MATCH (u:User {id: $id}) SET u.googleId = $googleId`,
                  { id: u.id, googleId },
                );
              }
              return done(null, u);
            }
            const uid = randomUUID();
            await s.run(
              `
              CREATE (u:User {
                id: $id,
                email: $email,
                name: $name,
                googleId: $googleId,
                createdAt: datetime()
              })
            `,
              { id: uid, email, name, googleId },
            );
            const u = await getUserById(uid);
            return done(null, u);
          } finally {
            await s.close();
          }
        } catch (e) {
          return done(e);
        }
      },
    ),
  );
  return true;
}

const googleReady = await ensureGoogleStrategy();

/** Liveness only — always 200 so Railway/proxies do not mark the service down when Neo4j is misconfigured. */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/health/neo4j", async (_req, res) => {
  try {
    await verifyConnectivity();
    res.json({ ok: true, neo4j: "connected" });
  } catch (e) {
    res.status(503).json({ ok: false, error: String(e?.message || e) });
  }
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "soundwave-api" });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  if (password.length < 6) return res.status(400).json({ error: "Password too short" });
  const hash = await bcrypt.hash(password, 10);
  const s = session();
  try {
    const check = await s.run(`MATCH (u:User {email: $email}) RETURN u`, { email });
    if (check.records.length) return res.status(409).json({ error: "Email already registered" });
    const id = randomUUID();
    await s.run(
      `
      CREATE (u:User {
        id: $id,
        email: $email,
        name: $name,
        passwordHash: $hash,
        createdAt: datetime()
      })
    `,
      { id, email, name: name || email.split("@")[0], hash },
    );
    const user = await getUserById(id);
    res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name } });
  } finally {
    await s.close();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing credentials" });
  const s = session();
  try {
    const r = await s.run(`MATCH (u:User {email: $email}) RETURN u`, { email });
    if (!r.records.length) return res.status(401).json({ error: "Invalid email or password" });
    const u = r.records[0].get("u").properties;
    if (!u.passwordHash) return res.status(401).json({ error: "Use Google to sign in for this account" });
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });
    res.json({ token: signToken(u), user: { id: u.id, email: u.email, name: u.name } });
  } finally {
    await s.close();
  }
});

app.get("/api/me", authRequired, async (req, res) => {
  const u = await getUserById(req.user.sub);
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json({
    user: {
      id: String(u.id),
      email: u.email,
      name: u.name,
    },
  });
});

if (googleReady) {
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], session: false }),
  );
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_PRIMARY}/auth/callback?error=google` }),
    (req, res) => {
      const user = req.user;
      const token = signToken(user);
      res.redirect(`${FRONTEND_PRIMARY}/auth/callback?token=${encodeURIComponent(token)}`);
    },
  );
} else {
  app.get("/api/auth/google", (_req, res) => {
    res.status(501).json({
      error: "Google OAuth not configured",
      hint: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the API server.",
    });
  });
}

function mapProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceInr: neoIntToNumber(p.priceInr),
    category: p.category,
    subcategory: p.subcategory,
    stock: neoIntToNumber(p.stock),
    salesCount: neoIntToNumber(p.salesCount),
  };
}

function neoIntToNumber(v) {
  if (v == null) return v;
  if (typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
  return Number(v);
}

app.get("/api/search", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (q.length < 2) return res.json({ products: [] });
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (p:Product)
      WHERE toLower(p.name) CONTAINS toLower($q)
         OR toLower(p.description) CONTAINS toLower($q)
         OR toLower(p.category) CONTAINS toLower($q)
      RETURN p
      LIMIT 24
    `,
      { q },
    );
    const list = r.records.map((rec) => mapProduct(rec.get("p").properties));
    res.json({ products: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/products", async (req, res) => {
  const category = req.query.category || null;
  const min = req.query.minPrice != null ? Number(req.query.minPrice) : null;
  const max = req.query.maxPrice != null ? Number(req.query.maxPrice) : null;
  const sort = (req.query.sort || "bestseller").toString();
  const s = session();
  try {
    let orderBy = "p.salesCount DESC";
    if (sort === "price_asc") orderBy = "p.priceInr ASC";
    if (sort === "price_desc") orderBy = "p.priceInr DESC";
    if (sort === "name") orderBy = "p.name ASC";
    const r = await s.run(
      `
      MATCH (p:Product)
      WHERE ($category IS NULL OR p.category = $category)
        AND ($min IS NULL OR p.priceInr >= $min)
        AND ($max IS NULL OR p.priceInr <= $max)
      RETURN p
      ORDER BY ${orderBy}
    `,
      { category, min, max },
    );
    const list = r.records.map((rec) => mapProduct(rec.get("p").properties));
    res.json({ products: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/products/bestsellers", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 40);
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (p:Product)
      RETURN p
      ORDER BY p.salesCount DESC
      LIMIT $limit
    `,
      { limit: neo4j.int(limit) },
    );
    const list = r.records.map((rec) => mapProduct(rec.get("p").properties));
    res.json({ products: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/products/:slug/frequently-bought-together", async (req, res) => {
  const { slug } = req.params;
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (p:Product {slug: $slug})
      MATCH (p)-[rel:CO_PURCHASED]-(other:Product)
      RETURN other, rel.weight AS weight
      ORDER BY weight DESC
      LIMIT $limit
    `,
      { slug, limit: neo4j.int(limit) },
    );
    const list = r.records.map((rec) => ({
      ...mapProduct(rec.get("other").properties),
      weight: neoIntToNumber(rec.get("weight")),
    }));
    res.json({ products: list });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/products/:slug/reviews", async (req, res) => {
  const { slug } = req.params;
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (rev:Review)-[:FOR]->(p:Product {slug: $slug})
      RETURN rev
      ORDER BY rev.createdAt DESC
    `,
      { slug },
    );
    const reviews = r.records.map((rec) => {
      const rv = rec.get("rev").properties;
      return {
        id: rv.id,
        rating: neoIntToNumber(rv.rating),
        title: rv.title,
        body: rv.body,
        authorName: rv.authorName,
        createdAt: rv.createdAt?.toString?.() ?? String(rv.createdAt),
      };
    });
    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/products/:slug", async (req, res) => {
  const { slug } = req.params;
  const s = session();
  try {
    const r = await s.run(`MATCH (p:Product {slug: $slug}) RETURN p`, { slug });
    if (!r.records.length) return res.status(404).json({ error: "Not found" });
    res.json({ product: mapProduct(r.records[0].get("p").properties) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.post("/api/products/:slug/reviews", authRequired, async (req, res) => {
  const { slug } = req.params;
  const { rating, title, body } = req.body || {};
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: "Rating 1-5 required" });
  if (!title || !body) return res.status(400).json({ error: "Title and body required" });
  const uid = req.user.sub;
  const s = session();
  try {
    const p = await s.run(`MATCH (p:Product {slug: $slug}) RETURN p`, { slug });
    if (!p.records.length) return res.status(404).json({ error: "Product not found" });
    const rid = randomUUID();
    await s.run(
      `
      MATCH (u:User {id: $uid})
      MATCH (p:Product {slug: $slug})
      CREATE (r:Review {
        id: $rid,
        rating: $rating,
        title: $title,
        body: $body,
        authorName: u.name,
        createdAt: datetime()
      })
      CREATE (r)-[:FOR]->(p)
      CREATE (u)-[:WROTE]->(r)
    `,
      { uid, slug, rid, rating: neo4j.int(r), title, body },
    );
    res.json({ ok: true, id: rid });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.post("/api/search/track", async (req, res) => {
  const { sessionId, term, productSlug } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const t = term ? String(term).trim().toLowerCase() : null;
  const s = session();
  try {
    await s.run(
      `
      CREATE (e:SearchEvent {
        id: $eid,
        sessionId: $sessionId,
        term: $term,
        productSlug: $productSlug,
        at: datetime()
      })
    `,
      { eid: randomUUID(), sessionId, term: t || null, productSlug: productSlug || null },
    );
    if (t) {
      await s.run(
        `
        MERGE (st:SearchStat {term: $term})
        ON CREATE SET st.count = 1, st.lastAt = datetime()
        ON MATCH SET st.count = coalesce(st.count, 0) + 1, st.lastAt = datetime()
      `,
        { term: t },
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/search/recent", async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: "sessionId required" });
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (e:SearchEvent {sessionId: $sessionId})
      WHERE e.term IS NOT NULL
      RETURN e.term AS term, e.at AS at
      ORDER BY e.at DESC
      LIMIT 12
    `,
      { sessionId },
    );
    const terms = [];
    const seen = new Set();
    for (const rec of r.records) {
      const term = rec.get("term");
      if (term && !seen.has(term)) {
        seen.add(term);
        terms.push(term);
      }
    }
    res.json({ terms });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/search/trending", async (_req, res) => {
  const s = session();
  try {
    const r = await s.run(
      `
      MATCH (st:SearchStat)
      RETURN st.term AS term, st.count AS count
      ORDER BY st.count DESC
      LIMIT 12
    `,
    );
    const trending = r.records.map((rec) => ({
      term: rec.get("term"),
      count: neoIntToNumber(rec.get("count")),
    }));
    res.json({ trending });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.get("/api/meta/categories", async (_req, res) => {
  const s = session();
  try {
    const r = await s.run(`
      MATCH (p:Product)
      RETURN DISTINCT p.category AS category
      ORDER BY category
    `);
    res.json({ categories: r.records.map((x) => x.get("category")) });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.post("/api/orders", authRequired, async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items required" });
  const uid = req.user.sub;
  const s = session();
  try {
    let total = 0;
    const lines = [];
    for (const line of items) {
      const pid = line.productId;
      const qty = Number(line.quantity);
      if (!pid || !Number.isFinite(qty) || qty < 1) continue;
      const pr = await s.run(`MATCH (p:Product {id: $id}) RETURN p`, { id: pid });
      if (!pr.records.length) continue;
      const p = pr.records[0].get("p").properties;
      const price = neoIntToNumber(p.priceInr);
      total += price * qty;
      lines.push({ productId: pid, qty, price });
    }
    if (lines.length === 0) return res.status(400).json({ error: "No valid lines" });
    const oid = randomUUID();
    await s.run(
      `
      MATCH (u:User {id: $uid})
      CREATE (o:Order {id: $oid, totalInr: $total, createdAt: datetime()})
      CREATE (u)-[:PLACED]->(o)
    `,
      { uid, oid, total: neo4j.int(Math.round(total)) },
    );
    for (const ln of lines) {
      await s.run(
        `
        MATCH (o:Order {id: $oid})
        MATCH (p:Product {id: $pid})
        CREATE (o)-[:CONTAINS {qty: $qty, unitPrice: p.priceInr}]->(p)
        SET p.salesCount = coalesce(p.salesCount, 0) + $qty
      `,
        { oid, pid: ln.productId, qty: neo4j.int(ln.qty) },
      );
    }
    res.json({ ok: true, orderId: oid, totalInr: total });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  } finally {
    await s.close();
  }
});

app.listen(PORT, "0.0.0.0", async () => {
  try {
    await verifyConnectivity();
    console.log(`[api] listening on port ${PORT} | public base: ${API_PUBLIC_URL} | Neo4j OK`);
  } catch (e) {
    console.error("[api] Neo4j failed:", e?.message || e);
    console.log(`[api] listening on port ${PORT} (Neo4j unreachable — check NEO4J_URI)`);
  }
});
