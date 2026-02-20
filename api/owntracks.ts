export const runtime = "edge";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxLQHc9B3eBMmDXDLdNsDWHGU0YL_Jez5KJmgbzn3dKD7agnYR-nO_S7Hn4w9Bnj-GZ/exec";

const seen = new Map<string, number>();

function ok() {
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export default async function handler(req: Request) {
  // GET-re azonnali válasz (böngészős teszt)
  if (req.method === "GET") return ok();

  if (req.method !== "POST") return ok();

  // 🔴 FONTOS: body olvasása után AZONNAL válaszolunk
  const body = await req.text();

  let tid = "no_tid";
  let tst = 0;

  try {
    const j = JSON.parse(body);
    tid = j.tid || "no_tid";
    tst = Number(j.tst || 0);
  } catch {}

  const now = Date.now();

  // --- 30 mp rate limit ---
  const bucket = Math.floor(now / 30000);
  const rlKey = `${tid}:${bucket}`;
  if (seen.has(rlKey)) return ok();
  seen.set(rlKey, now);

  // --- 5 perc dup védelem ---
  if (tst) {
    const dupKey = `${tid}:${tst}`;
    const prev = seen.get(dupKey);
    if (prev && now - prev < 300000) return ok();
    seen.set(dupKey, now);
  }

  // 🔴 FIRE-AND-FORGET forward (nem várunk rá)
  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});

  // 🔴 AZONNALI válasz → nincs timeout
  return ok();
}
