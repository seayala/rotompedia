# RotomPedia

Analizador del meta de **Pokémon Champions (VGC)** enfocado a visualización de estadísticas de uso, equipos, ayuda al buildeo y recomendación de apertura (4 Pokémon + leads).

## Aviso legal
Proyecto personal de fans, sin ánimo de lucro y con fines de portfolio y uso propio. No tiene afiliación oficial, patrocinio ni respaldo de Nintendo, Game Freak, The Pokémon Company ni ninguna de las fuentes de datos consultadas. Los sprites y datos de juego pertenecen a sus respectivos propietarios.

## Estructura del monorepo
- `apps/web`: aplicación web estática (Vite + React + TypeScript).
- `packages/core`: tipos compartidos, normalización de datos y parser de pokepaste.
- `packages/ingest`: scripts de descarga, limpieza y generación de JSON por regulación.
- `packages/analysis`: cálculos deterministas (velocidades, tipos/daño, arquetipos, matchups y apertura).
- `data/`: datos estáticos por regulación en JSON.
- `docs/`: documentación del proyecto y decisiones técnicas.

## Licencia
- **Código fuente (`apps/`, `packages/`):** bajo licencia [MIT](./LICENSE).
- **Documentación y datos procesados propios (`docs/`, `data/`):** bajo licencia [Creative Commons CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
- **Recursos de terceros:** los sprites, nombres y datos originales de torneos pertenecen a sus respectivos propietarios.
