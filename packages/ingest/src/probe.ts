const UA = "RotomPedia-Probe/0.1 (fan-project; portfolio)";

async function check(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json, text/plain, */*" },
  });
  const body = await res.text();
  console.log(`\n--- ${url} [${res.status}] ---`);
  console.log("x-ratelimit-remaining:", res.headers.get("x-ratelimit-remaining"));
  console.log(body.slice(0, 700));
  return { status: res.status, body };
}

async function main() {
  const tRes = await check("https://play.limitlesstcg.com/api/tournaments?game=VGC");
  try {
    const list = JSON.parse(tRes.body);
    if (Array.isArray(list) && list[0]?.id) {
      const id = list[0].id;
      await check(`https://play.limitlesstcg.com/api/tournaments/${id}/standings`);
      await check(`https://play.limitlesstcg.com/api/tournaments/${id}/pairings`);
    }
  } catch {
    console.log("No se pudo parsear JSON de torneos de Limitless.");
  }

  await check("https://www.pikalytics.com/ai/team-usage/gen9championsvgc2026regmc");
}

main().catch(console.error);
