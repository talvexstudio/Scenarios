import { useLocation } from 'react-router-dom';

export function TalvexHeader() {
  const location = useLocation();
  const isBlocks = location.pathname.startsWith('/blocks');
  const moduleLabel = isBlocks ? 'Blocks' : 'Scenarios';

  return (
    <header className="flex items-center justify-between bg-black px-8 py-4 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <img
          src="/assets/branding/talvex-logo-dark.png"
          alt="Talvex Studio logo"
          className="h-[60px] w-auto"
        />
      </div>
      <h1 className="text-2xl font-semibold tracking-wide text-white">
        Talvex <span className="text-[#4fa6ff]">{moduleLabel}</span>
      </h1>
      <button
        id="aboutButton"
        type="button"
        className="text-sm font-medium tracking-wide text-white/80 transition hover:text-white"
      >
        About
      </button>
    </header>
  );
}
