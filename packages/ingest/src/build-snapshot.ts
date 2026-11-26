import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_REGULATION_CODE,
  getRegulationDefinition,
  type PokemonMetaStats,
  type RegulationSnapshot,
  type WeightedEntry,
  isSpeciesLegalInRegulation,
  normalizeSpeciesKey,
} from "@rotompedia/core";
import { classifyTournament, fetchLimitlessRegulation } from "./limitless.js";
import {
  fetchMajorTournamentTeams,
  fetchLimitlessVgcMajors,
  parseTournamentDateToIso,
} from "./limitless-vgc-majors.js";
import { fetchPikalyticsRoster, fetchPikalyticsTeamUsage } from "./pikalytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

function resolveRegulationCode(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--regulation" || arg === "--reg" || arg === "-r") {
      if (args[i + 1]) return args[i + 1];
    } else if (arg.startsWith("--regulation=")) {
      return arg.slice("--regulation=".length);
    } else if (arg.startsWith("--reg=")) {
      return arg.slice("--reg=".length);
    } else if (!arg.startsWith("-")) {
      return arg;
    }
  }
  return process.env.REGULATION || DEFAULT_REGULATION_CODE;
}

function isWithinRegulationDates(
  dateStr: string | undefined | null,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate && !endDate) return true;
  if (!dateStr) return false;
  const iso = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  if (startDate && iso < startDate) return false;
  if (endDate && iso > endDate) return false;
  return true;
}

async function main() {
  const reg = getRegulationDefinition(resolveRegulationCode());
  console.log(`Generando snapshot para ${reg.code} (${reg.name})...`);

  // 1. Prioridad absoluta: descubrir y extraer primero los torneos Major en rango de fechas
  const discoveredMajors = await fetchLimitlessVgcMajors({ limit: 30 });
  const majorsInReg = discoveredMajors
    .map((m) => ({
      ...m,
      parsedDate: parseTournamentDateToIso(m.dateText),
    }))
    .filter((m) => isWithinRegulationDates(m.parsedDate, reg.startDate, reg.endDate));

  console.log(
    `[Prioridad Major] ${majorsInReg.length} majors en rango para ${reg.code} (${reg.startDate ?? "?"} .. ${reg.endDate ?? "?"})`
  );

  const majorTeams = [];
  for (const m of majorsInReg) {
    const extracted = await fetchMajorTournamentTeams(m.id, m.name, {
      date: m.parsedDate ?? undefined,
    });
    for (const tm of extracted) {
      if (isWithinRegulationDates(tm.date, reg.startDate, reg.endDate)) {
        majorTeams.push({
          tournamentId: tm.tournamentId,
          tournamentName: tm.tournamentName,
          tournamentCategory: "major" as const,
          date: tm.date,
          player: tm.player.toLowerCase(),
          playerDisplayName: tm.playerDisplayName,
          country: tm.country,
          placing: tm.placing,
          record: tm.record,
          pokemon: tm.pokemon.map((pk) => ({
            id: pk.id,
            name: pk.name,
            item: pk.item,
            ability: pk.ability,
            nature: pk.nature,
            moves: pk.moves,
          })),
        });
      }
    }
  }

  // 2. Complemento secundario: torneos de circuito/API de la regulación
  const limitless = await fetchLimitlessRegulation(reg.limitlessFormat, 40);
  const teamUsage = await fetchPikalyticsTeamUsage(reg.pikalyticsFormat, 60);

  const circuitTeamsFiltered = limitless.teams
    .filter((tm) => isWithinRegulationDates(tm.date, reg.startDate, reg.endDate))
    .map((tm) => ({
      ...tm,
      tournamentCategory: tm.tournamentCategory ?? classifyTournament(tm.tournamentName),
    }));

  const majorTournamentIds = new Set(majorTeams.map((t) => String(t.tournamentId)));
  const normalizedTeams = [
    ...majorTeams,
    ...circuitTeamsFiltered.filter((t) => !majorTournamentIds.has(String(t.tournamentId))),
  ];


  const allowedTournamentNamesForReg: Record<string, string[]> = {
    "M-A": ["new orleans", "indianapolis"],
  };
  const allowedNameFragments = allowedTournamentNamesForReg[reg.code] ?? null;

  const filteredTeams = normalizedTeams
    .filter((team) => {
      if (!allowedNameFragments) return true;
      const tName = (team.tournamentName ?? "").toLowerCase();
      return allowedNameFragments.some((frag) => tName.includes(frag));
    })
    .map((team) => ({
      ...team,
      pokemon: team.pokemon.filter((mon) => isSpeciesLegalInRegulation(reg.code, mon.name)),
    }))
    .filter((team) => team.pokemon.length > 0);

  const uniqueTournamentIds = new Set(
    filteredTeams.map((t) => (t.tournamentId ?? t.tournamentName).trim()).filter(Boolean)
  );

  const appearances = new Map<string, { name: string; count: number; natures: Map<string, number> }>();
  const canonicalSpeciesKey = (raw: string): string => {
    const k = normalizeSpeciesKey(raw);
    if (k === "sirfetch") return "sirfetchd";
    return k;
  };

  for (const team of filteredTeams) {
    for (const mon of team.pokemon) {
      const key = canonicalSpeciesKey(mon.name);
      const entry = appearances.get(key) ?? {
        name: mon.name,
        count: 0,
        natures: new Map<string, number>(),
      };
      entry.count += 1;
      if (mon.nature) {
        entry.natures.set(mon.nature, (entry.natures.get(mon.nature) ?? 0) + 1);
      }
      appearances.set(key, entry);
    }
  }

  const rankedSpecies = Array.from(appearances.values())
    .sort((a, b) => b.count - a.count)
    .map((e) => e.name);
  for (const core of teamUsage.cores) {
    for (const p of core.pokemon) {
      if (!isSpeciesLegalInRegulation(reg.code, p)) continue;
      const pKey = canonicalSpeciesKey(p);
      if (!rankedSpecies.some((s) => canonicalSpeciesKey(s) === pKey)) {
        rankedSpecies.push(p);
      }
    }
  }

  const pikaMap = await fetchPikalyticsRoster(reg.pikalyticsFormat, rankedSpecies);

  const isMegaSpecies = (raw: string): boolean => {
    const s = raw.trim().toLowerCase();
    return (
      /^mega(?:-|\s|$)/.test(s) ||
      /(?:-|\s)mega(?:-x|-y|-z)?(?:$|\s|-)/.test(s)
    );
  };

  const pokemon: PokemonMetaStats[] = [];
  for (const name of rankedSpecies) {
    if (isMegaSpecies(name)) continue;
    if (!isSpeciesLegalInRegulation(reg.code, name)) continue;
    const key = canonicalSpeciesKey(name);
    const app = (appearances.get(key) ?? appearances.get(normalizeSpeciesKey(name)));
    const pika = pikaMap.get(key) ?? pikaMap.get(name.toLowerCase());
    if (!app && !pika) continue;
    const displayCandidate = pika?.name ?? app?.name ?? name;
    if (isMegaSpecies(displayCandidate)) continue;

    const totalNat = app ? Array.from(app.natures.values()).reduce((a, b) => a + b, 0) : 0;
    const natures: WeightedEntry[] = app
      ? Array.from(app.natures.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([nat, count]) => ({
            name: nat,
            count,
            usage: totalNat > 0 ? Number(((count / totalNat) * 100).toFixed(1)) : 0,
          }))
      : [];

    const fallbackUsage =
      filteredTeams.length > 0 && app
        ? Number(((app.count / filteredTeams.length) * 100).toFixed(2))
        : 0;

    const finalUsage = pika?.usage ?? fallbackUsage;
    const finalAppearances = app?.count ?? 0;
    if (finalAppearances === 0 && finalUsage === 0) continue;

    pokemon.push({
      id: pika?.id ?? key.replace(/\s+/g, "-"),
      name: displayCandidate,
      usage: finalUsage,
      winRate: pika?.winRate ?? null,
      record: pika?.record,
      tournamentAppearances: app?.count ?? 0,
      moves: pika?.moves ?? [],
      items: pika?.items ?? [],
      abilities: pika?.abilities ?? [],
      natures,
      teammates: pika?.teammates ?? [],
      baseStats: pika?.baseStats,
      matchups: pika?.matchups,
    });
  }

  const mergedPokemon = new Map<string, PokemonMetaStats>();
  for (const item of pokemon) {
    const cKey = canonicalSpeciesKey(item.name || item.id);
    const prev = mergedPokemon.get(cKey);
    if (!prev) {
      mergedPokemon.set(cKey, { ...item, id: cKey });
    } else {
      const preferred =
        item.name.includes("'") || item.natures.length > prev.natures.length
          ? item
          : prev;
      mergedPokemon.set(cKey, {
        ...prev,
        ...preferred,
        id: cKey,
        usage: Math.max(prev.usage, item.usage),
        tournamentAppearances: Math.max(prev.tournamentAppearances, item.tournamentAppearances),
        natures: prev.natures.length >= item.natures.length ? prev.natures : item.natures,
      });
    }
  }
  pokemon.length = 0;
  pokemon.push(...mergedPokemon.values());

  pokemon.sort((a, b) => b.usage - a.usage);

  const snapshot: RegulationSnapshot = {
    meta: {
      code: reg.code,
      name: reg.name,
      pikalyticsFormat: reg.pikalyticsFormat,
      generatedAt: new Date().toISOString(),
      sources: {
        limitlessTournaments: uniqueTournamentIds.size,
        limitlessTeams: filteredTeams.length,
        pikalyticsSampleTeams: teamUsage.sampleTeams,
        pikalyticsDataDate: teamUsage.dataDate,
      },
    },
    pokemon,
    cores: teamUsage.cores,
    teams: filteredTeams,
  };

  const outPath = path.join(REPO_ROOT, "apps/web/public/data/regulations", reg.snapshotFile);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  const byCat = filteredTeams.reduce<Record<string, number>>((acc, t) => {
    const k = t.tournamentCategory ?? "circuit";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nSnapshot guardado en ${outPath}`);
  console.log(`  Pokémon: ${pokemon.length} | Cores: ${teamUsage.cores.length} | Equipos: ${filteredTeams.length}`);
  console.log("  Equipos por categoría:", byCat);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
