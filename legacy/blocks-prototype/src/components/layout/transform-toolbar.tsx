import { cn } from "@/lib/utils";
import { useBlockStore } from "@/store/blocks";

type TransformMode = "translate" | "rotate";

const MODES: Array<{ label: string; mode: TransformMode }> = [
  { label: "Move", mode: "translate" },
  { label: "Rotate", mode: "rotate" },
];

export const TransformToolbar = () => {
  const mode = useBlockStore((state) => state.transformMode);
  const setMode = useBlockStore((state) => state.setTransformMode);
  const hasSelection = useBlockStore((state) => Boolean(state.selectedBlockId));

  if (!hasSelection) return null;

  return (
    <div className="pointer-events-none fixed bottom-8 left-6 z-30">
      <div className="pointer-events-auto flex gap-2 rounded-full bg-white/90 p-1 shadow-xl">
        {MODES.map((entry) => (
          <button
            key={entry.mode}
            type="button"
            onClick={() => setMode(entry.mode)}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] transition",
              mode === entry.mode
                ? "bg-slate-900 text-white shadow"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </div>
  );
};
