import type {
  BaseStats,
  PokemonMetaStats,
  TeamCore,
  TypeMatchups,
  WeightedEntry,
} from "@rotompedia/core";

const UA = "RotomPedia-Ingest/0.1 (fan-project; portfolio)";
const BASE = "https://www.pikalytics.com/ai";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EXPLICIT_SLUG_OVERRIDES: Record<string, string[]> = {
  "eternal flower floette": ["floette-eternal", "floette-eternal-flower"],
  "floette eternal": ["floette-eternal"],
  "indeedee ♀": ["indeedee-f", "indeedee-female"],
  "indeedee f": ["indeedee-f"],
  "basculegion ♀": ["basculegion-f", "basculegion-female"],
  "basculegion f": ["basculegion-f"],
  "hisuian arcanine": ["arcanine-hisui", "arcanine-hisuian"],
  "hisuian zoroark": ["zoroark-hisui", "zoroark-hisuian"],
  "alolan ninetales": ["ninetales-alola", "ninetales-alolan"],
  "heat rotom": ["rotom-heat"],
  "wash rotom": ["rotom-wash"],
  "lycanroc dusk": ["lycanroc-dusk"],
};

function buildSlugCandidates(speciesName: string): string[] {
  const raw = speciesName.trim().toLowerCase();
  const candidates: string[] = [];
  const push = (s: string) => {
    const clean = s
      .replace(/♀/g, "-f")
      .replace(/♂/g, "-m")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    if (clean && !candidates.includes(clean)) {
      candidates.push(clean);
    }
  };

  push(raw.replace(/\s+/g, "-"));

  const overrides = EXPLICIT_SLUG_OVERRIDES[raw];
  if (overrides) {
    for (const ov of overrides) push(ov);
  }

  // Patrones generales: "Regional Form" -> "form-regional" y "Form Mon" -> "mon-form"
  const regionalMatch = raw.match(/^(alolan|galarian|hisuian|paldean)\s+(.+)$/);
  if (regionalMatch) {
    const regionMap: Record<string, string> = {
      alolan: "alola",
      galarian: "galar",
      hisuian: "hisui",
      paldean: "paldea",
    };
    const mon = regionalMatch[2].replace(/\s+/g, "-");
    push(`${mon}-${regionalMatch[1]}`);
    push(`${mon}-${regionMap[regionalMatch[1]]}`);
  }

  const parts = raw.split(/\s+/);
  if (parts.length >= 2) {
    const reversed = `${parts.slice(1).join("-")}-${parts[0]}`;
    push(reversed);
  }

  return candidates;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/plain, text/markdown, */*" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res.text();
}

function parseBulletPercentages(section: string): WeightedEntry[] {
  const entries: WeightedEntry[] = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^-\s+\*\*(.+?)\*\*:\s*([\d.]+)%/);
    if (m) {
      entries.push({ name: m[1].trim(), usage: parseFloat(m[2]) });
    }
  }
  return entries;
}

function getSection(md: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|\\n---|$)`);
  return md.match(re)?.[1] ?? "";
}

function parseBaseStats(md: string): BaseStats | undefined {
  const block = md.match(/### What are the base stats[\s\S]*?\|[\s\S]*?(?=\n---|\n###|$)/)?.[0] ?? "";
  const getVal = (label: string) => {
    const m = block.match(new RegExp(`\\|\\s*\\**${label}\\**\\s*\\|\\s*\\**(\\d+)\\**\\s*\\|`));
    return m ? parseInt(m[1], 10) : null;
  };
  const hp = getVal("HP");
  const atk = getVal("Attack");
  const def = getVal("Defense");
  const spa = getVal("Sp\\. Atk");
  const spd = getVal("Sp\\. Def");
  const spe = getVal("Speed");
  const bst = getVal("BST");
  if (hp === null || atk === null || def === null || spa === null || spd === null || spe === null) {
    return undefined;
  }
  return { hp, atk, def, spa, spd, spe, bst: bst ?? hp + atk + def + spa + spd + spe };
}

function parseMatchups(md: string): TypeMatchups | undefined {
  const sec = getSection(md, "Defensive Type Matchups");
  if (!sec) return undefined;
  const extract = (label: string) => {
    const m = sec.match(new RegExp(`\\|\\s*\\*\\*${label}\\*\\*\\s*\\|\\s*([^|\\n]+)\\|`));
    if (!m) return [];
    const val = m[1].trim();
    if (!val || val.toLowerCase() === "none") return [];
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  };
  return {
    weakTo: extract("Weak To"),
    resists: extract("Resists"),
    immuneTo: extract("Immune To"),
  };
}

export async function fetchPikalyticsTeamUsage(formatCode: string, maxCores = 60) {
  const md = await fetchText(`${BASE}/team-usage/${formatCode}`);
  const sampleMatch = md.match(/\|\s*\*\*Source Teams\*\*\s*\|\s*(\d+)\s*\|/);
  const dateMatch = md.match(/\|\s*\*\*Data Date\*\*\s*\|\s*([^\s|]+)\s*\|/);

  const sampleTeams = sampleMatch ? parseInt(sampleMatch[1], 10) : 0;
  const dataDate = dateMatch ? dateMatch[1] : null;

  const cores: TeamCore[] = [];
  const tableSec = getSection(md, "Team Usage Table");
  for (const line of tableSec.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || line.includes("Rank")) continue;
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 6) continue;
    const uses = parseInt(cols[1], 10);
    const winRate = parseFloat(cols[2].replace("%", ""));
    const pokemon = cols[5]
      .split(",")
      .map((p) => p.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim())
      .filter(Boolean);

    if (!Number.isNaN(uses) && pokemon.length > 0) {
      cores.push({
        pokemon,
        uses,
        usage: sampleTeams > 0 ? Number(((uses / sampleTeams) * 100).toFixed(2)) : 0,
        winRate: Number.isNaN(winRate) ? null : winRate,
      });
    }
    if (cores.length >= maxCores) break;
  }

  return { sampleTeams, dataDate, cores };
}

export async function fetchPikalyticsPokemon(
  formatCode: string,
  speciesName: string
): Promise<Omit<PokemonMetaStats, "tournamentAppearances" | "natures"> | null> {
  const candidates = buildSlugCandidates(speciesName);

  for (const slug of candidates) {
    try {
      const md = await fetchText(`${BASE}/pokedex/${formatCode}/${encodeURIComponent(slug)}`);

      const usageMatch = md.match(/\|\s*\*\*Usage\*\*\s*\|\s*([\d.]+)%\s*\|/);
      const wrMatch = md.match(/\|\s*\*\*Win Rate\*\*\s*\|\s*([\d.]+)%\s*\|/);
      const recMatch = md.match(/\|\s*\*\*Record\*\*\s*\|\s*(\d+)-(\d+)\s*\|/);

      const usage = usageMatch ? parseFloat(usageMatch[1]) : 0;
      const winRate = wrMatch ? parseFloat(wrMatch[1]) : null;
      const record = recMatch
        ? { wins: parseInt(recMatch[1], 10), losses: parseInt(recMatch[2], 10) }
        : undefined;

      return {
        id: slug,
        name: speciesName,
        usage,
        winRate,
        record,
        moves: parseBulletPercentages(getSection(md, "Common Moves")),
        items: parseBulletPercentages(getSection(md, "Common Items")),
        abilities: parseBulletPercentages(getSection(md, "Common Abilities")),
        teammates: parseBulletPercentages(getSection(md, "Common Teammates")),
        baseStats: parseBaseStats(md),
        matchups: parseMatchups(md),
      };
    } catch {
      // Probar siguiente candidato de slug
    }
  }

  return null;
}

export async function fetchPikalyticsRoster(
  formatCode: string,
  speciesList: string[],
  maxSpecies = 80
) {
  const unique = Array.from(new Set(speciesList)).slice(0, maxSpecies);
  console.log(`Pikalytics: consultando ${unique.length} especies para ${formatCode}...`);
  const results = new Map<string, Omit<PokemonMetaStats, "tournamentAppearances" | "natures">>();

  for (let i = 0; i < unique.length; i++) {
    const name = unique[i];
    await sleep(200);
    const data = await fetchPikalyticsPokemon(formatCode, name);
    if (data) {
      results.set(name.toLowerCase(), data);
    }
    if ((i + 1) % 20 === 0 || i === unique.length - 1) {
      console.log(`  Progreso Pikalytics: ${i + 1}/${unique.length} especies`);
    }
  }

  return results;
}
