import { useEffect, useMemo, useState } from "react";
import type {
  PokemonMetaStats,
  RegulationSnapshot,
  TournamentCategory,
  TournamentTeam,
} from "@rotompedia/core";
import { useI18n } from "./i18n.tsx";

type Tab = "usage" | "cores" | "teams";
type TournamentFilter = "all" | TournamentCategory;

function inferTeamCategory(tm: TournamentTeam): TournamentCategory {
  if (tm.tournamentCategory) return tm.tournamentCategory;
  const n = tm.tournamentName.toLowerCase();
  if (
    /\b(regional|regionals)\b/.test(n) ||
    /\b(international|internationals)\b/.test(n) ||
    /\b(world championships|worlds)\b/.test(n)
  ) {
    return "major";
  }
  if (/\bglobal challenge\b/.test(n)) {
    return "global-challenge";
  }
  return "circuit";
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [snapshot, setSnapshot] = useState<RegulationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [tab, setTab] = useState<Tab>("usage");
  const [tournamentFilter, setTournamentFilter] = useState<TournamentFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    fetch(`${import.meta.env.BASE_URL}data/regulations/M-C.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RegulationSnapshot>;
      })
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        if (data.pokemon.length > 0) {
          setSelectedId(data.pokemon[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPokemon = useMemo(() => {
    if (!snapshot) return [];
    if (!normalizedQuery) return snapshot.pokemon;
    return snapshot.pokemon.filter((p) => {
      if (p.name.toLowerCase().includes(normalizedQuery)) return true;
      if (p.moves.some((m) => m.name.toLowerCase().includes(normalizedQuery))) return true;
      if (p.items.some((it) => it.name.toLowerCase().includes(normalizedQuery))) return true;
      if (p.abilities.some((ab) => ab.name.toLowerCase().includes(normalizedQuery))) return true;
      return false;
    });
  }, [snapshot, normalizedQuery]);

  const filteredCores = useMemo(() => {
    if (!snapshot) return [];
    if (!normalizedQuery) return snapshot.cores;
    return snapshot.cores.filter((c) =>
      c.pokemon.some((mon) => mon.toLowerCase().includes(normalizedQuery))
    );
  }, [snapshot, normalizedQuery]);

  const filteredTeams = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.teams
      .filter((tm) => {
        if (tournamentFilter !== "all" && inferTeamCategory(tm) !== tournamentFilter) {
          return false;
        }
        if (!normalizedQuery) return true;
        return (
          tm.playerDisplayName.toLowerCase().includes(normalizedQuery) ||
          tm.tournamentName.toLowerCase().includes(normalizedQuery) ||
          tm.pokemon.some(
            (m) =>
              m.name.toLowerCase().includes(normalizedQuery) ||
              (m.item ?? "").toLowerCase().includes(normalizedQuery)
          )
        );
      })
      .slice(0, 60);
  }, [snapshot, tournamentFilter, normalizedQuery]);

  const selectedMon: PokemonMetaStats | undefined = useMemo(() => {
    if (!snapshot || !selectedId) return undefined;
    return (
      filteredPokemon.find((p) => p.id === selectedId) ??
      snapshot.pokemon.find((p) => p.id === selectedId) ??
      filteredPokemon[0]
    );
  }, [snapshot, selectedId, filteredPokemon]);

  const categoryBadgeLabel = (cat: TournamentCategory) => {
    if (cat === "major") return t.badgeMajor;
    if (cat === "global-challenge") return t.badgeGlobalChallenge;
    return t.badgeCircuit;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Cabecera y selector de idioma */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">
                {t.wipBadge}
              </span>
              <span className="text-xs font-mono text-slate-400">REG M-C</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">{t.appName}</h1>
            <p className="text-sm text-slate-400">{t.subtitle}</p>
          </div>

          <div
            className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs font-semibold"
            role="group"
            aria-label="Language selector"
          >
            <button
              type="button"
              onClick={() => setLang("es")}
              className={`px-3 py-1.5 rounded-md transition ${
                lang === "es"
                  ? "bg-orange-500 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 rounded-md transition ${
                lang === "en"
                  ? "bg-orange-500 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-300">
            {t.loading}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6 space-y-1">
            <p className="font-semibold text-red-300">{t.errorTitle}</p>
            <p className="text-sm text-red-200/80">{t.errorHint}</p>
          </div>
        )}

        {!loading && !error && snapshot && (
          <>
            {/* KPIs del snapshot */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">{t.tournaments}</div>
                <div className="text-2xl font-bold mt-1 text-orange-400">
                  {snapshot.meta.sources.limitlessTournaments}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">{t.teamsAnalyzed}</div>
                <div className="text-2xl font-bold mt-1">
                  {snapshot.meta.sources.limitlessTeams.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">{t.trackedPokemon}</div>
                <div className="text-2xl font-bold mt-1">{snapshot.pokemon.length}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs text-slate-400">{t.topCores}</div>
                <div className="text-2xl font-bold mt-1">{snapshot.cores.length}</div>
              </div>
            </section>

            {/* Pestañas + Buscador */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                <button
                  type="button"
                  onClick={() => setTab("usage")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === "usage"
                      ? "bg-slate-800 text-orange-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.tabUsage}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("cores")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === "cores"
                      ? "bg-slate-800 text-orange-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.tabCores}
                </button>
                <button
                  type="button"
                  onClick={() => setTab("teams")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === "teams"
                      ? "bg-slate-800 text-orange-300"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t.tabTeams}
                </button>
              </div>

              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full sm:w-80 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </section>

            {/* Vista 1: Uso y estadísticas + detalle */}
            {tab === "usage" && (
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  {filteredPokemon.length === 0 ? (
                    <p className="p-6 text-sm text-slate-400">{t.noResults}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-800 bg-slate-900 text-xs uppercase text-slate-400">
                          <tr>
                            <th className="py-3 px-3">{t.colRank}</th>
                            <th className="py-3 px-3">{t.colPokemon}</th>
                            <th className="py-3 px-3 text-right">{t.colUsage}</th>
                            <th className="py-3 px-3 text-right">{t.colWinRate}</th>
                            <th className="py-3 px-3 text-right">{t.colTourneyApps}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {filteredPokemon.map((mon, idx) => {
                            const isSelected = selectedMon?.id === mon.id;
                            return (
                              <tr
                                key={mon.id}
                                onClick={() => setSelectedId(mon.id)}
                                className={`cursor-pointer transition ${
                                  isSelected
                                    ? "bg-orange-500/10 text-orange-200"
                                    : "hover:bg-slate-800/50"
                                }`}
                              >
                                <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-3 font-medium">{mon.name}</td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {mon.usage.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                  {mon.winRate !== null ? `${mon.winRate.toFixed(1)}%` : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                  {mon.tournamentAppearances}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Panel lateral de detalle */}
                <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                  {selectedMon ? (
                    <>
                      <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h2 className="text-xl font-bold">{selectedMon.name}</h2>
                          <p className="text-xs text-slate-400 font-mono">
                            {t.colUsage}: {selectedMon.usage.toFixed(2)}%
                            {selectedMon.winRate !== null
                              ? ` · WR: ${selectedMon.winRate.toFixed(2)}%`
                              : ""}
                          </p>
                        </div>
                        {selectedMon.baseStats && (
                          <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
                            BST {selectedMon.baseStats.bst}
                          </span>
                        )}
                      </div>

                      <DetailList
                        title={lang === "es" ? "Objetos comunes" : "Common items"}
                        items={selectedMon.items.slice(0, 5)}
                      />
                      <DetailList
                        title={lang === "es" ? "Movimientos comunes" : "Common moves"}
                        items={selectedMon.moves.slice(0, 6)}
                      />
                      <DetailList
                        title={lang === "es" ? "Habilidades comunes" : "Common abilities"}
                        items={selectedMon.abilities.slice(0, 4)}
                      />
                      <DetailList
                        title={
                          lang === "es"
                            ? "Naturalezas (torneos Limitless)"
                            : "Natures (Limitless tournaments)"
                        }
                        items={selectedMon.natures.slice(0, 4)}
                      />
                      <DetailList
                        title={lang === "es" ? "Compañeros frecuentes" : "Common teammates"}
                        items={selectedMon.teammates.slice(0, 5)}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">{t.noResults}</p>
                  )}
                </div>
              </section>
            )}

            {/* Vista 2: Cores */}
            {tab === "cores" && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCores.length === 0 ? (
                  <p className="text-sm text-slate-400">{t.noResults}</p>
                ) : (
                  filteredCores.map((core, i) => (
                    <div
                      key={`${core.pokemon.join("-")}-${i}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs font-mono text-slate-400">#{i + 1}</div>
                        <div className="font-semibold mt-0.5">{core.pokemon.join(" · ")}</div>
                      </div>
                      <div className="text-right font-mono text-xs shrink-0">
                        <div className="text-orange-300 font-semibold">{core.uses} uses</div>
                        <div className="text-slate-400">
                          {core.usage.toFixed(1)}%
                          {core.winRate != null ? ` · ${core.winRate.toFixed(1)}% WR` : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {/* Vista 3: Equipos de torneo */}
            {tab === "teams" && (
              <section className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", t.filterAllTournaments, snapshot.teams.length],
                      [
                        "major",
                        t.filterMajorTournaments,
                        snapshot.teams.filter((tm) => inferTeamCategory(tm) === "major").length,
                      ],
                      [
                        "global-challenge",
                        t.filterGlobalChallenge,
                        snapshot.teams.filter((tm) => inferTeamCategory(tm) === "global-challenge")
                          .length,
                      ],
                      [
                        "circuit",
                        t.filterCircuit,
                        snapshot.teams.filter((tm) => inferTeamCategory(tm) === "circuit").length,
                      ],
                    ] as const
                  ).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTournamentFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        tournamentFilter === key
                          ? "bg-orange-500/15 text-orange-300 border-orange-500/40"
                          : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {label} ({count})
                    </button>
                  ))}
                </div>

                {filteredTeams.length === 0 ? (
                  <p className="text-sm text-slate-400">{t.noResults}</p>
                ) : (
                  <div className="space-y-3">
                    {filteredTeams.map((tm, idx) => {
                      const cat = inferTeamCategory(tm);
                      return (
                        <div
                          key={`${tm.tournamentId}-${tm.player}-${idx}`}
                          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              {tm.placing !== null && (
                                <span className="font-mono px-2 py-0.5 rounded bg-orange-500/15 text-orange-300">
                                  #{tm.placing}
                                </span>
                              )}
                              <span className="font-semibold text-sm text-slate-100">
                                {tm.playerDisplayName}
                              </span>
                              <span className="font-mono text-slate-400">
                                ({tm.record.wins}W-{tm.record.losses}L-{tm.record.ties}T)
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {categoryBadgeLabel(cat)}
                              </span>
                            </div>
                            <span className="text-slate-400">{tm.tournamentName}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {tm.pokemon.map((m, mIdx) => (
                              <div
                                key={`${m.id}-${mIdx}`}
                                className="rounded-lg border border-slate-800/90 bg-slate-950/70 px-2.5 py-2 text-xs"
                              >
                                <div className="font-medium text-slate-200 truncate">{m.name}</div>
                                <div className="text-slate-400 truncate mt-0.5">{m.item ?? "—"}</div>
                                {m.nature && (
                                  <div className="text-[11px] font-mono text-orange-300/80 truncate">
                                    {m.nature}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 py-5 px-4 text-center text-xs text-slate-500">
        {t.disclaimer}
      </footer>
    </div>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: { name: string; usage: number }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <ul className="space-y-1">
        {items.map((entry) => (
          <li key={entry.name} className="flex items-center justify-between text-xs">
            <span className="text-slate-200">{entry.name}</span>
            <span className="font-mono text-slate-400">{entry.usage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
