import type { RegulationCode } from "./types.js";

export interface RegulationDefinition {
  code: RegulationCode;
  name: string;
  shortLabel: {
    es: string;
    en: string;
  };
  limitlessFormat: string;
  pikalyticsFormat: string;
  snapshotFile: string;
  endDate?: string;
  status: "active" | "archived";
}

export const REGULATIONS: RegulationDefinition[] = [
  {
    code: "M-C",
    name: "Pokémon Champions VGC 2026 — Regulation M-C",
    shortLabel: {
      es: "Reg. M-C",
      en: "Reg. M-C",
    },
    limitlessFormat: "M-C",
    pikalyticsFormat: "gen9championsvgc2026regmc",
    snapshotFile: "M-C.json",
    endDate: "2026-12-02",
    status: "active",
  },
  {
    code: "M-B",
    name: "Pokémon Champions VGC 2026 — Regulation M-B",
    shortLabel: {
      es: "Reg. M-B",
      en: "Reg. M-B",
    },
    limitlessFormat: "M-B",
    pikalyticsFormat: "gen9championsvgc2026regmb",
    snapshotFile: "M-B.json",
    endDate: "2026-09-09",
    status: "archived",
  },
];

export const DEFAULT_REGULATION_CODE: RegulationCode =
  REGULATIONS.find((r) => r.status === "active")?.code ?? "M-C";

export function getRegulationDefinition(code?: string | null): RegulationDefinition {
  if (!code) return REGULATIONS[0];
  const normalized = code.trim().toUpperCase();
  return (
    REGULATIONS.find((r) => r.code.toUpperCase() === normalized) ?? REGULATIONS[0]
  );
}
