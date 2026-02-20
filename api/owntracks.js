const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxLQHc9B3eBMmDXDLdNsDWHGU0YL_Jez5KJmgbzn3dKD7agnYR-nO_S7Hn4w9Bnj-GZ/exec";

// egyszerű memória dedupe (serverless instance életében)
const seen = new Map();

function ok(res) {
  res.status(200).send("OK");
}

module.exports = async (req, res) => {
  // GET teszt
  if (req.method === "GET") {
    return ok(res);
  }

  if (req.method !== "POST") {
    return ok(res);
  }

  const body = req.body ? JSON.stringify(req.body) : "";

  let tid = "no_tid";
  let tst = 0;

  try {
    const j = req.body || {};
    tid = j.tid || "no_tid";
    tst = Number(j.tst || 0);
  } catch {}

  const now = Date.now();

  // --- 30 mp rate limit ---
  const bucket = Math.floor(now / 30000);
  const rlKey = `${tid}:${bucket}`;
  if (seen.has(rlKey)) return ok(res);
  seen.set(rlKey, now);

  // --- 5 perc dup védelem ---
  if (tst) {
    const dupKey = `${tid}:${tst}`;
    const prev = seen.get(dupKey);
    if (prev && now - prev < 300000) return ok(res);
    seen.set(dupKey, now);
  }

  // forward GAS felé (nem blokkoljuk)
  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});

  return ok(res);
};
