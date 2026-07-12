/**
 * The Newport Studio — lead-capture chat widget server.
 * Plain Node.js, no dependencies.
 *
 *   node server.js          → http://localhost:3999
 *
 * Serves index.html and accepts POST /api/lead, appending each
 * completed chat conversation to leads.json in this folder.
 *
 * Guardrails:
 *  - request body capped at 10 KB (connection destroyed beyond that)
 *  - per-IP rate limit: 5 leads / 10 minutes
 *  - strict server-side validation + control-character stripping
 *  - writes to leads.json are serialized through a queue so
 *    concurrent requests can never corrupt the file
 *  - leads.json lives at a fixed path — nothing user-controlled
 *    ever touches the filesystem path
 *  - security headers (CSP, nosniff, frame-deny) on every response
 */

const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3999;
const LEADS_FILE = path.join(__dirname, "leads.json");
const INDEX_FILE = path.join(__dirname, "index.html");

const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/* ---------------------------------------------------------------- helpers */

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
};

function send(res, status, body, type = "application/json") {
  const payload = type === "application/json" ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "Content-Type": `${type}; charset=utf-8`,
    "Content-Length": Buffer.byteLength(payload),
    ...SECURITY_HEADERS,
  });
  res.end(payload);
}

/**
 * Strip control characters (code points below 32, plus DEL) and
 * collapse whitespace — done with char codes so no control characters
 * need to appear in this source file.
 */
function clean(value, maxLen) {
  if (typeof value !== "string") return null;
  const out = Array.from(value)
    .filter((ch) => {
      const c = ch.codePointAt(0);
      return c >= 32 && c !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length === 0 || out.length > maxLen) return null;
  return out;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,63}(\.[^\s@]{2,24})+$/;

/* ------------------------------------------------------------ rate limit */

const hits = new Map(); // ip -> [timestamps]

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (list.length >= RATE_LIMIT_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

// prune the map occasionally so it cannot grow forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const fresh = list.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) hits.delete(ip);
    else hits.set(ip, fresh);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

/* ------------------------------------------------- serialized file writes */

let writeChain = Promise.resolve();

function appendLead(lead) {
  writeChain = writeChain.then(async () => {
    let leads = [];
    try {
      const raw = await fsp.readFile(LEADS_FILE, "utf8");
      leads = JSON.parse(raw);
      if (!Array.isArray(leads)) leads = [];
    } catch {
      leads = []; // missing or unreadable file -> start fresh
    }
    leads.push(lead);
    const tmp = `${LEADS_FILE}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(leads, null, 2), "utf8");
    await fsp.rename(tmp, LEADS_FILE); // atomic-ish swap
  });
  return writeChain;
}

/* ----------------------------------------------------------------- server */

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    fs.readFile(INDEX_FILE, (err, data) => {
      if (err) return send(res, 500, { error: "index.html not found" });
      send(res, 200, data, "text/html");
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lead") {
    const ip = req.socket.remoteAddress || "unknown";

    if (rateLimited(ip)) {
      return send(res, 429, { error: "Too many requests — try again later." });
    }
    if (!/^application\/json\b/.test(req.headers["content-type"] || "")) {
      return send(res, 415, { error: "Expected application/json." });
    }

    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        send(res, 413, { error: "Request too large." });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", async () => {
      if (res.writableEnded) return;

      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        return send(res, 400, { error: "Invalid JSON." });
      }

      const name = clean(body.name, 80);
      const email = clean(body.email, 120);
      const stayDates = clean(body.stayDates, 120);

      if (!name) return send(res, 422, { error: "A valid name is required." });
      if (!email || !EMAIL_RE.test(email))
        return send(res, 422, { error: "A valid email is required." });
      if (!stayDates)
        return send(res, 422, { error: "Requested dates are required." });

      const lead = {
        id: crypto.randomUUID(),
        name,
        email,
        stayDates,
        source: "chat-widget",
        createdAt: new Date().toISOString(),
      };

      try {
        await appendLead(lead);
      } catch (err) {
        console.error("Failed to save lead:", err);
        return send(res, 500, { error: "Could not save your details." });
      }

      console.log(
        `Lead saved: ${lead.name} <${lead.email}> (${lead.stayDates})`,
      );
      send(res, 201, { ok: true, id: lead.id });
    });
    return;
  }

  send(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
  console.log(`Chat widget running at http://localhost:${PORT}`);
  console.log(`Leads are saved to ${LEADS_FILE}`);
});
