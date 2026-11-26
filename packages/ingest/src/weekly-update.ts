import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGULATIONS,
  type PokemonMetaStats,
  type RegulationSnapshot,
  type TournamentTeam,
  type WeightedEntry,
} from "@rotompedia/core";
import { classifyTournament, fetchLimitlessRegulation } from "./limitless.js";
import {
  fetchLimitlessVgcMajors,
  fetchMajorTournamentTeams,
  parseTournamentDateToIso,
} from "./limitless-vgc-majors.js";
import { fetchPikalyticsRoster, fetchPikalyticsTeamUsage } from "./pikalytics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

function resolveAsOfDate(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--as-of" && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith("--as-of=")) {
      return arg.slice("--as-of=".length);
    }
  }
  if (process.env.AS_OF_DATE) {
    return process.env.AS_OF_DATE;
  }
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDayUtc(isoDate: string): Date {
  const clean = isoDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    throw new Error(`Fecha ISO inválida: "${isoDate}" (esperado YYYY-MM-DD)`);
  }
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function shiftDaysUtc(isoDate: string, deltaDays: number): string {
  const dt = parseIsoDayUtc(isoDate);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function isDateInRange(
  dateStr: string | undefined | null,
  minInclusive?: string,
  maxInclusive?: string
): boolean {
  if (!dateStr) return false;
  const iso = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  if (minInclusive && iso < minInclusive) return false;
  if (maxInclusive && iso > maxInclusive) return false;
  return true;
}

async function readExistingSnapshot(filePath: string): Promise<RegulationSnapshot | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as RegulationSnapshot;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}

function buildPokemonStats(
  teams: TournamentTeam[],
  teamUsage: Awaited<ReturnType<typeof fetchPikalyticsTeamUsage>>,
  pikaMap: Awaited<ReturnType<typeof fetchPikalyticsRoster>>
): PokemonMetaStats[] {
  const appearances = new Map<
    string,
    { name: string; count: number; natures: Map<string, number> }
  >();

  for (const team of teams) {
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

  const pokemon: PokemonMetaStats[] = [];
  for (const name of rankedSpecies.slice(0, 80)) {
    const key = name.toLowerCase();
    const app = appearances.get(key);
    const pika = pikaMap.get(key);
    if (!app && !pika) continue;

    const totalNat = app
      ? Array.from(app.natures.values()).reduce((acc, n) => acc + n, 0)
      : 0;
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
      teams.length > 0 && app
        ? Number(((app.count / teams.length) * 100).toFixed(2))
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
  return pokemon;
}

async function main() {
  const asOfDate = resolveAsOfDate();
  parseIsoDayUtc(asOfDate); // Valida formato YYYY-MM-DD

  const activeRegs = REGULATIONS.filter((r) => r.status === "active");
  if (activeRegs.length === 0) {
    console.log("No hay ninguna regulación con status='active'. Nada que actualizar.");
    return;
  }

  const reg = activeRegs[0];
  const majorStart = shiftDaysUtc(asOfDate, -9);
  const nonMajorStart = shiftDaysUtc(asOfDate, -7);

  const effectiveMajorMin =
    reg.startDate && reg.startDate > majorStart ? reg.startDate : majorStart;
  const effectiveMajorMax =
    reg.endDate && reg.endDate < asOfDate ? reg.endDate : asOfDate;

  const effectiveNonMajorMin =
    reg.startDate && reg.startDate > nonMajorStart ? reg.startDate : nonMajorStart;
  const effectiveNonMajorMax =
    reg.endDate && reg.endDate < asOfDate ? reg.endDate : asOfDate;

  const outPath = path.join(
    REPO_ROOT,
    "apps/web/public/data/regulations",
    reg.snapshotFile
  );
  const existingSnapshot = await readExistingSnapshot(outPath);

  console.log(`Actualización semanal para regulación activa ${reg.code} (${reg.name})`);
  console.log(`  Fecha de referencia (UTC): ${asOfDate}`);
  console.log(`  Ventana Majors (9 días): ${effectiveMajorMin} .. ${effectiveMajorMax}`);
  console.log(`  Ventana No-Majors (7 días): ${effectiveNonMajorMin} .. ${effectiveNonMajorMax}`);

  // 1. Conservar majors existentes y sumar solo los nuevos en ventana de 9 días (sin duplicar tournamentId)
  const existingMajors = (existingSnapshot?.teams ?? []).filter(
    (t) => t.tournamentCategory === "major"
  );
  const existingMajorIds = new Set(existingMajors.map((t) => String(t.tournamentId)));

  const discoveredMajors = await fetchLimitlessVgcMajors({ limit: 30 });
  const recentMajors = discoveredMajors
    .map((m) => ({
      ...m,
      parsedDate: parseTournamentDateToIso(m.dateText),
    }))
    .filter((m) =>
      isDateInRange(m.parsedDate, effectiveMajorMin, effectiveMajorMax)
    );

  const newlyExtractedMajorTeams: TournamentTeam[] = [];
  for (const m of recentMajors) {
    if (existingMajorIds.has(String(m.id))) {
      console.log(`  Major ${m.id} (${m.name}) ya existe en el snapshot; se omite para evitar duplicados.`);
      continue;
    }

    const extracted = await fetchMajorTournamentTeams(m.id, m.name, {
      date: m.parsedDate ?? undefined,
    });
    for (const tm of extracted) {
      if (isDateInRange(tm.date, effectiveMajorMin, effectiveMajorMax)) {
        newlyExtractedMajorTeams.push({
          tournamentId: tm.tournamentId,
          tournamentName: tm.tournamentName,
          tournamentCategory: "major",
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

  const mergedMajors: TournamentTeam[] = [
    ...existingMajors,
    ...newlyExtractedMajorTeams,
  ];
  const allMajorIds = new Set(mergedMajors.map((t) => String(t.tournamentId)));

  // 2. Torneos no majors: solo de la semana previa para mantener ligero el repositorio en GitHub
  const limitless = await fetchLimitlessRegulation(reg.limitlessFormat, 40);
  const recentNonMajorTeams: TournamentTeam[] = limitless.teams
    .map((tm) => ({
      ...tm,
      tournamentCategory: tm.tournamentCategory ?? classifyTournament(tm.tournamentName),
    }))
    .filter((tm) => tm.tournamentCategory !== "major")
    .filter((tm) => !allMajorIds.has(String(tm.tournamentId)))
    .filter((tm) =>
      isDateInRange(tm.date, effectiveNonMajorMin, effectiveNonMajorMax)
    );

  const finalTeams: TournamentTeam[] = [
    ...mergedMajors,
    ...recentNonMajorTeams,
  ];

  // 3. Sobrescribir datos de uso de Pikalytics del formato activo
  const teamUsage = await fetchPikalyticsTeamUsage(reg.pikalyticsFormat, 60);

  const tempAppearances = new Map<string, { name: string; count: number }>();
  for (const team of finalTeams) {
    for (const mon of team.pokemon) {
      const key = mon.name.toLowerCase();
      const prev = tempAppearances.get(key) ?? { name: mon.name, count: 0 };
      prev.count += 1;
      tempAppearances.set(key, prev);
    }
  }

  const speciesForPika = Array.from(tempAppearances.values())
    .sort((a, b) => b.count - a.count)
    .map((e) => e.name);
  for (const core of teamUsage.cores) {
    for (const p of core.pokemon) {
      if (!speciesForPika.some((s) => s.toLowerCase() === p.toLowerCase())) {
        speciesForPika.push(p);
      }
    }
  }

  const pikaMap = await fetchPikalyticsRoster(reg.pikalyticsFormat, speciesForPika, 80);
  const pokemon = buildPokemonStats(finalTeams, teamUsage, pikaMap);

  const uniqueTournamentIds = new Set(
    finalTeams
      .map((t) => (t.tournamentId ?? t.tournamentName).trim())
      .filter(Boolean)
  );

  const snapshot: RegulationSnapshot = {
    meta: {
      code: reg.code,
      name: reg.name,
      pikalyticsFormat: reg.pikalyticsFormat,
      generatedAt: new Date().toISOString(),
      sources: {
        limitlessTournaments: uniqueTournamentIds.size,
        limitlessTeams: finalTeams.length,
        pikalyticsSampleTeams: teamUsage.sampleTeams,
        pikalyticsDataDate: teamUsage.dataDate,
      },
    },
    pokemon,
    cores: teamUsage.cores,
    teams: finalTeams,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  console.log(`\nSnapshot semanal guardado en ${outPath}`);
  console.log(`  Majors conservados/añadidos: ${mergedMajors.length} (${newlyExtractedMajorTeams.length} equipos nuevos)`);
  console.log(`  Equipos no-major (última semana): ${recentNonMajorTeams.length}`);
  console.log(`  Total equipos en snapshot: ${finalTeams.length} | Pokémon: ${pokemon.length} | Cores: ${teamUsage.cores.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
