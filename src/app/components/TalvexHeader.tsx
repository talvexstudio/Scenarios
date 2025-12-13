import { NavLink } from 'react-router-dom';

type NavLinkArgs = { isActive: boolean };
const navLinkClass = ({ isActive }: NavLinkArgs) =>
  `text-sm font-medium tracking-wide transition-colors ${
    isActive ? "text-white" : "text-white/70 hover:text-white"
  }`;

export function TalvexHeader() {
  return (
    <header className="w-full bg-black text-white flex items-center justify-between px-8 py-3 shadow">
      <div className="flex items-center gap-3">
        <img
          src="/assets/branding/talvex-logo-dark.png"
          alt="Talvex Studio logo"
          className="h-10 w-auto"
        />
        <span className="text-xl font-semibold tracking-[0.2em] uppercase">Talvex</span>
      </div>
      <nav className="flex items-center gap-6">
        <NavLink to="/scenarios" className={navLinkClass}>
          Scenarios
        </NavLink>
        <NavLink to="/blocks" className={navLinkClass}>
          Blocks
        </NavLink>
      </nav>
    </header>
  );
}
