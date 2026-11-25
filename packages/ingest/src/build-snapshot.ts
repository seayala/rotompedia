import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_REGULATION_CODE,
  getRegulationDefinition,
  type PokemonMetaStats,
  type RegulationSnapshot,
  type WeightedEntry,
} from "@rotompedia/core";
import { classifyTournament, fetchLimitlessRegulation } from "./limitless.js";
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

async function main() {
  const reg = getRegulationDefinition(resolveRegulationCode());
  console.log(`Generando snapshot para ${reg.code} (${reg.name})...`);

  const limitless = await fetchLimitlessRegulation(reg.limitlessFormat, 100);
  const teamUsage = await fetchPikalyticsTeamUsage(reg.pikalyticsFormat, 60);

  const normalizedTeams = limitless.teams.map((tm) => ({
    ...tm,
    tournamentCategory: tm.tournamentCategory ?? classifyTournament(tm.tournamentName),
  }));

  const appearances = new Map<string, { name: string; count: number; natures: Map<string, number> }>();
  for (const team of normalizedTeams) {
    for (const mon of team.pokemon) {
      const key = mon.name.toLowerCase();
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
      if (!rankedSpecies.some((s) => s.toLowerCase() === p.toLowerCase())) {
        rankedSpecies.push(p);
      }
    }
  }

  const pikaMap = await fetchPikalyticsRoster(reg.pikalyticsFormat, rankedSpecies, 80);

  const pokemon: PokemonMetaStats[] = [];
  for (const name of rankedSpecies.slice(0, 80)) {
    const key = name.toLowerCase();
    const app = appearances.get(key);
    const pika = pikaMap.get(key);
    if (!app && !pika) continue;

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
      normalizedTeams.length > 0 && app
        ? Number(((app.count / normalizedTeams.length) * 100).toFixed(2))
        : 0;

    pokemon.push({
      id: pika?.id ?? key.replace(/\s+/g, "-"),
      name: pika?.name ?? app?.name ?? name,
      usage: pika?.usage ?? fallbackUsage,
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

  pokemon.sort((a, b) => b.usage - a.usage);

  const snapshot: RegulationSnapshot = {
    meta: {
      code: reg.code,
      name: reg.name,
      pikalyticsFormat: reg.pikalyticsFormat,
      generatedAt: new Date().toISOString(),
      sources: {
        limitlessTournaments: limitless.tournamentCount,
        limitlessTeams: normalizedTeams.length,
        pikalyticsSampleTeams: teamUsage.sampleTeams,
        pikalyticsDataDate: teamUsage.dataDate,
      },
    },
    pokemon,
    cores: teamUsage.cores,
    teams: normalizedTeams,
  };

  const outPath = path.join(REPO_ROOT, "apps/web/public/data/regulations", reg.snapshotFile);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2), "utf8");

  const byCat = normalizedTeams.reduce<Record<string, number>>((acc, t) => {
    const k = t.tournamentCategory ?? "circuit";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nSnapshot guardado en ${outPath}`);
  console.log(`  Pokémon: ${pokemon.length} | Cores: ${teamUsage.cores.length} | Equipos: ${normalizedTeams.length}`);
  console.log("  Equipos por categoría:", byCat);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
