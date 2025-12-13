import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PROGRAM_OPTIONS } from "@/constants/blocks";
import { exportBlocksToGLB, exportBlocksToJSON } from "@/lib/exporters";
import { calculateMetrics } from "@/lib/metrics";
import { formatNumber } from "@/lib/utils";
import { AREA_LABEL, toDisplayArea } from "@/lib/units";
import { useBlockStore } from "@/store/blocks";
import type { BlockFunction } from "@/types/blocks";

interface PanelProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Panel = ({ title, collapsed, onToggle, children }: PanelProps) => {
  return (
    <section className="pointer-events-auto rounded-2xl border border-white/30 bg-white/90 p-4 text-slate-900 shadow-xl backdrop-blur">
      <header className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.3em]">{title}</p>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:text-slate-900"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
        >
          {collapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </button>
      </header>
      {!collapsed && <div className="space-y-3 text-sm text-slate-700">{children}</div>}
    </section>
  );
};

const FUNCTION_ORDER: BlockFunction[] = PROGRAM_OPTIONS;

export const FloatingPanels = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const units = useBlockStore((state) => state.units);

  const metrics = useMemo(() => calculateMetrics(blocks), [blocks]);
  const [collapsedState, setCollapsedState] = useState({ metrics: false, export: false });
  const [exporting, setExporting] = useState({ glb: false, json: false });
  const areaLabel = AREA_LABEL[units];

  const togglePanel = (panel: "metrics" | "export") =>
    setCollapsedState((prev) => ({ ...prev, [panel]: !prev[panel] }));

  const triggerExport = async (type: "glb" | "json") => {
    setExporting((prev) => ({ ...prev, [type]: true }));
    try {
      if (type === "glb") {
        await exportBlocksToGLB(blocks);
      } else {
        await exportBlocksToJSON(blocks, units, metrics);
      }
    } finally {
      setExporting((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div className="pointer-events-none fixed left-6 top-28 z-30 flex w-72 flex-col gap-4">
      <Panel title="Metrics" collapsed={collapsedState.metrics} onToggle={() => togglePanel("metrics")}>
        <MetricRow label="Total GFA" value={`${formatNumber(toDisplayArea(metrics.totalGfa, units))} ${areaLabel}`} />
        <MetricRow label="Total Levels" value={formatNumber(metrics.totalLevels, { maximumFractionDigits: 0 })} />
        <div className="pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">By Function</p>
          <div className="mt-2 space-y-1.5">
            {FUNCTION_ORDER.map((fn) => (
              <MetricRow
                key={fn}
                label={fn}
                value={`${formatNumber(toDisplayArea(metrics.gfaByFunction[fn] ?? 0, units))} ${areaLabel}`}
              />
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Export" collapsed={collapsedState.export} onToggle={() => togglePanel("export")}>
        <p>Download ready-to-share assets for further design development.</p>
        <div className="grid gap-2">
          <Button onClick={() => triggerExport("glb")} disabled={exporting.glb}>
            {exporting.glb ? "Preparing GLB…" : "Export GLB"}
          </Button>
          <Button variant="outline" onClick={() => triggerExport("json")} disabled={exporting.json}>
            {exporting.json ? "Preparing JSON…" : "Export JSON"}
          </Button>
        </div>
      </Panel>
    </div>
  );
};

interface MetricRowProps {
  label: string;
  value: string;
}

const MetricRow = ({ label, value }: MetricRowProps) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900">{value}</span>
  </div>
);
