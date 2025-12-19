import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Modal } from '../../shared/ui/Modal';

export function TalvexHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const isBlocks = location.pathname.startsWith('/blocks');
  const moduleLabel = isBlocks ? 'Blocks' : 'Scenarios';
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between bg-black px-8 py-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <img
            src="/assets/branding/talvex-logo-dark.png"
            alt="Talvex Studio logo"
            className="h-[60px] w-auto"
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-wide text-white text-center">
          Talvex <span className="text-[#4fa6ff]">{moduleLabel}</span>
        </h1>
        <nav className="flex items-center gap-6 text-sm font-medium tracking-wide">
          <button
            type="button"
            onClick={() => navigate('/scenarios')}
            className="text-white/80 transition hover:text-white"
          >
            Scenarios
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="text-white/80 transition hover:text-white"
          >
            Help
          </button>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="text-white/80 transition hover:text-white"
          >
            About
          </button>
        </nav>
      </header>
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Talvex Blocks · Help">
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            Select blocks with a single click. Use Ctrl (Cmd on Mac) + click to add or remove blocks from the
            selection. The first selected block becomes the reference.
          </p>
          <p>
            Enable the gumball to move or rotate the reference block. When multiple blocks are selected, the entire
            group follows while preserving their relative layout.
          </p>
          <p>
            Undo/redo shortcuts: Ctrl/Cmd + Z to undo, Ctrl/Cmd + Shift + Z (or Ctrl + Y) to redo. Use the Power Tools
            or the Send to Scenarios action when ready to evaluate options.
          </p>
        </div>
      </Modal>
      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Talvex Blocks">
        <div className="space-y-4 text-sm text-slate-700">
          <p>
            Talvex Blocks is a quick massing workshop for stacking programs, aligning footprints, and comparing options
            inside a contextual 3D scene.
          </p>
          <p>
            Use the power tools for precision moves, the gumball for intuitive group transforms, and the TBK workflow to
            save or reload scenarios. Send Blocks options directly to the Scenarios dashboard for review.
          </p>
        </div>
      </Modal>
    </>
  );
}
