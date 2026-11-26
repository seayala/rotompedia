# RotomPedia: contexto, estado actual y alcance del proyecto

Documento de contexto y seguimiento para continuar el desarrollo o mantener el registro en `docs/alcance.md`. Última actualización: 26 de noviembre de 2026 (`v1.1.0` — en construcción / *in progress*).

## 1. Qué es

**RotomPedia** es una web visual para analizar el meta de **Pokémon Champions (VGC)**: qué se usa, qué arquetipos ganan, cómo se componen los equipos competitivos y cómo le va tu equipo frente al meta. El proyecto sigue en construcción activa (*in progress*), con la base de `v1.1.0` operativa y próximas fases planificadas.

Idea diferenciadora: **"pega tu equipo, elige un rival del meta y te digo qué cuatro llevar y con qué dos abrir"**. Combina iconos locales de objetos, *sprites* estáticos con cadenas de *fallback*, interfaz con estética oscura VGC, logo de RotomDex y soporte bilingüe (`EN` por defecto y `ES`). Proyecto personal de fans, sin ánimo de lucro, pensado sobre todo como portfolio y uso propio.

**Aviso de terminología:** el juego es VGC, no TCG. Donde la documentación de Limitless habla de "decklists" y "mazos" (porque su API es compartida por varios juegos), aquí son **equipos / teamlists** de seis Pokémon, exportables como pokepaste.

## 2. Estado actual del proyecto (26 de noviembre de 2026 — v1.1.0 en construcción)

* **Monorepo y frontend (`apps/web`):** construido con **Vite + React + TypeScript + Tailwind**, configurado con `base: '/rotompedia/'` para **GitHub Pages** y validado con `pnpm --filter web exec tsc --noEmit`, `build` y vista previa (`pnpm run preview`).

* **Identidad visual, idioma y objetos (`v1.1.0`):** logo de **RotomDex** integrado en la cabecera, distintivo traducido (`v1.1 Meta Viewer · En construcción` en español / `v1.1 Meta Viewer · In progress` en inglés), estética oscura VGC, selector `ES` / `EN` con inglés por defecto, `DetailList` unificado para objetos y compañeros con barras de porcentaje e `ItemSpriteIcon` sirviendo **152 iconos de objetos en local** desde `apps/web/public/items/` resueltos con `import.meta.env.BASE_URL` y mapa de *aliases*.

* **Sprites de Pokémon:** `getPokemonSpriteCandidates` en `apps/web/src/App.tsx` resuelve formas regionales, Paradox, Ruinas, variantes de género/forma y caracteres especiales con *fallbacks* encadenados hacia *sprites* externos, manteniendo los *sprites* de Pokémon fuera del repositorio para no engordar Git ni el paquete estático.

* **Actualización automática y CI/CD:** ingesta semanal programada en `.github/workflows/weekly-update.yml` (`packages/ingest/src/weekly-update.ts`, cada lunes a las `09:00 UTC` + `workflow_dispatch`) sobre `apps/web/public/data/regulations` sin alterar `public/items/`, y despliegue estático en GitHub Pages vía `.github/workflows/deploy-pages.yml`.

## 3. Decisiones de arquitectura

| Pieza | Decisión |
| ----- | ----- |
| Tipo de web | **Estática**. Todo el análisis (pokepaste, debilidades, calculadora de daño, matriz de matchups) corre en el navegador |
| Datos | Scripts descargan, limpian y guardan **JSON en el repositorio** (`apps/web/public/data/regulations/<regulación>.json`). La web consume esos *snapshots* estáticos |
| Iconos de objetos | **Locales en el repo** (`apps/web/public/items/*.png`, 152 archivos) resueltos con `import.meta.env.BASE_URL` para evitar dependencias de red y acelerar la UI |
| Sprites de Pokémon | **Externos con fallback** en cliente para evitar inflar el repositorio y el *build* con todas las especies y formas |
| Base de datos | Ninguna. Solo se añadiría para cuentas de usuario, datos en tiempo real o consultas muy complejas |
| Framework | **Vite + React + TypeScript** + Tailwind + Recharts o ECharts |
| Repositorio | Monorepo con `pnpm`, **repositorio aparte** del portfolio: `apps/web`, `packages/core`, `packages/ingest`, `packages/analysis`, `data/`, `docs/` |
| Alojamiento | **GitHub Pages**, en subruta `/rotompedia/`, con acceso desde el portfolio |
| Entorno de desarrollo | WSL2 en Windows o Kubuntu 26.04 LTS, sincronizado por Git |

## 4. Actualización automática de datos

Se ejecuta mediante **GitHub Actions**, manteniendo la web como aplicación puramente estática.

* Workflow programado cada lunes a las `09:00 UTC` en `.github/workflows/weekly-update.yml` (`packages/ingest/src/weekly-update.ts`) más `workflow_dispatch` para ejecución manual.

* Actualiza la regulación activa (conservando *majors* sin duplicar `tournamentId`, tomando la última semana de torneos no-*major* y refrescando uso de Pikalytics), hace *commit* solo en `apps/web/public/data/regulations` si hay cambios y despliega en Pages.

* En repositorios públicos, GitHub puede desactivar los *workflows* programados tras unos 60 días sin inactividad; revisarlos en la pestaña *Actions* si ocurre.

* El script solo actualiza la regulación activa; las regulaciones cerradas se congelan.

* Si el proyecto se pausa o abandona, la web sigue funcionando con los últimos datos guardados.

## 5. Fuentes de datos

* **Pikalytics:** uso, builds y winrates por Pokémon y composición de equipo, incluyendo datos de torneos (Limitless y RK9) y endpoints de texto bajo `/ai/...`.

* **Limitless API** (`https://play.limitlesstcg.com/api`, `game=VGC`): endpoints `/tournaments`, `/tournaments/{id}/details`, `/tournaments/{id}/standings` y `/tournaments/{id}/pairings`. Acceso anónimo sin clave suficiente para *snapshots* incrementales, respetando límites de tasa, pausas y `User-Agent` identificable.

* **Iconos de objetos:** 152 PNG locales en `apps/web/public/items/` con normalización de *slugs* y *aliases* en `ItemSpriteIcon` / `getItemSpriteCandidates`.

* **Sprites de Pokémon:** cargados desde *sprites* externos con *fallbacks* en cliente. Uso de fans, sin ánimo de lucro.

* **Calculadora de daño:** `@smogon/calc` (evaluando soporte de modo Champions / "gen 0" con SPs y completando huecos de Champions mediante capa propia con tests).

* **MunchStats:** métricas de uso dentro del juego de Champions y torneos oficiales de RK9.

* **Logs de partidas:** replays de Showdown / datasets (pendiente verificar volumen real disponible para Champions).

* **Evitar:** scraping directo de RK9.

* **Plan B si Limitless no cubre algún detalle de Champions:** apoyarse en Pikalytics y simplificar o adaptar matrices de *matchups* en v2.

## 6. Regulaciones

| Reg. | Fechas | Notas |
| ----- | ----- | ----- |
| M-A | 8 abr a 17 jun 2026 | Primera regulación (histórico) |
| M-B | 17 jun a 2 sep 2026 | +22 Pokémon respecto a M-A (histórico) |
| **M-C** | 9 sep a **2 dic 2026** | Vigente. 32 Pokémon nuevos, 18 objetos, 15 movimientos y 15 habilidades nuevas |
| M-D | Sin confirmar | Estructura preparada; mostrar aviso de "datos insuficientes" cuando la muestra sea pequeña |

## 7. Alcance por versiones

**v1.1.0: Meta viewer (en construcción / *in progress*)**

* Ranking de Pokémon por uso con *sprites* estáticos y *fallbacks*

* Ficha lateral por Pokémon (`DetailList`): *BST*, *matchups* defensivos, movimientos, habilidad, objeto (con *ItemSpriteIcon* y 152 iconos locales en `apps/web/public/items/`), naturalezas y compañeros

* Cores de equipo y equipos de torneo, con filtros de categoría y **pokepaste copiable**

* Selector de regulación (`M-C`, `M-A`, `M-B`, estructura para `M-D`), selector de idioma (`EN` por defecto / `ES`), distintivo traducido (`v1.1 Meta Viewer · En construcción` / `v1.1 Meta Viewer · In progress`) y estética VGC con logo de RotomDex

* Actualización semanal automatizada vía GitHub Actions (`weekly-update.yml`), aviso legal de proyecto de fans en la web/`README.md` y despliegue público en GitHub Pages

**v2: Analiza tu equipo (sin IA)**

* Importar pokepaste y validarlo contra la lista legal de la regulación

* Informe de debilidades, resistencias y velocidades

* Calculadora de daño con sets del meta precargados y modo/correcciones de Champions

* Matriz de *matchups* entre arquetipos a partir de *pairings* de Limitless

**v3: Apertura recomendada**

* Matriz de 90 × 90 (15 formas de elegir 4 de 6 × 6 formas de elegir 2 leads)

* Resolución con maximin (y equilibrio de Nash opcional) para apertura robusta

* Recomendación de 4 elegidos, mejores parejas de leads, peor caso, amenazas del rival y nivel de confianza

**v4 y posteriores (aparcado)**

* Leads reales desde logs (si hay volumen suficiente de Champions), predicción ligera, explicaciones con LLM gratuito/local (Ollama / Hugging Face opcional), Bo3, tendencias semanales, equipos guardados en local o exportación/importación de archivos, y modo scouting.

**Fuera de alcance**
Aprendizaje por refuerzo o simulación masiva con bots, entrenar un LLM propio, app móvil nativa, cuentas de usuario con backend, monetización o publicidad, scraping de RK9, ni almacenar todos los *sprites* de Pokémon en el repositorio.

## 8. Próximos pasos tras v1.1.0

1. **Verificar la primera ejecución semanal del lunes:** comprobar que `weekly-update.yml` actualiza los *snapshots* de `M-C` sin incidencias y añadir *aliases* locales si aparecen objetos nuevos en los datos.

2. **Preparar el cierre de la regulación M-C (~2 de diciembre de 2026):** archivar el *snapshot* final de `M-C` y revisar la transición hacia la siguiente regulación activa.

3. **Arrancar v2 (analizador de equipo):** importar *pokepaste*, validar legalidad y mostrar debilidades, resistencias y velocidades.

## 9. Por qué sirve como portfolio

Cubre el ciclo completo (ingesta de datos, frontend estático, CI/CD, análisis competitivo y documentación técnica) con decisiones claras, coste cero de infraestructura y foco real en VGC.
