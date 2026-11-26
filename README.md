# RotomPedia (v1.1.0 — In Progress)

Static VGC meta and tournament team analyzer for **Pokémon Champions**, built with Vite, React, TypeScript, and Tailwind CSS, and deployed on GitHub Pages. Currently in active development toward v2 features.

## Overview

RotomPedia (`v1.1.0`) helps competitive VGC players explore regulation snapshots without a backend database:

- **Usage & Stats:** Pokémon usage rankings, static sprites with fallback resolution, and detailed side panels (`DetailList` with BST, defensive matchups, common items with local `ItemSpriteIcon` sprites, moves, abilities, natures, and teammates).
- **Team Cores & Tournament Teams:** Highlighted cores and tournament rosters with tournament category filters and copyable PokéPaste support.
- **Regulation & Language Controls:** Switch between regulations (`M-C`, `M-A`, `M-B`, with `M-D` structure ready) and toggle UI language (`EN` default / `ES`).

## Architecture & Data

- **Static Client App:** Runs in the browser against pre-generated JSON snapshots under `apps/web/public/data/regulations/` and local item sprites under `apps/web/public/items/` (152 item icons resolved relative to `import.meta.env.BASE_URL`, e.g. `/rotompedia/items/`).
- **Automated Sync:** Scheduled weekly GitHub Actions workflow (`.github/workflows/weekly-update.yml` -> `packages/ingest/src/weekly-update.ts`, every Monday at `09:00 UTC` plus manual `workflow_dispatch`) updates active regulation snapshots and deploys via `.github/workflows/deploy-pages.yml`.
- **Data Sources:** Tournament and meta data sourced from Limitless and Pikalytics, item icons served locally from `apps/web/public/items/`, and Pokémon sprites loaded from external sprite sources.

## Disclaimer

RotomPedia is an unofficial fan-made project created for educational and portfolio purposes. It is not affiliated with, endorsed, sponsored, or approved by Nintendo, Game Freak, or The Pokémon Company. All Pokémon names, sprites, and related trademarks belong to their respective owners.
