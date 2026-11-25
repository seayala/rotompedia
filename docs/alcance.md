# Champions Meta: contexto y alcance del proyecto

Documento de contexto para continuar el proyecto en otra conversación o guardarlo como `docs/alcance.md`. Última actualización: 23 de noviembre de 2026.

## 1. Qué es
Web visual para analizar el meta de **Pokémon Champions (VGC)**: qué se usa, qué arquetipos ganan y cómo le va tu equipo contra ellos.

Idea diferenciadora: **"pega tu equipo, elige un rival del meta y te digo qué cuatro llevar y con qué dos abrir"**. Sprites oficiales (PokeAPI/Showdown) y estética cuidada. Proyecto personal de fans, sin ánimo de lucro, pensado sobre todo como portfolio y uso propio (no se espera mucho tráfico).

**Aviso de terminología:** el juego es VGC, no TCG. Donde la documentación de Limitless habla de "decklists" y "mazos" (porque su API es compartida por varios juegos), aquí son **equipos / teamlists** de seis Pokémon, exportables como pokepaste.

## 2. Decisiones de arquitectura

| Pieza | Decisión |
|---|---|
| Tipo de web | **Estática**. Todo el análisis (pokepaste, debilidades, calculadora de daño, matriz de matchups) corre en el navegador |
| Datos | Un script descarga, limpia y guarda **JSON en el repositorio** (`data/<regulación>/`). La web solo lee esos archivos y nunca consulta fuentes externas |
| Base de datos | Ninguna. Solo se añadiría para cuentas de usuario, datos en tiempo real o consultas muy complejas |
| Framework | **Vite + React + TypeScript** (recomendado para una web estática y muy interactiva). Astro como alternativa si predomina el contenido. Next.js solo con `output: 'export'` y si ya se domina |
| Estilos y gráficos | Tailwind; Recharts o ECharts |
| Repositorio | Monorepo con pnpm, **repositorio aparte** del portfolio: `apps/web`, `packages/core` (tipos, normalización, parser de pokepaste), `packages/ingest`, `packages/analysis` (daño, velocidades, arquetipos, matchups), `data/`, `docs/` |
| Alojamiento | **GitHub Pages**, en una subruta del dominio `tu-usuario.github.io` (p. ej. `/champions-meta/`). El portfolio actual (`index.html`) se queda como está y solo añade un botón o tarjeta que enlaza al proyecto |
| Entorno de desarrollo | WSL2 en Windows, o Kubuntu 26.04 LTS en un segundo equipo (soporte hasta abril de 2029, sesión Wayland por defecto). El proyecto vive en Git, así que se puede cambiar de entorno |

**Reglas clave:**
- La regulación es un parámetro (carpeta + archivo de configuración con fechas, lista de Pokémon legales y fuentes). El código nunca contiene "M-C" escrito.
- Al servirse desde una subruta, configurar la ruta base (`base` en Vite o `basePath` en Next.js) y comprobar que imágenes y datos la respetan.
- Repositorio público (necesario para Pages en plan gratuito). Pages no permite uso comercial, coherente con el planteamiento.

## 3. Actualización automática de datos

Se hace con **GitHub Actions**, no con la web, así que ser estática no lo impide.

- Workflow programado con `cron` (una vez al día o cada 1-2 días) más `workflow_dispatch` (botón para lanzarlo a mano).
- Pasos: descargar datos de la regulación vigente, guardar JSON si hay cambios (commit), compilar y desplegar en Pages, todo en el mismo job (los commits de un workflow no disparan otros).
- **La hora es UTC.** Las 00:00 de España son las 23:00 UTC en invierno y las 22:00 UTC en verano. Evitar la hora en punto exacta (p. ej. minuto 17) porque los trabajos pueden retrasarse en horas de carga.
- En repositorios públicos, GitHub puede desactivar los workflows programados tras unos 60 días sin actividad; se reactivan en la pestaña Actions (comprobar la documentación vigente).
- Activar notificaciones de fallo de Actions y **mostrar siempre en la web la fecha de la última actualización**.
- El script solo actualiza la regulación activa (según las fechas de su configuración). Las cerradas no se tocan.
- Si el proyecto se abandona, la web no se rompe: se queda congelada con los últimos datos.

## 4. Fuentes de datos (comprobadas)

- **Pikalytics:** uso, builds y winrates por Pokémon y por composición de equipo, con datos por torneo (de Limitless y RK9). Ofrece páginas en texto para máquinas bajo `/ai/...`, p. ej. `pikalytics.com/ai/pokedex/<formato>/<Pokémon>` y `/ai/team-usage/<formato>`. Códigos de formato vistos: `gen9championsvgc2026regmc` (M-C), `...regmb`, `...regma`, además de variantes Bo3, de ladder y `championstournaments`. Hay que listarlos bien en la fase de ingesta. Tiene histórico de VGC anterior.
- **Limitless API** (`https://play.limitlesstcg.com/api`), con `game=VGC`: endpoints `/tournaments`, `/tournaments/{id}/details`, `/tournaments/{id}/standings` y `/tournaments/{id}/pairings` (partidas con su ganador).
  - **No requiere clave de API** para los datos de torneos, salvo el endpoint `/games/{id}/decks` (reglas de categorización de mazos de TCG), que no necesitamos: los arquetipos de VGC los definimos nosotros. Hay límites de uso que se consultan en las cabeceras de respuesta.
  - La clave solo se concede a proyectos públicos con un caso de uso legítimo, para un límite mayor. Si algún día se quiere: con la web ya desplegada, usar el formulario de `play.limitlesstcg.com/account/settings/api`, explicando que es un proyecto público de fans, sin ánimo de lucro, con descargas diarias en caché y atribución a Limitless. Si no la conceden, se sigue con acceso anónimo y descargas incrementales.
  - **Pendiente verificar con llamadas reales** que los torneos de VGC de Champions devuelven teamlists en `/standings` y ganadores en `/pairings`, ya que la documentación está orientada sobre todo a TCG.
  - Buenas prácticas: respetar los límites, descargar de forma incremental (guardar IDs ya descargados), pausar entre peticiones, `User-Agent` identificable. Dudas: Discord de Limitless.
- **Calculadora de daño:** `@smogon/calc`, con modo Champions ("gen 0", SPs con máximo 32 por stat y 66 en total). Puede no estar en la versión publicada en npm (0.10.0 al comprobarlo), así que hay que verificar la última versión o instalar desde `smogon/damage-calc` en GitHub. Hay huecos conocidos (Pokémon, habilidades y objetos de Champions que el motor no cubre), por lo que se necesita una capa propia de correcciones con tests.
- **MunchStats:** estadísticas de uso dentro del juego de Champions y datos de torneos oficiales de RK9.
- **Logs de partidas:** Showdown ofrece replays por API pública y existen datasets en Hugging Face (VGC-Bench), pero son de Scarlet/Violet. **Pendiente comprobar si hay replays de Champions y de qué volumen.**
- **Sprites:** PokeAPI o Showdown, cargados desde su origen (no subirlos al repo). Propiedad de Nintendo y Game Freak; solo uso de fans, sin monetizar.
- **Evitar:** scraping directo de RK9.
- **Plan B si Limitless no ofrece equipos o pairings de Champions por la API:** usar Pikalytics (equipos de torneo y winrate por composición). Se pierde la matriz real de matchups entre arquetipos, que necesita partidas con ganador; en ese caso la v2 se simplifica o se apoya en la heurística.
- Siempre: revisar los términos de uso de cada fuente.

## 5. Regulaciones

| Reg. | Fechas | Notas |
|---|---|---|
| M-A | 8 abr a 17 jun 2026 | Primera regulación |
| M-B | 17 jun a 2 sep 2026 | +22 Pokémon respecto a M-A |
| **M-C** | 9 sep a **2 dic 2026** | Vigente. 32 Pokémon nuevos, 18 objetos, 15 movimientos y 15 habilidades nuevas |
| M-D | Sin confirmar | No figuraba en el calendario oficial al comprobarlo |

Plan:
- **M-C** como base de desarrollo y validación. **Archivar sus datos finales cuando cierre (en torno al 2 de dic)**: es un conjunto cerrado y completo. Es lo único con fecha límite de todo el plan.
- **M-A y M-B** como histórico.
- **M-D**: estructura preparada desde el principio. Para cuando salga la v1 será previsiblemente la vigente, y sus primeros días tendrán pocos datos; la web debe indicarlo ("datos insuficientes") en lugar de mostrar porcentajes de muestras diminutas.
- El meta cambia mucho entre regulaciones (p. ej. Rillaboom y Salamence solo en M-C), así que cada regulación lleva su lista de legales y sus correcciones del motor de daño.

## 6. Alcance por versiones

Criterio para que algo entre en una versión: (1) los datos están disponibles y verificados, (2) es útil por sí solo, (3) se puede terminar y desplegar en pocas semanas.

**v1: Meta viewer (MVP)**
- Ranking de Pokémon por uso, con sprites
- Ficha por Pokémon: movimientos, habilidad, objeto y spreads más comunes
- Arquetipos con uso y winrate
- Equipos de torneo con pokepaste copiable
- Selector de regulación (M-C, M-A, M-B) y estructura lista para M-D
- Fecha de actualización visible, README con aviso legal y demo pública

**v2: Analiza tu equipo (sin IA)**
- Importar pokepaste y validarlo contra la lista de legales
- Informe de debilidades, resistencias y velocidades
- Calculadora de daño con los sets del meta precargados
- Matriz de matchups entre arquetipos a partir de los pairings de Limitless
- Condición previa: verificar el motor de daño de Champions contra casos reales

**v3: Apertura recomendada**
- Matriz de 90 × 90: cada lado tiene 15 formas de elegir 4 de 6 y 6 de elegir 2 leads
- Resolución con maximin (y opcionalmente equilibrio de Nash) para la mejor apertura "robusta"
- Resultado: los 4 recomendados, las mejores parejas de leads, el peor caso, qué leads del rival hacen más daño y nivel de confianza
- Probabilidad por celda con heurística determinista (daño, velocidad, cobertura, Fake Out, control de campo), calibrada con winrates reales de torneos
- Condición previa: que la heurística se valide con datos reales

**v4 y posteriores (aparcado)**
- Estadísticas de leads reales a partir de logs, si hay datos suficientes de Champions
- Modelo ligero entrenado por mí para predecir brings
- Explicación en lenguaje natural con un LLM gratuito o local
- Bo3 y ajustes entre partidas, tendencias semanales, más histórico, equipos guardados (almacenamiento local o exportar/importar archivos), modo scouting

**Fuera de alcance**
Aprendizaje por refuerzo o simulación masiva con bots, entrenar un LLM propio, app móvil nativa, cuentas de usuario con backend, monetización o publicidad, scraping de RK9.

## 7. Enfoque de IA

- **Primero estadística y cálculo determinista**, no un modelo: matriz de arquetipos con datos reales, heurística calibrada y resolución matemática. Todo corre en el navegador.
- Un LLM gratuito (local con Ollama o capa gratuita en la nube) solo **explica** los resultados; no decide nada estratégico. Cada cifra debe provenir de una herramienta o de los datos.
- **Hugging Face (opcional, no en las primeras versiones):** un Space gratuito puede alojar la capa de explicación, pero se duerme tras un tiempo sin uso, la CPU gratuita no da para modelos grandes y requiere CORS desde la web. Debe tratarse como un extra: si no responde, la web funciona igual. No poner claves en el código del navegador. También sirve para guardar datasets archivados grandes.
- Se muestran siempre tamaño de muestra e intervalos de confianza.
- "Frente a todas las leads del rival" casi nunca tiene una respuesta única: la web da una apertura robusta y un plan para los casos malos. No es una probabilidad real de ganar, sino una estimación estructural para comparar opciones.
- Validación: comparar la matriz del modelo con los winrates reales de arquetipos en los pairings de Limitless, y mantener un conjunto de 20-30 matchups conocidos como test de regresión.
- Si hay pocos logs de Champions, la parte de leads reales se deja como "datos insuficientes" hasta que se acumulen.

## 8. Cuándo habría que pasar a tener servidor
Solo si ocurre una de estas: cuentas de usuario o equipos compartidos entre dispositivos, uso de un modelo de pago con clave propia, cálculos de la v3 demasiado lentos en un móvil medio, o necesidad de datos en tiempo real. La migración sería sencilla porque `packages/analysis` es independiente de dónde se ejecute y los datos ya son JSON.

## 9. Riesgos y comprobaciones previas

| Duda | Si sale mal |
|---|---|
| ¿Limitless devuelve teamlists y pairings de torneos VGC de Champions? | Plan B con Pikalytics; simplificar la matriz de la v2 |
| ¿El motor de daño soporta bien M-C (habilidades, movimientos y objetos nuevos)? | Añadir correcciones propias y alargar la v2 |
| ¿Hay logs de partidas de Champions? | Dejar los leads reales para más adelante |

Otros riesgos: cambios de formato en las fuentes, términos de uso, mecánicas propias de Champions (puntos de stat en lugar de EVs, Megaevoluciones), la ruta base en Pages (fallo típico de la primera vez) y perder el ritmo en un proyecto personal.

## 10. Plazos orientativos (con IA, unas 8-10 h/semana)
- v1: 6-8 semanas
- v2: +4-6 semanas
- v3: +3-4 semanas
- Total hasta v3: unos 4-6 meses, añadiendo un 30-50 % de margen
- Lo que más tiempo suele llevar no es escribir código, sino entender y limpiar los datos y verificar los cálculos.

## 11. Primeros pasos
1. Crear el repositorio del proyecto (monorepo, CI, README con aviso legal de proyecto de fans sin afiliación con Nintendo ni Game Freak, licencia) y un "hola mundo" desplegado en Pages en la subruta, con un botón desde el portfolio.
2. Probar la API de Limitless **sin clave**: `GET /tournaments?game=VGC`, y los endpoints de detalles, standings y pairings de un torneo de Champions, para ver qué devuelven.
3. Escribir un script (`probe.ts`) que descargue datos de M-C desde Pikalytics y mirar qué devuelven de verdad antes de definir los tipos.
4. Comprobar la versión de `@smogon/calc` y su soporte de Champions.
5. Comprobar si hay replays públicos de Champions y de qué volumen.
6. Montar el workflow programado de actualización de datos.
7. **Archivar los datos finales de M-C** cuando termine la regulación.

## 12. Por qué sirve como portfolio
Cubre un ciclo completo (ingesta, frontend, CI/CD y despliegue automático, análisis), con decisiones defendibles (JSON frente a base de datos, determinista frente a IA, cálculo en cliente a coste cero) y un problema real. Para que luzca: terminar por fases, desplegar pronto, documentar las decisiones en `docs/`, tener tests y CI en verde, y un historial de commits e issues ordenado.

## 13. Notas
- Proyecto personal: no mezclar con herramientas, datos ni equipos de la empresa. Repositorio en cuenta personal de GitHub.
- Pendiente de decidir: idioma de la web (español, inglés o ambos; preparar la interfaz para varios idiomas cuesta poco), framework definitivo (Vite + React recomendado), proveedor del LLM de explicación y entorno de desarrollo (WSL2 o Kubuntu).
- Aún no hay código y no está decidido si se llevará a cabo; el documento sirve para retomarlo cuando se quiera.

## Cómo usar este documento
Pégalo al inicio de una conversación nueva con: "Este es el contexto de mi proyecto. Continúa desde el siguiente paso pendiente."
