const TITLE_FONT = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' };

export const TalvexHeader = () => {
  return (
    <header className="relative flex items-center justify-between bg-black px-8 py-2 text-white shadow-md">
      <div className="flex items-center gap-4">
        <img src="/talvex-logo-dark.png" alt="Talvex Studio logo" className="h-[60px] w-auto" />
        <div className="text-xl font-medium tracking-[0.04em] sm:hidden" style={TITLE_FONT}>
          Talvex <span className="text-[#4aa3ff]">Blocks</span>
        </div>
      </div>

      <div
        className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[30px] font-medium tracking-[0.04em] sm:block"
        style={TITLE_FONT}
      >
        Talvex <span className="text-[#4aa3ff]">Blocks</span>
      </div>

      <nav className="ml-auto flex items-center gap-4 text-sm text-slate-200">
        <button
          type="button"
          className="text-sm font-medium text-slate-200 transition hover:text-white"
          aria-label="Learn more about Talvex Blocks"
        >
          About
        </button>
      </nav>
    </header>
  );
};
