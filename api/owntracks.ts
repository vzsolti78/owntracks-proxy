export const config = { runtime: "edge" };

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxLQHc9B3eBMmDXDLdNsDWHGU0YL_Jez5KJmgbzn3dKD7agnYR-nO_S7Hn4w9Bnj-GZ/exec";

// Edge-en nem garantált a tartós memória, de retry-flood ellen sokszor elég.
// Ha még stabilabb kell, akkor KV/Upstash kellene, de első körben ne bonyolítsuk.
const seen = new Map<string, number>();

function ok() {
  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export default async function handler(req: Request) {
  if (req.method !== "POST") return ok();

  const body = await req.text();

  let tid = "no_tid";
  let tst = 0;

  try {
    const j = JSON.parse(body);
    tid = j.tid || "no_tid";
    tst = Number(j.tst || 0);
  } catch {}

  const now = Date.now();

  // --- RATE LIMIT: 30 mp / eszköz ---
  const bucket30 = Math.floor(now / 30000);
  const rlKey = `rl:${tid}:${bucket30}`;
  if (seen.has(rlKey)) return ok();
  seen.set(rlKey, now);

  // --- DUP védelem: ugyanaz a pont (tid+tst) 5 percig ---
  if (tst) {
    const dupKey = `dup:${tid}:${tst}`;
    const prev = seen.get(dupKey);
    if (prev && now - prev < 300000) return ok();
    seen.set(dupKey, now);
  }

  // forward (nem blokkoljuk OwnTracks válaszát)
  fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  }).catch(() => {});

  return ok();
}
