# RotomPedia: contexto, estado actual y alcance del proyecto

Documento de contexto y seguimiento para continuar el desarrollo en otra conversación o mantenerlo en `docs/alcance.md`. Última actualización: 25 de noviembre de 2026.

## 1. Qué es

**RotomPedia** es una web visual para analizar el meta de **Pokémon Champions (VGC)**: qué se usa, qué arquetipos ganan, cómo se componen los equipos competitivos y cómo le va tu equipo frente al meta.

Idea diferenciadora: **"pega tu equipo, elige un rival del meta y te digo qué cuatro llevar y con qué dos abrir"**. Sprites estáticos de Showdown con cadenas de *fallback*, interfaz con estética oscura VGC, logo de RotomDex y soporte bilingüe (`EN` por defecto y `ES`). Proyecto personal de fans, sin ánimo de lucro, pensado sobre todo como portfolio y uso propio (no se espera mucho tráfico).

**Aviso de terminología:** el juego es VGC, no TCG. Donde la documentación de Limitless habla de "decklists" y "mazos" (porque su API es compartida por varios juegos), aquí son **equipos / teamlists** de seis Pokémon, exportables como pokepaste.

## 2. Estado actual del proyecto (25 de noviembre de 2026)

* **Monorepo y frontend (`apps/web`):** construido con **Vite + React + TypeScript + Tailwind**, configurado para subruta en **GitHub Pages** y validado en compilación local (`typecheck` + `build`) y vista previa (`pnpm run preview`).

* **Identidad visual e idioma:** logo de **RotomDex** integrado en la cabecera, estética oscura VGC con degradados sutiles y cuadrícula de baja opacidad, selector `ES` / `EN` con inglés como idioma predeterminado y nombres de objetos de equipos mostrados como texto limpio (sin iconos de objetos por ahora para mantener la lectura ágil).

* **Sprites y normalización de nombres:** `getPokemonSpriteCandidates` en `apps/web/src/App.tsx` resuelve formas regionales, Paradox, Ruinas, variantes de género/forma (*Indeedee*, *Basculegion*, *Meowstic*, *Ogerpon*, *Urshifu*, *Calyrex*, *Tatsugiri*, *Lycanroc*, etc.) y caracteres especiales con *fallbacks* encadenados hacia *sprites* de Showdown.

* **CI/CD:** flujo consolidado en `deploy-pages.yml` usando `pnpm` v12.23.0 vía `packageManager` y despliegues estáticos desde `main`.

## 3. Decisiones de arquitectura

| Pieza | Decisión | 
| ----- | ----- | 
| Tipo de web | **Estática**. Todo el análisis (pokepaste, debilidades, calculadora de daño, matriz de matchups) corre en el navegador | 
| Datos | Scripts descargan, limpian y guardan **JSON en el repositorio** (`apps/web/public/data/regulations/<regulación>.json` / `data/<regulación>/`). La web consume esos *snapshots* estáticos | 
| Base de datos | Ninguna. Solo se añadiría para cuentas de usuario, datos en tiempo real o consultas muy complejas | 
| Framework | **Vite + React + TypeScript** + Tailwind + Recharts o ECharts | 
| Repositorio | Monorepo con `pnpm`, **repositorio aparte** del portfolio: `apps/web`, `packages/core`, `packages/ingest`, `packages/analysis`, `data/`, `docs/` | 
| Alojamiento | **GitHub Pages**, en subruta del dominio `tu-usuario.github.io` (p. ej. `/rotompedia/`), con acceso desde el portfolio | 
| Entorno de desarrollo | WSL2 en Windows o Kubuntu 26.04 LTS (soporte hasta abril de 2029, sesión Wayland por defecto), sincronizado por Git | 

**Reglas clave:**

* La regulación es parametrizable por configuración y *snapshots* (fechas, Pokémon legales y fuentes).

* Respetar siempre la ruta base (`base` en Vite) para recursos estáticos, *sprites* y JSON.

* Repositorio público para GitHub Pages gratuito, sin monetización ni uso comercial.

## 4. Actualización automática de datos

Se ejecuta mediante **GitHub Actions**, manteniendo la web como aplicación puramente estática.

* Workflow programado con `cron` más `workflow_dispatch` para ejecución manual.

* Descarga datos de la regulación activa vigente, actualiza JSON si hay cambios y despliega en Pages.

* **La hora es UTC.** Evitar la hora en punto exacta (p. ej. minuto 17) y tener en cuenta el desfase horario con España (`UTC+1` en invierno / `UTC+2` en verano).

* En repositorios públicos, GitHub puede desactivar los *workflows* programados tras unos 60 días sin inactividad; revisarlos en la pestaña *Actions* si ocurre.

* El script solo actualiza la regulación activa; las regulaciones cerradas se congelan.

* Si el proyecto se pausa o abandona, la web sigue funcionando con los últimos datos guardados.

## 5. Fuentes de datos

* **Pikalytics:** uso, builds y winrates por Pokémon y composición de equipo, incluyendo datos de torneos (Limitless y RK9) y endpoints de texto bajo `/ai/...` (p. ej. `gen9championsvgc2026regmc`, `...regmb`, `...regma`, variantes Bo3, ladder y `championstournaments`).

* **Limitless API** (`https://play.limitlesstcg.com/api`, `game=VGC`): endpoints `/tournaments`, `/tournaments/{id}/details`, `/tournaments/{id}/standings` y `/tournaments/{id}/pairings`. Acceso anónimo sin clave suficiente para *snapshots* incrementales, respetando límites de tasa, pausas y `User-Agent` identificable.

* **Calculadora de daño:** `@smogon/calc` (evaluando soporte de modo Champions / "gen 0" con SPs y completando huecos de Champions mediante capa propia con tests).

* **MunchStats:** métricas de uso dentro del juego de Champions y torneos oficiales de RK9.

* **Logs de partidas:** replays de Showdown / datasets (pendiente verificar volumen real disponible para Champions).

* **Sprites:** cargados desde Showdown con *fallbacks* en cliente (`getPokemonSpriteCandidates`). Uso de fans, sin ánimo de lucro.

* **Evitar:** scraping directo de RK9.

* **Plan B si Limitless no cubre algún detalle de Champions:** apoyarse en Pikalytics y simplificar o adaptar matrices de *matchups* en v2.

## 6. Regulaciones

| Reg. | Fechas | Notas | 
| ----- | ----- | ----- | 
| M-A | 8 abr a 17 jun 2026 | Primera regulación (histórico) | 
| M-B | 17 jun a 2 sep 2026 | +22 Pokémon respecto a M-A (histórico) | 
| **M-C** | 9 sep a **2 dic 2026** | Vigente. 32 Pokémon nuevos, 18 objetos, 15 movimientos y 15 habilidades nuevas | 
| M-D | Sin confirmar | Estructura preparada; mostrar aviso de "datos insuficientes" cuando la muestra sea pequeña | 

Plan:

* **M-C** como base activa de desarrollo y validación; **archivar sus datos finales cuando cierre (\~2 de diciembre de 2026)**.

* **M-A y M-B** como histórico.

* **M-D** preparado con control de tamaño de muestra.

## 7. Alcance por versiones

**v1: Meta viewer (MVP — en cierre)**

* Ranking de Pokémon por uso con *sprites* estáticos y *fallbacks*

* Ficha lateral por Pokémon: *BST*, *matchups* defensivos, movimientos, habilidad, objeto, naturalezas y compañeros

* Cores de equipo y equipos de torneo, con **pokepaste copiable centrado en los Top 8 de torneos**

* Selector de regulación (`M-C`, `M-A`, `M-B`, estructura para `M-D`), selector de idioma (`EN` por defecto / `ES`) y estética VGC con logo de RotomDex

* **Fecha de última actualización visible** en la interfaz, aviso legal de proyecto de fans en la web/`README.md` y despliegue público en GitHub Pages

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
Aprendizaje por refuerzo o simulación masiva con bots, entrenar un LLM propio, app móvil nativa, cuentas de usuario con backend, monetización o publicidad, scraping de RK9.

## 8. Puntos abiertos prioritarios para mañana (26 de noviembre de 2026)

1. **Decidir y programar la tarea periódica de actualización de datos:** definir si la actualización automática de la regulación activa será **diaria o semanal**, configurar el `cron` en UTC (evitando la hora en punto, p. ej. minuto 17) y comprobar el flujo de actualización de JSON de Pokémon de la regulación actual.

2. **Mostrar la fecha de última actualización en la interfaz:** añadir y verificar en la UI la fecha de la última actualización del *snapshot* de datos.

3. **Pokepaste copiable en Top 8 de torneos:** verificar/consolidar la exportación de pokepaste en los **Top 8 de torneos** dentro de la vista de equipos.

4. **Subir el alcance actualizado a GitHub:** hacer *commit* y *push* de este documento (`docs/alcance.md`) junto con el cierre de los últimos ajustes de v1.

## 9. Por qué sirve como portfolio

Cubre el ciclo completo (ingesta de datos, frontend estático, CI/CD, análisis competitivo y documentación técnica) con decisiones claras, coste cero de infraestructura y foco real en VGC.