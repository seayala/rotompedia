export interface LimitlessVgcMajorEvent {
  id: string;
  name: string;
  url: string;
  dateText: string | null;
  category: "major";
}

export interface MajorExtractedPokemon {
  id: string;
  name: string;
  item: string | null;
  ability: string | null;
  nature: string | null;
  moves: string[];
}

export type TeamPokemonSetMap = Map<string, Omit<MajorExtractedPokemon, "id" | "name">>;

export interface MajorExtractedTeam {
  tournamentId: string;
  tournamentName: string;
  tournamentCategory: "major";
  teamPageId: string | null;
  date: string;
  player: string;
  playerDisplayName: string;
  country: string | null;
  placing: number | null;
  record: {
    wins: number;
    losses: number;
    ties: number;
  };
  pokemon: MajorExtractedPokemon[];
}

const TOURNAMENTS_URL = "https://limitlessvgc.com/tournaments";
const BASE_URL = "https://limitlessvgc.com";

function decodeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tag: string, attrName: string): string | null {
  const re = new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = tag.match(re);
  return m ? decodeEntities(m[1]) : null;
}

function slugifyId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const MONTHS: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

export function parseTournamentDateToIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  const iso = s.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const mdy = s.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (mdy) {
    const mm = MONTHS[mdy[1].toLowerCase()];
    if (mm) return `${mdy[3]}-${mm}-${mdy[2].padStart(2, "0")}`;
  }

  const dmy = s.match(/\b(\d{1,2})\s+([A-Za-z]+),?\s+(20\d{2})\b/);
  if (dmy) {
    const mm = MONTHS[dmy[2].toLowerCase()];
    if (mm) return `${dmy[3]}-${mm}-${dmy[1].padStart(2, "0")}`;
  }

  const slash = s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    if (a > 12 && b <= 12) {
      return `${slash[3]}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
    return `${slash[3]}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
  }

  const monShortYear = s.match(/\b([A-Za-z]+)\s+(\d{2})\b/);
  if (monShortYear) {
    const mm = MONTHS[monShortYear[1].toLowerCase()];
    if (mm) {
      return `20${monShortYear[2]}-${mm}-15`;
    }
  }

  return null;
}

function extractPageTournamentDate(html: string): string | null {
  const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i);
  if (timeMatch) {
    const parsed = parseTournamentDateToIso(timeMatch[1]);
    if (parsed) return parsed;
  }

  const dataDateMatch = html.match(/\bdata-date=["']([^"']+)["']/i);
  if (dataDateMatch) {
    const parsed = parseTournamentDateToIso(dataDateMatch[1]);
    if (parsed) return parsed;
  }

  const cleanText = decodeEntities(html.replace(/<[^>]+>/g, " "));
  const iso = cleanText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const mdy = cleanText.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}\b/i
  );
  if (mdy) {
    const parsed = parseTournamentDateToIso(mdy[0]);
    if (parsed) return parsed;
  }

  const dmy = cleanText.match(
    /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?),?\s+20\d{2}\b/i
  );
  if (dmy) {
    const parsed = parseTournamentDateToIso(dmy[0]);
    if (parsed) return parsed;
  }

  return null;
}

export function isMajorTournamentTitle(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return (
    /\b(regional|regionals)\b/i.test(n) ||
    /\b(international|internationals)\b/i.test(n) ||
    /\b(world championships|worlds)\b/i.test(n) ||
    /\b(laic|naic|euic|ocic)\b/i.test(n)
  );
}

function extractNearbyDateText(html: string, matchIndex: number, matchLength: number): string | null {
  const start = Math.max(0, matchIndex - 240);
  const end = Math.min(html.length, matchIndex + matchLength + 240);
  const snippet = decodeEntities(html.slice(start, end));

  const isoMatch = snippet.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const monthMatch = snippet.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*20\d{2})?\b/i
  );
  return monthMatch ? monthMatch[0] : null;
}

export async function fetchLimitlessVgcMajors(options: {
  timeoutMs?: number;
  limit?: number;
} = {}): Promise<LimitlessVgcMajorEvent[]> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const limit = options.limit ?? 30;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(TOURNAMENTS_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RotomPedia-Ingest/0.1",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      console.warn(`[limitless-vgc-majors] HTTP ${res.status} en ${TOURNAMENTS_URL}`);
      return [];
    }

    const html = await res.text();
    const anchorRegex = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const seenIds = new Set<string>();
    const majors: LimitlessVgcMajorEvent[] = [];

    for (const match of html.matchAll(anchorRegex)) {
      const href = match[1].trim();
      const idMatch = href.match(/\/tournaments\/(\d+)(?:[/?#]|$)/i);
      if (!idMatch) continue;

      const id = idMatch[1];
      if (seenIds.has(id)) continue;

      const name = decodeEntities(match[2]);
      if (!isMajorTournamentTitle(name)) continue;

      seenIds.add(id);
      const url = href.startsWith("http")
        ? href
        : new URL(`/tournaments/${id}`, BASE_URL).toString();

      const index = match.index ?? 0;
      majors.push({
        id,
        name,
        url,
        dateText: extractNearbyDateText(html, index, match[0].length),
        category: "major",
      });

      if (majors.length >= limit) break;
    }

    return majors;
  } catch (err) {
    console.warn(
      "[limitless-vgc-majors] Aviso (no bloqueante):",
      err instanceof Error ? err.message : err
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function buildSetLookupCandidates(mon: MajorExtractedPokemon): string[] {
  const candidates = new Set<string>();
  const add = (val: string | null | undefined) => {
    const s = (val ?? "").trim().toLowerCase();
    if (s) candidates.add(s);
  };

  add(mon.id);
  add(slugifyId(mon.name));

  for (const base of [...candidates]) {
    const parts = base.split("-").filter(Boolean);
    if (parts.length >= 2) {
      // Rotar primer segmento al final: hisuian-arcanine -> arcanine-hisuian
      add([...parts.slice(1), parts[0]].join("-"));
      // Rotar dos primeros segmentos al final: eternal-flower-floette -> floette-eternal-flower
      if (parts.length >= 3) {
        add([...parts.slice(2), ...parts.slice(0, 2)].join("-"));
      }
    }

    // Regionales y abreviaturas frecuentes en Limitless
    add(base.replace(/^hisuian-(.+)$/, "$1-hisui"));
    add(base.replace(/^galarian-(.+)$/, "$1-galar"));
    add(base.replace(/^alolan-(.+)$/, "$1-alola"));
    add(base.replace(/^paldean-(.+)$/, "$1-paldea"));

    // Género
    add(base.replace(/^female-(.+)$/, "$1-f"));
    add(base.replace(/^male-(.+)$/, "$1-m"));

    // Riders de Calyrex
    add(base.replace(/^ice-rider-calyrex$/, "calyrex-ice"));
    add(base.replace(/^shadow-rider-calyrex$/, "calyrex-shadow"));

    // Floette flor eterna: eternal-flower-floette -> floette-eternal
    add(base.replace(/^eternal-flower-(.+)$/, "$1-eternal"));

    // Máscaras de Ogerpon: cornerstone-mask-ogerpon -> ogerpon-cornerstone
    add(base.replace(/^([a-z]+)-mask-ogerpon$/, "ogerpon-$1"));
  }

  return [...candidates];
}

function findPokemonSetDetail(
  setMap: TeamPokemonSetMap,
  mon: MajorExtractedPokemon
): Omit<MajorExtractedPokemon, "id" | "name"> | undefined {
  for (const key of buildSetLookupCandidates(mon)) {
    const hit = setMap.get(key);
    if (hit) return hit;
  }
  return undefined;
}

export async function fetchTeamSetDetails(
  teamPageId: string,
  options: { timeoutMs?: number } = {}
): Promise<TeamPokemonSetMap | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const url = `${BASE_URL}/teams/${encodeURIComponent(teamPageId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RotomPedia-Ingest/0.1",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const pkmnBlocks = [...html.matchAll(/<div\b[^>]*class="[^"]*\bpkmn\b[^"]*"[^>]*>([\s\S]*?)(?=<div\b[^>]*class="[^"]*\bpkmn\b|<\/div>\s*<\/div>\s*<\/main>|$)/gi)];
    if (pkmnBlocks.length === 0) return null;

    const byKey: TeamPokemonSetMap = new Map();

    for (const blockMatch of pkmnBlocks) {
      const fullTag = blockMatch[0];
      const blockBody = blockMatch[1];

      const dataId = getAttr(fullTag, "data-id");
      const nameLink = blockBody.match(/<div[^>]*class="[^"]*\bname\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const displayName = nameLink ? decodeEntities(nameLink) : dataId ?? "";
      const key = slugifyId(dataId || displayName);
      if (!key) continue;

      const itemRaw = blockBody.match(/<div[^>]*class="[^"]*\bitem\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const item = itemRaw ? decodeEntities(itemRaw) || null : null;

      const abilityRaw = blockBody.match(/<div[^>]*class="[^"]*\bability\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const ability = abilityRaw
        ? decodeEntities(abilityRaw).replace(/^Ability:\s*/i, "").trim() || null
        : null;

      const natureRaw = blockBody.match(/<div[^>]*class="[^"]*\bnature\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
      const nature = natureRaw
        ? decodeEntities(natureRaw).replace(/\s+Nature$/i, "").trim() || null
        : null;

      const movesUl = blockBody.match(/<ul[^>]*class="[^"]*\bmoves\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
      const moves = [...movesUl.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((m) => decodeEntities(m[1]))
        .filter(Boolean);

      byKey.set(key, { item, ability, nature, moves });
    }

    return byKey.size > 0 ? byKey : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMajorTournamentTeams(
  tournamentId: string,
  tournamentName: string,
  options: { timeoutMs?: number; date?: string; enrichTopN?: number; concurrency?: number } = {}
): Promise<MajorExtractedTeam[]> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const enrichTopN = options.enrichTopN ?? 8;
  const concurrency = options.concurrency ?? 4;
  const url = `${BASE_URL}/tournaments/${encodeURIComponent(tournamentId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RotomPedia-Ingest/0.1",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      console.warn(`[limitless-vgc-majors] HTTP ${res.status} en ${url}`);
      return [];
    }

    const html = await res.text();
    const pageDate =
      parseTournamentDateToIso(options.date) ??
      extractPageTournamentDate(html) ??
      "";

    const rowMatches = [...html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi)];
    const teams: MajorExtractedTeam[] = [];

    for (const row of rowMatches) {
      const trAttrs = row[1] ?? "";
      const trBody = row[2] ?? "";

      const teamDivMatch = trBody.match(/<div[^>]*class="[^"]*\bvgc-team\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!teamDivMatch) continue;

      const teamHtml = teamDivMatch[1];
      const monEntries = [...teamHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
      const pokemon: MajorExtractedPokemon[] = [];

      for (const monMatch of monEntries) {
        const aAttrs = monMatch[1] ?? "";
        const imgTag = monMatch[2].match(/<img\b[^>]*>/i)?.[0] ?? "";
        const tooltipName = getAttr(aAttrs, "data-tooltip");
        const altName = imgTag ? getAttr(imgTag, "alt") : null;
        const rawName = (tooltipName || altName || decodeEntities(monMatch[2])).trim();
        if (!rawName) continue;

        const displayName =
          rawName === rawName.toLowerCase()
            ? rawName.replace(/\b\w/g, (c) => c.toUpperCase())
            : rawName;
        const slug = slugifyId(displayName);

        pokemon.push({
          id: slug,
          name: displayName,
          item: null,
          ability: null,
          nature: null,
          moves: [],
        });
      }

      if (pokemon.length === 0) continue;

      const rankAttr = getAttr(trAttrs, "data-rank");
      const placing = rankAttr && /^\d+$/.test(rankAttr) ? Number(rankAttr) : null;
      const playerLinkName =
        trBody.match(/<a\b[^>]*href="\/players\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
      const playerName = (
        getAttr(trAttrs, "data-name") ||
        (playerLinkName ? decodeEntities(playerLinkName) : "") ||
        "Unknown Player"
      ).trim();
      const country = (getAttr(trAttrs, "data-country") || "").trim() || null;
      const teamPageId =
        trBody.match(/<a\b[^>]*href="\/teams\/(\d+)"[^>]*>/i)?.[1] ?? null;

      teams.push({
        tournamentId: String(tournamentId),
        tournamentName,
        tournamentCategory: "major",
        teamPageId,
        date: pageDate,
        player: playerName,
        playerDisplayName: playerName,
        country,
        placing,
        record: { wins: 0, losses: 0, ties: 0 },
        pokemon,
      });
    }

    if (enrichTopN > 0) {
      const targets = teams.slice(0, enrichTopN).filter((t) => Boolean(t.teamPageId));
      let cursor = 0;
      const workers = Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
        while (cursor < targets.length) {
          const current = targets[cursor++];
          const setMap = await fetchTeamSetDetails(current.teamPageId!, { timeoutMs });
          if (!setMap) continue;
          current.pokemon = current.pokemon.map((mon) => {
            const detail = findPokemonSetDetail(setMap, mon);
            return detail ? { ...mon, ...detail } : mon;
          });
        }
      });
      await Promise.all(workers);
    }

    return teams;
  } catch (err) {
    console.warn(
      `[limitless-vgc-majors] Aviso al leer equipos de ${tournamentId}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}
