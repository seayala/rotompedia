import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "es" | "en";

const STORAGE_KEY = "rotompedia_lang";

const translations = {
  es: {
    appName: "RotomPedia · Analizador Meta VGC",
    subtitle: "Estadísticas de uso, cores y equipos competitivos de Pokémon Champions VGC",
    wipBadge: "v1.1 Meta Viewer · En construcción",
    loading: "Cargando snapshot de la regulación M-C...",
    errorTitle: "No se pudo cargar el snapshot de datos",
    errorHint: "Comprueba que exista public/data/regulations/M-C.json tras ejecutar la ingesta.",
    tournaments: "Torneos Limitless",
    teamsAnalyzed: "Equipos analizados",
    trackedPokemon: "Pokémon catalogados",
    topCores: "Cores destacados",
    searchPlaceholder: "Buscar Pokémon, ítem, hab. o mov...",
    tabUsage: "Uso y estadísticas",
    tabCores: "Cores de equipo",
    tabTeams: "Equipos de torneo",
    filterAllTournaments: "Todos los torneos",
    filterMajorTournaments: "Regionales, Internacionales, Mundiales",
    filterGlobalChallenge: "Global Challenge",
    filterCircuit: "Otros",
    badgeMajor: "Regional | IC | Mundial",
    badgeGlobalChallenge: "Global Challenge",
    badgeCircuit: "Circuito / Online",
    colRank: "#",
    colPokemon: "Pokémon",
    colUsage: "Uso",
    colWinRate: "Win Rate",
    colTourneyApps: "Apariciones torneo",
    noResults: "No hay resultados que coincidan con el filtro.",
    disclaimer: "Proyecto personal de fans sin afiliación oficial con Nintendo, Game Freak ni The Pokémon Company.",
  },
  en: {
    appName: "RotomPedia · VGC Meta Analyzer",
    subtitle: "Usage stats, team cores, and competitive rosters for Pokémon Champions VGC",
    wipBadge: "v1.1 Meta Viewer · In progress",
    loading: "Loading Regulation M-C snapshot...",
    errorTitle: "Could not load data snapshot",
    errorHint: "Make sure public/data/regulations/M-C.json exists after running ingestion.",
    tournaments: "Limitless Tournaments",
    teamsAnalyzed: "Teams analyzed",
    trackedPokemon: "Tracked Pokémon",
    topCores: "Top cores",
    searchPlaceholder: "Search Pokémon, item, ability, or move...",
    tabUsage: "Usage & stats",
    tabCores: "Team cores",
    tabTeams: "Tournament teams",
    filterAllTournaments: "All tournaments",
    filterMajorTournaments: "Regionals, Internationals, Worlds",
    filterGlobalChallenge: "Global Challenge",
    filterCircuit: "Other",
    badgeMajor: "Regional | IC | Worlds",
    badgeGlobalChallenge: "Global Challenge",
    badgeCircuit: "Circuit / Online",
    colRank: "#",
    colPokemon: "Pokémon",
    colUsage: "Usage",
    colWinRate: "Win Rate",
    colTourneyApps: "Tourney apps",
    noResults: "No results match the current filter.",
    disclaimer: "Unofficial fan project not affiliated with Nintendo, Game Freak, or The Pokémon Company.",
  },
} as const;

type Dict = Record<keyof (typeof translations)["es"], string>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: Dict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch {
    // Ignorar errores de almacenamiento en modo privado
  }
  void window;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window !== "undefined" ? detectInitialLang() : "en"
  );

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignorar errores de almacenamiento
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang(lang === "es" ? "en" : "es"),
      t: translations[lang],
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de LanguageProvider");
  return ctx;
}
