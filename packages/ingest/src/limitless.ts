import type { TournamentCategory, TournamentTeam, PokemonBuild } from "@rotompedia/core";

const UA = "RotomPedia-Ingest/0.1 (fan-project; portfolio)";
const BASE = "https://play.limitlesstcg.com/api";

interface RawTournament {
  id: string;
  name: string;
  date: string;
  format?: string;
  players?: number;
}

interface RawDeckMon {
  id?: string;
  name?: string;
  item?: string | null;
  ability?: string | null;
  nature?: string | null;
  attacks?: string[];
}

interface RawStanding {
  name?: string;
  player?: string;
  country?: string | null;
  placing?: number | null;
  record?: { wins?: number; losses?: number; ties?: number };
  decklist?: RawDeckMon[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function classifyTournament(name: string): TournamentCategory {
  const n = name.toLowerCase();
  if (
    /\b(regional|regionals)\b/.test(n) ||
    /\b(international|internationals)\b/.test(n) ||
    /\b(world championships|worlds)\b/.test(n)
  ) {
    return "major";
  }
  if (/\b(global challenge|gc)\b/.test(n)) {
    return "global-challenge";
  }
  return "circuit";
}

async function fetchJson<T>(url: string, attempt = 1): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (res.status === 429 && attempt <= 2) {
    await sleep(2000 * attempt);
    return fetchJson<T>(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return (await res.json()) as T;
}

export async function fetchLimitlessRegulation(formatCode: string, maxTournaments = 40) {
  const all = await fetchJson<RawTournament[]>(`${BASE}/tournaments?game=VGC&limit=200`);
  const filtered = all
    .filter((t) => (t.format ?? "").toUpperCase() === formatCode.toUpperCase())
    .slice(0, maxTournaments);

  console.log(`Limitless: encontrados ${filtered.length} torneos para ${formatCode}`);

  const teams: TournamentTeam[] = [];

  let consecutive429 = 0;
  for (let i = 0; i < filtered.length; i++) {
    const t = filtered[i];
    const category = classifyTournament(t.name);
    await sleep(600);
    try {
      const standings = await fetchJson<RawStanding[]>(`${BASE}/tournaments/${t.id}/standings`);
      for (const s of standings) {
        if (!Array.isArray(s.decklist) || s.decklist.length === 0) continue;

        const pokemon: PokemonBuild[] = s.decklist.map((m) => ({
          id: (m.id ?? m.name ?? "unknown").toLowerCase(),
          name: m.name ?? m.id ?? "Unknown",
          item: m.item ?? null,
          ability: m.ability ?? null,
          nature: m.nature ?? null,
          moves: Array.isArray(m.attacks) ? m.attacks : [],
        }));

        teams.push({
          tournamentId: t.id,
          tournamentName: t.name,
          tournamentCategory: category,
          date: t.date,
          player: (s.player ?? s.name ?? "unknown").toLowerCase(),
          playerDisplayName: s.name ?? s.player ?? "Unknown",
          country: s.country ?? null,
          placing: typeof s.placing === "number" ? s.placing : null,
          record: {
            wins: s.record?.wins ?? 0,
            losses: s.record?.losses ?? 0,
            ties: s.record?.ties ?? 0,
          },
          pokemon,
        });
      }
      consecutive429 = 0;
      if ((i + 1) % 10 === 0 || i === filtered.length - 1) {
        console.log(`  Progreso Limitless: ${i + 1}/${filtered.length} torneos (${teams.length} equipos)`);
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.warn(`  Aviso en torneo ${t.id}:`, msg);
      if (msg.includes("HTTP 429")) {
        consecutive429 += 1;
        if (consecutive429 >= 5) {
          console.warn("  Límite HTTP 429 alcanzado repetidamente en API de circuito; se conservan los datos ya obtenidos y los majors.");
          break;
        }
      } else {
        consecutive429 = 0;
      }
    }
  }

  return {
    tournamentCount: filtered.length,
    teams,
  };
}
