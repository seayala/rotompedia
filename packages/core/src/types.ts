export type RegulationCode = "M-C" | (string & {});

export type TournamentCategory = "major" | "global-challenge" | "circuit";

export interface WeightedEntry {
  name: string;
  /** Porcentaje de uso (0 - 100) */
  usage: number;
  /** Conteo absoluto opcional (p. ej. en apariciones de torneo) */
  count?: number;
}

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  bst: number;
}

export interface TypeMatchups {
  weakTo: string[];
  resists: string[];
  immuneTo: string[];
}

export interface PokemonMetaStats {
  id: string;
  name: string;
  usage: number;
  winRate: number | null;
  record?: {
    wins: number;
    losses: number;
  };
  tournamentAppearances: number;
  moves: WeightedEntry[];
  items: WeightedEntry[];
  abilities: WeightedEntry[];
  natures: WeightedEntry[];
  teammates: WeightedEntry[];
  baseStats?: BaseStats;
  matchups?: TypeMatchups;
}

export interface PokemonBuild {
  id: string;
  name: string;
  item: string | null;
  ability: string | null;
  nature: string | null;
  moves: string[];
}

export interface TournamentTeam {
  tournamentId: string;
  tournamentName: string;
  tournamentCategory?: TournamentCategory;
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
  pokemon: PokemonBuild[];
}

export interface TeamCore {
  pokemon: string[];
  uses: number;
  usage: number;
  winRate?: number | null;
}

export interface RegulationMeta {
  code: RegulationCode;
  name: string;
  pikalyticsFormat: string;
  generatedAt: string;
  sources: {
    limitlessTournaments: number;
    limitlessTeams: number;
    pikalyticsSampleTeams: number;
    pikalyticsDataDate: string | null;
  };
}

export interface RegulationSnapshot {
  meta: RegulationMeta;
  pokemon: PokemonMetaStats[];
  cores: TeamCore[];
  teams: TournamentTeam[];
}
