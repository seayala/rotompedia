import { useEffect, useMemo, useState } from "react";
import { DEFAULT_REGULATION_CODE,
  getRegulationDefinition,
  REGULATIONS,
  type PokemonMetaStats,
  type RegulationCode,
  type RegulationSnapshot,
  type TournamentCategory,
  type TournamentTeam, filterLegalAbilities } from "@rotompedia/core";
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

function formatLastUpdatedDate(isoDate: string | undefined | null, lang: "es" | "en"): string | null {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function countUniqueTournaments(teams: readonly { tournamentId?: string | null; tournamentName?: string | null }[]): number {
  const ids = new Set<string>();
  for (const tm of teams) {
    const key = (tm.tournamentId ?? tm.tournamentName ?? "").trim();
    if (key) ids.add(key);
  }
  return ids.size;
}

const SPRITE_SPECIAL_SLUGS: Record<string, string> = {


  "alolan-muk": "muk-alola",
  "alolan-ninetales": "ninetales-alola",
  "alolan-persian": "persian-alola",
  "galarian-weezing": "weezing-galar",
  "galarian-slowking": "slowking-galar",
  "hisuian-arcanine": "arcanine-hisui",
  "hisuian-lilligant": "lilligant-hisui",
  "hisuian-samurott": "samurott-hisui",
  "hisuian-typhlosion": "typhlosion-hisui",
  "hisuian-decidueye": "decidueye-hisui",
  "hisuian-goodra": "goodra-hisui",
  "hisuian-zoroark": "zoroark-hisui",
  "paldean-tauros-aqua-breed": "tauros-paldea-aqua",
  "paldean-tauros": "tauros-paldea",
  "bloodmoon-ursaluna": "ursaluna-bloodmoon",
  "eternal-flower-floette": "floette-eternal",
  "giratina-origin": "giratina-origin",
  "hearthflame-mask-ogerpon": "ogerpon-hearthflame",
  "wellspring-mask-ogerpon": "ogerpon-wellspring",
  "cornerstone-mask-ogerpon": "ogerpon-cornerstone",
  "oogerpon-hearthflame": "ogerpon-hearthflame",
  "oogerpon-wellspring": "ogerpon-wellspring",
  "oogerpon-cornerstone": "ogerpon-cornerstone",
  "heat-rotom": "rotom-heat",
  "wash-rotom": "rotom-wash",
  "mow-rotom": "rotom-mow",
  "ice-rider-calyrex": "calyrex-ice",
  "shadow-rider-calyrex": "calyrex-shadow",
  "rapid-strike-urshifu": "urshifu-rapid-strike",
  "single-strike-urshifu": "urshifu",
  "landorus-therian": "landorus-therian",
  "tornadus-therian": "tornadus-therian",
  "thundurus-therian": "thundurus-therian",
  "enamorus-therian": "enamorus-therian",
  "lycanroc-dusk": "lycanroc-dusk",
  "tatsugiri-droopy-form": "tatsugiri-droopy",
  "sirfetch-d": "sirfetchd",
  "kommo-o": "kommoo",
  "ho-oh": "hooh",
  "chi-yu": "chiyu",
  "chien-pao": "chienpao",
  "ting-lu": "tinglu",
  "iron-bundle": "ironbundle",
  "iron-hands": "ironhands",
  "iron-jugulis": "ironjugulis",
  "iron-moth": "ironmoth",
  "iron-treads": "irontreads",
  "iron-valiant": "ironvaliant",
  "flutter-mane": "fluttermane",
  "brute-bonnet": "brutebonnet",
  "gouging-fire": "gougingfire",
  "raging-bolt": "ragingbolt",
  "roaring-moon": "roaringmoon",
  "walking-wake": "walkingwake",
  "indeedee": "indeedee",
  "indeedee-f": "indeedee-f",
  "basculegion": "basculegion-m",
  "basculegion-f": "basculegion-f",
  "meowstic": "meowstic-m",
  "meowstic-f": "meowstic-f",
};

const BASE_SPECIES_FALLBACKS: Record<string, string> = {
  "alolan-muk": "muk",
  "alolan-ninetales": "ninetales",
  "alolan-persian": "persian",
  "galarian-weezing": "weezing",
  "galarian-slowking": "slowking",
  "hisuian-arcanine": "arcanine",
  "hisuian-lilligant": "lilligant",
  "hisuian-samurott": "samurott",
  "hisuian-typhlosion": "typhlosion",
  "hisuian-decidueye": "decidueye",
  "hisuian-goodra": "goodra",
  "hisuian-zoroark": "zoroark",
  "paldean-tauros-aqua-breed": "tauros",
  "paldean-tauros": "tauros",
  "female-indeedee": "indeedee",
  "basculegion": "basculegion-m",
  "female-basculegion": "basculegion-f",
  "basculegion-f": "basculegion-f",
  "female-meowstic": "meowstic",
  "bloodmoon-ursaluna": "ursaluna",
  "eternal-flower-floette": "floette",
  "hearthflame-mask-ogerpon": "ogerpon",
  "wellspring-mask-ogerpon": "ogerpon",
  "cornerstone-mask-ogerpon": "ogerpon",
  "heat-rotom": "rotom",
  "wash-rotom": "rotom",
  "mow-rotom": "rotom",
  "ice-rider-calyrex": "calyrex",
  "shadow-rider-calyrex": "calyrex",
  "rapid-strike-urshifu": "urshifu",
  "single-strike-urshifu": "urshifu",
  "lycanroc-dusk": "lycanroc",
  "tatsugiri-droopy-form": "tatsugiri",
};

function canonicalSpeciesDedupeKey(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const femaleMatch = trimmed.match(/^(?:female\s+(.+)|(.+?)\s*♀)$/);
  if (femaleMatch) {
    const base = (femaleMatch[1] || femaleMatch[2] || "").trim().replace(/[^a-z0-9]+/g, "-");
    return `${base}-f`;
  }
  return trimmed.replace(/[^a-z0-9]+/g, "-");
}

function canonicalDisplayName(name: string): string {
  const trimmed = name.trim();
  const femalePrefix = trimmed.match(/^female\s+(.+)$/i);
  if (femalePrefix) {
    return `${femalePrefix[1].trim()} ♀`;
  }
  return trimmed;
}

function normalizePokemonKey(name: string): string {
  const raw = name.trim().toLowerCase();
  const hasFemaleMarker = /♀/.test(raw) || /^female\s+/.test(raw);
  const base = raw
    .replace(/^female\s+/, "")
    .replace(/[♀]/g, "")
    .replace(/['’.]/g, "")
    .replace(/\s*\((hisuian|galarian|alolan|paldean)\)\s*/g, "-$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return hasFemaleMarker && !base.endsWith("-f") ? `${base}-f` : base;
}

const EXTRA_SPRITE_SLUGS: Record<string, string> = {
  "sirfetch": "sirfetchd",
  "sirfetchd": "sirfetchd",
  "paldean-tauros": "tauros-paldeacombat",
  "paldean-tauros-combat-breed": "tauros-paldeacombat",
  "paldean-tauros-blaze-breed": "tauros-paldeablaze",
  "paldean-tauros-aqua-breed": "tauros-paldeaaqua",
  "tauros-paldea-blaze": "tauros-paldeablaze",
  "tauros-paldea-aqua": "tauros-paldeaaqua",
  "tauros-paldea-combat": "tauros-paldeacombat",
  "galarian-stunfisk": "stunfisk-galar",
  "stunfisk-galar": "stunfisk-galar",
  "hisuian-avalugg": "avalugg-hisui",
  "avalugg-hisui": "avalugg-hisui",
};

function getPokemonSpriteCandidates(name: string): string[] {
  const clean = normalizePokemonKey(name);
  const extra = EXTRA_SPRITE_SLUGS[clean];
  const mapped = extra ?? SPRITE_SPECIAL_SLUGS[clean] ?? clean;
  const noHyphenMapped = mapped.replace(/-/g, "");
  const fallbackSpecies = BASE_SPECIES_FALLBACKS[clean];
  const lastWord = clean.split("-").pop() || clean;
  const firstWord = clean.split("-")[0] || clean;

  const isVariantSpecific =
    clean.endsWith("-f") ||
    mapped.endsWith("-f") ||
    mapped.endsWith("-m") ||
    clean === "basculegion";

  const explicitMegaMap: Record<string, string[]> = {
    "raichu-mega-x": ["raichu-megax", "raichumegax", "raichu-mega-x", "raichumega-x", "raichu-mega", "raichumega"],
    "raichu-mega-y": ["raichu-megay", "raichumegay", "raichu-mega-y", "raichumega-y", "raichu-mega", "raichumega"],
    "staraptor-mega": ["staraptor-mega", "staraptormega"],
  };

  const megaMatch = clean.match(/^(.+?)-mega(-([xyz]))?$/);
  const megaSuffix = megaMatch?.[3] ?? "";
  const megaBase = megaMatch?.[1] ?? clean.replace(/-mega(-[xyz])?$/, "");
  const extraExplicit =
    explicitMegaMap[clean] ?? explicitMegaMap[mapped] ?? [];

  const megaVariants =
    clean.includes("-mega") || mapped.includes("-mega") || extraExplicit.length > 0
      ? [
          ...extraExplicit,
          mapped,
          noHyphenMapped,
          clean,
          clean.replace(/-/g, ""),
          megaSuffix ? `${megaBase}-mega${megaSuffix}` : "",
          megaSuffix ? `${megaBase}mega${megaSuffix}` : "",
          `${megaBase}-mega`,
          `${megaBase}mega`,
          megaBase,
        ]
      : [];

  const slugs = Array.from(
    new Set(
      (
        isVariantSpecific
          ? [...megaVariants, mapped, noHyphenMapped, clean, fallbackSpecies]
          : [
              ...megaVariants,
              mapped,
              noHyphenMapped,
              clean,
              fallbackSpecies,
              lastWord,
              firstWord,
            ]
      ).filter((s): s is string => Boolean(s))
    )
  );

  if (clean === "basculegion" && !slugs.includes("basculegion")) {
    slugs.push("basculegion");
  }

  const urls: string[] = [];
  for (const slug of slugs) {
    urls.push(`https://play.pokemonshowdown.com/sprites/dex/${slug}.png`);
    urls.push(`https://play.pokemonshowdown.com/sprites/gen5/${slug}.png`);
    urls.push(`https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`);
  }

  return Array.from(new Set(urls));
}
const preloadedSpriteUrls = new Set<string>();

function preloadSpriteUrl(url: string) {
  if (!url || typeof window === "undefined" || preloadedSpriteUrls.has(url)) return;
  preloadedSpriteUrls.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function PokemonSprite({
  name,
  sizeClass = "w-8 h-8",
  eager = false,
}: {
  name: string;
  sizeClass?: string;
  eager?: boolean;
}) {
  const candidates = useMemo(() => getPokemonSpriteCandidates(name), [name]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [name]);

  if (step >= candidates.length) {
    return (
      <span
        aria-hidden="true"
        className={`${sizeClass} inline-block shrink-0`}
      />
    );
  }

  return (
    <img
      src={candidates[step]}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      alt={name}
      onError={() => setStep((prev) => prev + 1)}
      className={`${sizeClass} object-contain shrink-0 select-none`}
    />
  );
}


function RotomNetworkBackground() {
  useEffect(() => {
    const canvas = document.getElementById("rotom-net") as HTMLCanvasElement | null;
    if (!canvas) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animId = 0;
    let frameCount = 0;
    const pointer = { x: -9999, y: -9999 };
    let uiRects: DOMRect[] = [];

    const interactiveSelector =
      'header, nav, button, a, input, select, textarea, label, table, [role="button"], [role="tab"], [role="menuitem"], .rounded-xl, .rounded-lg';

    const uiBackdropSelector =
      'header, nav, table, [role="menu"], [role="listbox"], .rounded-xl, .rounded-lg';

    interface NodePt {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      warm: boolean;
    }

    let nodes: NodePt[] = [];

    const refreshUiRects = () => {
      const els = document.querySelectorAll(uiBackdropSelector);
      const next: DOMRect[] = [];
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth
        ) {
          next.push(rect);
        }
      });
      uiRects = next;
    };

    const getDimFactor = (x: number, y: number): number => {
      for (let i = 0; i < uiRects.length; i++) {
        const r = uiRects[i];
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return 0.22;
        }
      }
      return 1;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(24, Math.min(64, Math.floor((width * height) / 28000)));
      nodes = Array.from({ length: count }, (_, idx) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: 1.4 + Math.random() * 1.6,
        warm: idx % 3 !== 0,
      }));
      refreshUiRects();
    };

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target || target.closest(interactiveSelector)) {
        pointer.x = -9999;
        pointer.y = -9999;
        return;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };

    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const onScrollOrResize = () => {
      refreshUiRects();
    };

    const step = () => {
      frameCount += 1;
      if (frameCount % 20 === 0) {
        refreshUiRects();
      }

      ctx.clearRect(0, 0, width, height);
      const maxDist = 135;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        const dimA = getDimFactor(a.x, a.y);

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const dimB = getDimFactor(b.x, b.y);
            const dimMid = getDimFactor((a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
            const edgeDim = Math.min(dimA, dimB, dimMid);
            const alpha = (1 - dist / maxDist) * 0.14 * edgeDim;
            ctx.strokeStyle = a.warm
              ? `rgba(249, 115, 22, ${alpha.toFixed(3)})`
              : `rgba(34, 211, 238, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const pdx = a.x - pointer.x;
        const pdy = a.y - pointer.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist < 170) {
          const pAlpha = (1 - pdist / 170) * 0.25 * dimA;
          ctx.strokeStyle = `rgba(251, 191, 36, ${pAlpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }

        const dotAlpha = (a.warm ? 0.42 : 0.36) * dimA;
        ctx.fillStyle = a.warm
          ? `rgba(249, 115, 22, ${dotAlpha.toFixed(3)})`
          : `rgba(34, 211, 238, ${dotAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = window.requestAnimationFrame(step);
    };

    resize();
    step();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas id="rotom-net" aria-hidden="true" />;
}
function winRateColorClass(wr: number | null | undefined): string {
  if (wr === null || wr === undefined || Number.isNaN(wr)) return "text-slate-400";
  return wr >= 50 ? "text-emerald-300/85" : "text-rose-300/80";
}

const TYPE_META: Record<
  string,
  { bg: string; border: string; text: string; glyph: string }
> = {
  normal: { bg: "bg-stone-700/80", border: "border-stone-500/50", text: "text-stone-100", glyph: "●" },
  fire: { bg: "bg-orange-950/85", border: "border-orange-500/50", text: "text-orange-200", glyph: "🔥" },
  water: { bg: "bg-sky-950/85", border: "border-sky-500/50", text: "text-sky-200", glyph: "💧" },
  electric: { bg: "bg-amber-950/85", border: "border-amber-400/50", text: "text-amber-200", glyph: "⚡" },
  grass: { bg: "bg-emerald-950/85", border: "border-emerald-500/50", text: "text-emerald-200", glyph: "🌿" },
  ice: { bg: "bg-cyan-950/85", border: "border-cyan-400/50", text: "text-cyan-200", glyph: "❄" },
  fighting: { bg: "bg-rose-950/85", border: "border-rose-500/50", text: "text-rose-200", glyph: "🥊" },
  poison: { bg: "bg-purple-950/85", border: "border-purple-400/50", text: "text-purple-200", glyph: "☠" },
  ground: { bg: "bg-amber-900/75", border: "border-amber-600/50", text: "text-amber-100", glyph: "⛰" },
  flying: { bg: "bg-indigo-950/85", border: "border-indigo-400/50", text: "text-indigo-200", glyph: "🕊" },
  psychic: { bg: "bg-pink-950/85", border: "border-pink-400/50", text: "text-pink-200", glyph: "🔮" },
  bug: { bg: "bg-lime-950/85", border: "border-lime-500/50", text: "text-lime-200", glyph: "🐛" },
  rock: { bg: "bg-yellow-950/80", border: "border-yellow-600/50", text: "text-yellow-200", glyph: "🪨" },
  ghost: { bg: "bg-violet-950/85", border: "border-violet-500/50", text: "text-violet-200", glyph: "👻" },
  dragon: { bg: "bg-blue-950/85", border: "border-indigo-500/50", text: "text-blue-200", glyph: "🐉" },
  dark: { bg: "bg-zinc-900/90", border: "border-zinc-600/50", text: "text-zinc-200", glyph: "🌑" },
  steel: { bg: "bg-slate-800/90", border: "border-slate-500/50", text: "text-slate-200", glyph: "⚙" },
  fairy: { bg: "bg-fuchsia-950/85", border: "border-fuchsia-400/50", text: "text-fuchsia-200", glyph: "✦" },
};

function TypeIconBadge({ label }: { label: string }) {
  const match = label.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
  const rawName = (match?.[1] ?? label).trim();
  const mult = (match?.[2] ?? "").trim();
  const key = rawName.toLowerCase().replace(/[^a-z]/g, "");
  const meta = TYPE_META[key] ?? {
    bg: "bg-slate-800/90",
    border: "border-slate-700/80",
    text: "text-slate-200",
    glyph: "•",
  };

  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs leading-none ${meta.bg} ${meta.border} ${meta.text}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" fill="currentColor" fillOpacity="0.24" />
        <text
          x="8"
          y="11.5"
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
        >
          {meta.glyph}
        </text>
      </svg>
      {mult ? (
        <span className="font-mono text-[11px] font-semibold opacity-95">{mult}</span>
      ) : (
        <span className="sr-only">{rawName}</span>
      )}
    </span>
  );
}

function formatTeamPokePaste(tm: any): string {
  const lines: string[] = [];
  lines.push(`=== ${tm.tournamentName} — ${tm.playerDisplayName} (#${tm.placing ?? "?"}) ===`);
  lines.push("");
  for (const m of tm.pokemon ?? []) {
    const header = m.item ? `${m.name} @ ${m.item}` : `${m.name}`;
    lines.push(header);
    if (m.ability) lines.push(`Ability: ${m.ability}`);
    if (m.teraType) lines.push(`Tera Type: ${m.teraType}`);
    if (Array.isArray(m.moves) && m.moves.length > 0) {
      for (const mv of m.moves) {
        if (mv) lines.push(`- ${mv}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export default function App() {
  const { lang, setLang, t } = useI18n();
  const [regulationCode, setRegulationCode] = useState<RegulationCode>(DEFAULT_REGULATION_CODE);
  const currentReg = useMemo(() => getRegulationDefinition(regulationCode), [regulationCode]);

  const [snapshot, setSnapshot] = useState<RegulationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [tab, setTab] = useState<Tab>("usage");
  const [tournamentFilter, setTournamentFilter] = useState<TournamentFilter>("all");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [highlightedPasteTeamKey, setHighlightedPasteTeamKey] = useState<string | null>(null);
  const [copiedPasteTeamKey, setCopiedPasteTeamKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setSelectedId(null);
    setTournamentFilter("all");
    setSelectedTournamentId(null);

    if (currentReg.status === "upcoming") {
      setSnapshot(null);
      setLoading(false);
      setError(false);
      return () => {
        active = false;
      };
    }

    fetch(`${import.meta.env.BASE_URL}data/regulations/${currentReg.snapshotFile}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RegulationSnapshot>;
      })
      .then((data) => {
        if (!active) return;
        const dedupedMons = Array.isArray(data.pokemon)
          ? Array.from(
              data.pokemon.reduce((acc, mon) => {
                if (mon.name.trim().toLowerCase() === "floette") {
                  return acc;
                }
                const key = canonicalSpeciesDedupeKey(mon.name);
                const candidate = { ...mon, name: canonicalDisplayName(mon.name) };
                const prev = acc.get(key);
                if (!prev || (candidate.usage ?? 0) > (prev.usage ?? 0)) {
                  acc.set(key, candidate);
                }
                return acc;
              }, new Map<string, typeof data.pokemon[number]>()).values()
            )
          : data.pokemon;
        const normalizedData = { ...data, pokemon: dedupedMons };
        setSnapshot(normalizedData);
        if (normalizedData.pokemon.length > 0) {
          setSelectedId(normalizedData.pokemon[0].id);
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
  }, [currentReg]);

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

  useEffect(() => {
    if (!snapshot?.cores?.length) return;
    const mons: string[] = [];
    for (const core of snapshot.cores) {
      for (const mon of core.pokemon.slice(0, 6)) {
        mons.push(mon);
      }
    }
    const ordered = [
      ...mons.filter((m) => /mega/i.test(m)),
      ...mons.filter((m) => !/mega/i.test(m)),
    ];
    const uniqueMons = Array.from(new Set(ordered));
    const timer = window.setTimeout(() => {
      for (const mon of uniqueMons) {
        const cands = getPokemonSpriteCandidates(mon);
        if (cands[0]) preloadSpriteUrl(cands[0]);
      }
    }, tab === "cores" ? 0 : 180);
    return () => window.clearTimeout(timer);
  }, [snapshot, tab]);

  const filteredCores = useMemo(() => {
    if (!snapshot) return [];
    if (!normalizedQuery) return snapshot.cores;
    return snapshot.cores.filter((c) =>
      c.pokemon.some((mon) => mon.toLowerCase().includes(normalizedQuery))
    );
  }, [snapshot, normalizedQuery]);

  const matchingTeams = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.teams.filter((tm) => {
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
    });
  }, [snapshot, tournamentFilter, normalizedQuery]);

  const availableTournaments = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        date: string;
        category: TournamentCategory;
        teamCount: number;
      }
    >();
    for (const tm of matchingTeams) {
      const id = String(tm.tournamentId || tm.tournamentName);
      const prev = map.get(id);
      if (prev) {
        prev.teamCount += 1;
      } else {
        map.set(id, {
          id,
          name: tm.tournamentName,
          date: tm.date,
          category: inferTeamCategory(tm),
          teamCount: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [matchingTeams]);

  const filteredTeams = useMemo(() => {
    if (!selectedTournamentId) return [];
    return matchingTeams
      .filter((tm) => String(tm.tournamentId || tm.tournamentName) === selectedTournamentId)
      .slice(0, 60);
  }, [matchingTeams, selectedTournamentId]);

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
    <div className="min-h-screen text-slate-100 flex flex-col">
      <RotomNetworkBackground />
      {/* Cabecera y selector de idioma */}
      <header className="border-b border-orange-500/20 bg-slate-900/75 backdrop-blur shadow-[0_1px_24px_rgba(249,115,22,0.08)]">
        <div className="w-full max-w-[1640px] mx-auto px-2.5 sm:px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={`${import.meta.env.BASE_URL}rotomdex-logo.png`}
              alt="RotomDex"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow shrink-0"
            />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/15 text-orange-300 border border-orange-500/30">
                  {t.wipBadge}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-0.5">{t.appName}</h1>
              <p className="text-sm text-slate-400">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-200">
                <span className="text-slate-400">
                  {lang === "es" ? "Regulación" : "Regulation"}
                </span>
                <select
                  value={currentReg.code}
                  onChange={(e) => setRegulationCode(e.target.value as RegulationCode)}
                  className="bg-slate-950 text-slate-100 focus:outline-none cursor-pointer"
                  aria-label={lang === "es" ? "Selector de regulación" : "Regulation selector"}
                >
                  {REGULATIONS.map((reg) => {
                    const isUpcoming = reg.status === "upcoming";
                    const baseLabel = reg.shortLabel[lang].replace(/\s*\((Próx\.|Soon)\)/i, "").trim();
                    return (
                      <option
                        key={reg.code}
                        value={reg.code}
                        disabled={isUpcoming}
                      >
                        {isUpcoming ? `${baseLabel} — Soon` : reg.shortLabel[lang]}
                      </option>
                    );
                  })}
                </select>
              </label>

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

            {snapshot?.meta?.generatedAt && (
              <span className="text-xs text-slate-400">
                {lang === "es" ? "Actualizado:" : "Updated:"}{" "}
                <span className="text-slate-300">
                  {formatLastUpdatedDate(snapshot.meta.generatedAt, lang)}
                </span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-[1640px] mx-auto px-2.5 sm:px-4 py-5 sm:py-6 space-y-6">
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-300">
            {t.loading.replace("{reg}", currentReg.code)}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6 space-y-1">
            <p className="font-semibold text-red-300">{t.errorTitle}</p>
            <p className="text-sm text-red-200/80">
              {t.errorHint.replace("{file}", currentReg.snapshotFile)}
            </p>
          </div>
        )}

        {!loading && !error && snapshot && (
          <>
            <div className="flex flex-col lg:flex-row items-start gap-5">
              {/* KPIs del snapshot en lateral izquierdo */}
              <aside className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-44 shrink-0 self-start">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                  <div className="text-[11px] text-slate-400">{t.tournaments}</div>
                  <div className="text-xl font-bold mt-1 text-orange-400">
                    {snapshot.meta.sources.limitlessTournaments}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                  <div className="text-[11px] text-slate-400">{t.teamsAnalyzed}</div>
                  <div className="text-xl font-bold mt-1">
                    {snapshot.meta.sources.limitlessTeams.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                  <div className="text-[11px] text-slate-400">{t.trackedPokemon}</div>
                  <div className="text-xl font-bold mt-1">{snapshot.pokemon.length}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                  <div className="text-[11px] text-slate-400">{t.topCores}</div>
                  <div className="text-xl font-bold mt-1">{snapshot.cores.length}</div>
                </div>
              </aside>

              <div className="flex-1 min-w-0 w-full space-y-6">
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
                            <th className="py-3 px-3 text-right w-24 sm:w-28">{t.colUsage}</th>
                            <th className="py-3 px-3 text-right w-24 sm:w-28">{t.colWinRate}</th>
                            <th className="py-3 px-3 text-right w-28 sm:w-32">{t.colTourneyApps}</th>
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
                                <td className="py-3 px-3 font-medium">
                                  <div className="flex items-center gap-2.5">
                                    <PokemonSprite name={mon.name} sizeClass="w-10 h-10 sm:w-11 sm:h-11" />
                                    <span>{mon.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {mon.usage.toFixed(1)}%
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono ${winRateColorClass(mon.winRate)}`}>
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
                <div className="order-first lg:order-none lg:col-span-5 lg:sticky lg:top-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  {selectedMon ? (
                    <>
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                          <PokemonSprite name={selectedMon.name} sizeClass="w-12 h-12" />
                          <div>
                            <h2 className="text-xl font-bold">{selectedMon.name}</h2>
                          <p className="text-xs text-slate-400 font-mono">
                            {t.colUsage}: {selectedMon.usage.toFixed(2)}%
                            {selectedMon.winRate !== null ? (
                              <span className={winRateColorClass(selectedMon.winRate)}>
                                {` · WR: ${selectedMon.winRate.toFixed(2)}%`}
                              </span>
                            ) : null}
                          </p>
                          </div>
                        </div>
                        {selectedMon.baseStats && (
                          <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300">
                            BST {selectedMon.baseStats.bst}
                          </span>
                        )}
                      </div>

                      {selectedMon.matchups && (
                        <div className="space-y-1.5 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {lang === "es" ? "Matchups defensivos" : "Defensive matchups"}
                          </h3>
                          {(() => {
                            const sortByMultDesc = (list: string[]) =>
                              [...list].sort((a, b) => {
                                const getWeight = (s: string) => {
                                  if (s.includes("4x")) return 4;
                                  if (s.includes("2x")) return 2;
                                  if (s.includes("1/2x")) return 0.5;
                                  if (s.includes("1/4x")) return 0.25;
                                  return 1;
                                };
                                return getWeight(b) - getWeight(a);
                              });

                            const weakSorted = sortByMultDesc(selectedMon.matchups.weakTo ?? []);
                            const resistSorted = sortByMultDesc(selectedMon.matchups.resists ?? []);
                            const immuneSorted = [...(selectedMon.matchups.immuneTo ?? [])];

                            return (
                              <div className="space-y-2.5 text-xs">
                                <div className="flex items-start justify-between gap-3">
                                  <span className="text-red-300/90 font-medium shrink-0 pt-1">
                                    {lang === "es" ? "Débil ante" : "Weak to"}
                                    {weakSorted.length > 0 && (
                                      <span className="ml-1.5 text-[10px] font-mono text-red-300/60">
                                        ({weakSorted.length})
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex flex-wrap justify-start gap-1.5 max-w-[72%]">
                                    {weakSorted.length > 0 ? (
                                      weakSorted.map((tp: string) => (
                                        <TypeIconBadge key={`w-${tp}`} label={tp} />
                                      ))
                                    ) : (
                                      <span className="text-slate-400 pt-1">—</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-start justify-between gap-3 border-t border-slate-800/70 pt-2.5">
                                  <span className="text-emerald-300/90 font-medium shrink-0 pt-1">
                                    {lang === "es" ? "Resiste" : "Resists"}
                                    {resistSorted.length > 0 && (
                                      <span className="ml-1.5 text-[10px] font-mono text-emerald-300/60">
                                        ({resistSorted.length})
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex flex-wrap justify-start gap-1.5 max-w-[72%]">
                                    {resistSorted.length > 0 ? (
                                      resistSorted.map((tp: string) => (
                                        <TypeIconBadge key={`r-${tp}`} label={tp} />
                                      ))
                                    ) : (
                                      <span className="text-slate-400 pt-1">—</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-start justify-between gap-3 border-t border-slate-800/70 pt-2.5">
                                  <span className="text-sky-300/90 font-medium shrink-0 pt-1">
                                    {lang === "es" ? "Inmune a" : "Immune to"}
                                    {immuneSorted.length > 0 && (
                                      <span className="ml-1.5 text-[10px] font-mono text-sky-300/60">
                                        ({immuneSorted.length})
                                      </span>
                                    )}
                                  </span>
                                  <div className="flex flex-wrap justify-start gap-1.5 max-w-[72%]">
                                    {immuneSorted.length > 0 ? (
                                      immuneSorted.map((tp: string) => (
                                        <TypeIconBadge key={`i-${tp}`} label={tp} />
                                      ))
                                    ) : (
                                      <span className="text-slate-400 pt-1">—</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <DetailList
                        title={lang === "es" ? "Objetos comunes" : "Common items"}
                        kind="item"
                        items={selectedMon.items.slice(0, 5)}
                      />
                      <DetailList
                        title={lang === "es" ? "Movimientos comunes" : "Common moves"}
                        items={selectedMon.moves.slice(0, 6)}
                      />
                      <DetailList
                        title={lang === "es" ? "Habilidades comunes" : "Common abilities"}
                        items={filterLegalAbilities(selectedMon.name, selectedMon.abilities).slice(0, 3)}
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
                        kind="pokemon"
                        items={selectedMon.teammates.slice(0, 5)}
                        onSelectPokemon={(mateName) => {
                          const target = snapshot.pokemon.find(
                            (p: any) => p.name.toLowerCase() === mateName.toLowerCase()
                          );
                          if (target) {
                            setSelectedId(target.id);
                          }
                        }}
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
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCores.length === 0 ? (
                  <p className="text-sm text-slate-400">{t.noResults}</p>
                ) : (
                  filteredCores.map((core, i) => (
                      <div
                        key={`${core.pokemon.join("-")}-${i}`}
                        className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono text-slate-400">#{i + 1}</div>
                          <div className="mt-1.5 grid grid-cols-6 sm:flex sm:flex-wrap items-center gap-1 sm:gap-1.5 w-full sm:w-auto">
                            {core.pokemon.slice(0, 6).map((mon: string, mIdx: number) => (
                              <span
                                key={`${mon}-${mIdx}`}
                                title={mon}
                                aria-label={mon}
                                className="inline-flex items-center justify-center min-w-0"
                              >
                                <PokemonSprite name={mon} eager sizeClass="w-9 h-9 sm:w-[52px] sm:h-[52px]" />
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:block sm:text-right font-mono text-xs shrink-0 sm:pl-2 border-t border-slate-800/70 pt-2 sm:border-0 sm:pt-0">
                          <div className="text-orange-300 font-semibold whitespace-nowrap">{core.uses} uses</div>
                          {core.winRate != null ? (
                            <div className={`${winRateColorClass(core.winRate)} whitespace-nowrap`}>
                              {`${core.winRate.toFixed(1)}% WR`}
                            </div>
                          ) : null}
                        </div>
                      </div>
                  ))
                )}
              </section>
            )}

            {/* Vista 3: Equipos de torneo */}
            {tab === "teams" && (
              <section className="space-y-4">
                <p className="text-xs text-slate-400">
                  {lang === "es"
                    ? "Disponibles los pokepaste de los equipos del Top 8 de cada torneo."
                    : "PokePaste available for Top 8 teams in each tournament."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", t.filterAllTournaments, countUniqueTournaments(snapshot.teams)],
                      [
                        "major",
                        t.filterMajorTournaments,
                        countUniqueTournaments(
                          snapshot.teams.filter((tm) => inferTeamCategory(tm) === "major")
                        ),
                      ],
                      [
                        "global-challenge",
                        t.filterGlobalChallenge,
                        countUniqueTournaments(
                          snapshot.teams.filter((tm) => inferTeamCategory(tm) === "global-challenge")
                        ),
                      ],
                      [
                        "circuit",
                        t.filterCircuit,
                        countUniqueTournaments(
                          snapshot.teams.filter((tm) => inferTeamCategory(tm) === "circuit")
                        ),
                      ],
                    ] as const
                  ).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTournamentFilter(key);
                        setSelectedTournamentId(null);
                      }}
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

                {!selectedTournamentId ? (
                  availableTournaments.length === 0 ? (
                    <p className="text-sm text-slate-400">{t.noResults}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableTournaments.map((trn) => (
                        <button
                          key={trn.id}
                          type="button"
                          onClick={() => setSelectedTournamentId(trn.id)}
                          className="text-left rounded-xl border border-slate-800 bg-slate-900/60 hover:border-orange-500/50 hover:bg-slate-900 p-4 transition flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="font-semibold text-sm text-slate-100 truncate">
                              {trn.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {categoryBadgeLabel(trn.category)}
                              </span>
                              {trn.date && <span className="font-mono">{trn.date}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm font-semibold text-orange-300">
                              {trn.teamCount}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {lang === "es" ? "equipos" : "teams"}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTournamentId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900 text-slate-200 hover:border-orange-500/40 transition"
                      >
                        {lang === "es" ? "← Volver a torneos" : "← Back to tournaments"}
                      </button>
                    </div>

                    {filteredTeams.length === 0 ? (
                      <p className="text-sm text-slate-400">{t.noResults}</p>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {filteredTeams.map((tm, idx) => {
                          const cat = inferTeamCategory(tm);
                          const teamKey = `${tm.tournamentId}-${tm.player}-${idx}`;
                          const isTop8 = tm.placing !== null && tm.placing >= 1 && tm.placing <= 8;
                          const isPasteCardActive = highlightedPasteTeamKey === teamKey;
                          const isCopied = copiedPasteTeamKey === teamKey;
                          const pasteText = isTop8 ? formatTeamPokePaste(tm) : "";

                          const handleCopyPaste = async () => {
                            if (!pasteText) return;
                            try {
                              if (navigator?.clipboard?.writeText) {
                                await navigator.clipboard.writeText(pasteText);
                              }
                              setCopiedPasteTeamKey(teamKey);
                              setTimeout(() => {
                                setCopiedPasteTeamKey((prev) => (prev === teamKey ? null : prev));
                              }, 1800);
                            } catch {
                              setCopiedPasteTeamKey(null);
                            }
                          };

                          return (
                            <div
                              key={teamKey}
                              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  {tm.placing !== null && (
                                    <span
                                      className={`shrink-0 font-mono font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded-md border ${
                                        tm.placing === 1
                                          ? "bg-amber-400/20 text-amber-200 border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.22)]"
                                          : tm.placing === 2
                                          ? "bg-slate-300/15 text-slate-100 border-slate-300/45"
                                          : tm.placing === 3
                                          ? "bg-orange-700/25 text-orange-200 border-orange-500/50"
                                          : "bg-indigo-500/15 text-indigo-200 border-indigo-400/35"
                                      }`}
                                    >
                                      {`Top ${tm.placing}`}
                                    </span>
                                  )}
                                  <span className="font-semibold text-sm text-slate-100">
                                    {tm.playerDisplayName}
                                  </span>
                                  {cat !== "major" && (
                                    <span className="font-mono text-slate-400">
                                      ({tm.record.wins}W-{tm.record.losses}L-{tm.record.ties}T)
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                    {categoryBadgeLabel(cat)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">{tm.tournamentName}</span>
                                  {isTop8 && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const willOpen = highlightedPasteTeamKey !== teamKey;
                                        setHighlightedPasteTeamKey(willOpen ? teamKey : null);
                                        if (willOpen && pasteText) {
                                          try {
                                            if (navigator?.clipboard?.writeText) {
                                              await navigator.clipboard.writeText(pasteText);
                                            }
                                            setCopiedPasteTeamKey(teamKey);
                                            setTimeout(() => {
                                              setCopiedPasteTeamKey((prev) =>
                                                prev === teamKey ? null : prev
                                              );
                                            }, 2000);
                                          } catch {
                                            setCopiedPasteTeamKey(null);
                                          }
                                        }
                                      }}
                                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium transition ${
                                        isPasteCardActive || isCopied
                                          ? "border-orange-400/70 bg-orange-500/20 text-orange-200"
                                          : "border-orange-500/35 bg-orange-500/10 text-orange-300 hover:border-orange-400/60 hover:bg-orange-500/15"
                                      }`}
                                    >
                                      {isCopied
                                        ? (lang === "es" ? "PokePaste · Copiado" : "PokePaste · Copied")
                                        : "PokePaste"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-6 items-center gap-1.5 sm:gap-2 w-full py-1">
                                {tm.pokemon.map((m: any, mIdx: number) => (
                                  <div
                                    key={`${m.id}-${mIdx}`}
                                    className="relative w-full h-16 sm:h-[72px] flex items-center justify-center select-none"
                                  >
                                    <div className="relative inline-flex items-center justify-center w-16 h-16">
                                      <PokemonSprite name={m.name} sizeClass="w-14 h-14 sm:w-[68px] sm:h-[68px]" />
                                      {m.item ? (
                                        <ItemSpriteIcon
                                          name={String(m.item)}
                                          className="absolute bottom-0 right-0 w-6 h-6 object-contain drop-shadow pointer-events-none"
                                        />
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {isTop8 && isPasteCardActive && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>PokePaste (Top 8)</span>
                                    <span className="font-mono text-emerald-300/90">
                                      {isCopied
                                        ? (lang === "es" ? "Copiado al portapapeles" : "Copied to clipboard")
                                        : ""}
                                    </span>
                                  </div>
                                  <pre
                                    onClick={handleCopyPaste}
                                    className="max-h-64 overflow-auto cursor-pointer rounded-lg border border-orange-500/30 bg-slate-950/90 p-3 text-[11px] font-mono text-slate-200 whitespace-pre-wrap hover:border-orange-400/50 transition"
                                  >
                                    {pasteText}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 py-5 px-4 text-center text-xs text-slate-500">
        {t.disclaimer}
      </footer>
    </div>
  );
}

const ITEM_SLUG_ALIASES: Record<string, string[]> = {
  "king-s-rock": ["kings-rock"],
  "kings-rock": ["kings-rock", "king-s-rock"],
  "miracleseed": ["miracle-seed"],
  "miracle-seed": ["miracle-seed", "miracleseed"],
  "mysticwater": ["mystic-water"],
  "mystic-water": ["mystic-water", "mysticwater"],
  "sharpbeak": ["sharp-beak"],
  "sharp-beak": ["sharp-beak", "sharpbeak"],
  "culbur-berry": ["colbur-berry"],
  "frosslasite": ["froslassite"],
  "leek": ["leek", "stick"],
};

function getItemSpriteCandidates(rawItem: string): string[] {
  const clean = String(rawItem ?? "").trim();
  if (!clean) return [];
  const lower = clean.toLowerCase();
  if (lower === "nothing" || lower === "other" || lower === "none") return [];

  const slug = lower
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return [];

  const candidates = new Set<string>([slug, slug.replace(/-/g, "")]);
  const aliases = ITEM_SLUG_ALIASES[slug] ?? [];
  for (const alias of aliases) {
    candidates.add(alias);
    candidates.add(alias.replace(/-/g, ""));
  }

  const rawBase = String(import.meta.env.BASE_URL ?? "/");
  const normalizedBase = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

  const urls: string[] = [];
  for (const c of candidates) {
    if (c) urls.push(`${normalizedBase}items/${c}.png`);
  }
  return urls;
}

function ItemSpriteIcon({
  name,
  className = "w-5 h-5 object-contain shrink-0",
}: {
  name: string;
  className?: string;
}) {
  const candidates = getItemSpriteCandidates(name);
  const [idx, setIdx] = useState(0);
  const [exhausted, setExhausted] = useState(false);

  if (candidates.length === 0 || exhausted) return null;
  const currentSrc = candidates[Math.min(idx, candidates.length - 1)];

  return (
    <img
      key={`${name}-${currentSrc}`}
      src={currentSrc}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => {
        if (idx + 1 < candidates.length) {
          setIdx((prev) => prev + 1);
        } else {
          setExhausted(true);
        }
      }}
      className={className}
    />
  );
}

function DetailList({
  title,
  items,
  kind = "generic",
  onSelectPokemon,
}: {
  title: string;
  items: { name: string; usage: number }[];
  kind?: "item" | "pokemon" | "generic";
  onSelectPokemon?: (name: string) => void;
}) {
  if (items.length === 0) return null;
  const maxUsage = Math.max(...items.map((x) => x.usage), 1);

  const renderLeadingVisual = (name: string) => {
    if (kind === "pokemon") {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 shrink-0">
          <PokemonSprite name={name} sizeClass="w-6 h-6" />
        </span>
      );
    }
    if (kind === "item") {
      return <ItemSpriteIcon name={name} className="w-5 h-5 object-contain shrink-0" />;
    }
    return null;
  };

  return (
    <div className="space-y-2.5 border-t border-slate-800/70 pt-3.5 first:border-t-0 first:pt-0">
      <div className="text-center">
        <h3 className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/80 pb-1">
          {title}
        </h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((entry) => {
          const pctWidth = Math.min(100, Math.max(4, (entry.usage / maxUsage) * 100));
          const isClickableMon = kind === "pokemon" && typeof onSelectPokemon === "function";
          return (
            <li
              key={entry.name}
              onClick={isClickableMon ? () => onSelectPokemon(entry.name) : undefined}
              className={`flex items-center justify-center gap-3 sm:gap-4 text-xs rounded-md px-2 py-1 transition ${
                isClickableMon
                  ? "cursor-pointer hover:bg-slate-800/70"
                  : "hover:bg-slate-900/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 max-w-[180px] sm:max-w-[200px]">
                {renderLeadingVisual(entry.name)}
                <span className="text-slate-200 truncate">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden hidden sm:block">
                  <div
                    className="h-full rounded-full bg-orange-400/70"
                    style={{ width: `${pctWidth}%` }}
                  />
                </div>
                <span className="font-mono text-slate-300 w-12 text-right">
                  {entry.usage.toFixed(1)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
