# RotomPedia

Static VGC meta and tournament team analyzer for **Pokémon Champions**, built with Vite, React, TypeScript, and Tailwind CSS, and deployed on GitHub Pages.

## Overview

RotomPedia helps competitive VGC players explore regulation snapshots without a backend database:

- **Usage & Stats:** Pokémon usage rankings, static sprites with fallback resolution, and detailed side panels (BST, defensive matchups, common items, moves, abilities, natures, and teammates).
- **Team Cores & Tournament Teams:** Highlighted cores and tournament rosters with copyable PokéPaste support.
- **Regulation & Language Controls:** Switch between regulations (`M-C`, `M-A`, `M-B`, with `M-D` structure ready) and toggle UI language (`EN` default / `ES`).

## Architecture & Data

- **Static Client App:** Runs in the browser against pre-generated JSON snapshots under `data/` / `public/data/`.
- **Automated Sync:** Scheduled GitHub Actions workflows keep active regulation data up to date and surface the latest update timestamp in the UI.
- **Data Sources:** Tournament and meta data sourced from community/public endpoints (such as Limitless and Pikalytics), with sprites loaded from external sprite sources.

## Disclaimer

RotomPedia is an unofficial fan-made project created for educational and portfolio purposes. It is not affiliated with, endorsed, sponsored, or approved by Nintendo, Game Freak, or The Pokémon Company. All Pokémon names, sprites, and related trademarks belong to their respective owners.
