export default function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <span className="mb-3 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-300">
        En construcción · v0.1
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
        RotomPedia
      </h1>
      <p className="mt-4 max-w-xl text-slate-400">
        Analizador del meta de <strong className="text-slate-200">Pokémon Champions (VGC)</strong>:
        estadísticas de uso, equipos de torneo, análisis de debilidades y recomendación de apertura.
      </p>
      <footer className="mt-12 text-xs text-slate-500">
        Proyecto personal de fans sin afiliación oficial con Nintendo, Game Freak ni The Pokémon Company.
      </footer>
    </main>
  );
}
