import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FUNCTION_COLORS, PROGRAM_OPTIONS } from "@/constants/blocks";
import { cn, formatNumber } from "@/lib/utils";
import { AREA_LABEL, fromDisplayUnits, LENGTH_LABEL, toDisplayArea, toDisplayUnits, type Units } from "@/lib/units";
import type { BlockFunction, BlockModel } from "@/types/blocks";

type LengthField = "xSize" | "ySize" | "levelHeight" | "posX" | "posY" | "posZ";
type CountField = "levels";

interface FieldConfig {
  key: LengthField;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

const SIZE_FIELDS: FieldConfig[] = [
  { key: "xSize", label: "Width", min: 1, step: 0.5 },
  { key: "ySize", label: "Depth", min: 1, step: 0.5 },
  { key: "levelHeight", label: "Level Height", min: 2.5, step: 0.1 },
];

interface BlockCardProps {
  block: BlockModel;
  units: Units;
  isFirst: boolean;
  canRemove: boolean;
  isSelected: boolean;
  onUpdate: (id: string, payload: Partial<BlockModel>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSelect: (id: string) => void;
  onUnitsChange: (unit: Units) => void;
}

export const BlockCard = ({
  block,
  units,
  isFirst,
  canRemove,
  isSelected,
  onUpdate,
  onRemove,
  onDuplicate,
  onSelect,
  onUnitsChange,
}: BlockCardProps) => {
  const unitLabel = LENGTH_LABEL[units];
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = React.useState(false);
  const areaLabel = AREA_LABEL[units];
  const blockArea = block.xSize * block.ySize * block.levels;
  const areaDisplay = `${formatNumber(toDisplayArea(blockArea, units))} ${areaLabel}`;

  React.useEffect(() => {
    setDrafts({});
  }, [block.id, units]);

  // keep drafts in sync when block or units change

  const updateDraft = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const clearDraft = (key: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const commitLength = (key: LengthField, draftKey: string, value: string) => {
    if (value === "" || value === "-") {
      clearDraft(draftKey);
      return;
    }
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return;
    onUpdate(block.id, { [key]: fromDisplayUnits(numeric, units) } as Partial<BlockModel>);
    clearDraft(draftKey);
  };

  const commitCount = (key: CountField, draftKey: string, value: string) => {
    if (value === "" || value === "-") {
      clearDraft(draftKey);
      return;
    }
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return;
    onUpdate(block.id, { [key]: Math.max(1, Math.round(numeric)) } as Partial<BlockModel>);
    clearDraft(draftKey);
  };

  const handleSelect = () => onSelect(block.id);

  const renderActionButtons = () => (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-4 text-xs font-semibold tracking-wide"
        onClick={(event) => {
          event.stopPropagation();
          onDuplicate(block.id);
        }}
      >
        Duplicate
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-4 text-xs font-semibold tracking-wide"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(block.id);
        }}
        disabled={!canRemove}
      >
        Remove
      </Button>
    </div>
  );

  const renderSizeField = (field: FieldConfig) => {
    const draftKey = `${block.id}-${field.key}`;
    const inputValue = drafts[draftKey] ?? toDisplayUnits(block[field.key], units).toFixed(2);

    return (
      <div key={draftKey} className="flex items-center justify-between gap-4">
        <Label htmlFor={draftKey} className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          {field.label}
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id={draftKey}
            type="number"
            step={field.step ?? 0.1}
            min={field.min}
            max={field.max}
            value={inputValue}
            className="h-8 w-28 text-right"
            onChange={(event) => updateDraft(draftKey, event.target.value)}
            onBlur={(event) => commitLength(field.key, draftKey, event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && commitLength(field.key, draftKey, (event.target as HTMLInputElement).value)
            }
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{unitLabel}</span>
        </div>
      </div>
    );
  };

  const renderLevelsField = () => {
    const draftKey = `${block.id}-levels`;
    const inputValue = drafts[draftKey] ?? String(block.levels);

    return (
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={draftKey} className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Levels
        </Label>
        <Input
          id={draftKey}
          type="number"
          min={1}
          step={1}
          value={inputValue}
          className="h-8 w-24 text-right"
          onChange={(event) => updateDraft(draftKey, event.target.value)}
          onBlur={(event) => commitCount("levels", draftKey, event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && commitCount("levels", draftKey, (event.target as HTMLInputElement).value)}
        />
      </div>
    );
  };

  const renderHeader = (expanded: boolean) => (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex items-baseline gap-2 text-left"
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
        >
          <span className="text-base font-semibold text-foreground">{block.name}</span>
          <span className="text-[11px] font-medium text-muted-foreground">{areaDisplay}</span>
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setCollapsed(expanded ? true : false);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse block" : "Expand block"}
        >
          {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="mb-3 flex justify-start pl-1">{renderActionButtons()}</div>
    </>
  );

  if (collapsed) {
    return (
      <div
        className={cn(
          "rounded-2xl border bg-card/80 p-4 shadow-sm transition-colors",
          isSelected ? "border-primary ring-1 ring-primary/40" : "border-border/60",
        )}
      >
        {renderHeader(false)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/80 p-4 shadow-sm transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/40" : "border-border/60",
      )}
      onClick={handleSelect}
    >
      {renderHeader(true)}

      <div className="space-y-3">
        {isFirst && (
          <div className="flex items-center justify-between gap-4">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Units</Label>
            <Select value={units} onValueChange={(val) => onUnitsChange(val as Units)}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue placeholder="Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric (m)</SelectItem>
                <SelectItem value="imperial">Imperial (ft)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">{SIZE_FIELDS.map(renderSizeField)}</div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Position</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["posX", "posY", "posZ"] as Array<"posX" | "posY" | "posZ">).map((key) => {
              const draftKey = `${block.id}-${key}`;
              const inputValue = drafts[draftKey] ?? toDisplayUnits(block[key], units).toFixed(2);
              const axisLabel = key === "posX" ? "X" : key === "posY" ? "Y" : "Z";
              return (
                <div key={draftKey} className="flex flex-col gap-1">
                  <Label htmlFor={draftKey} className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                    {axisLabel}
                  </Label>
                  <Input
                    id={draftKey}
                    type="number"
                    step={0.5}
                    value={inputValue}
                    className="h-8 text-right"
                    onChange={(event) => updateDraft(draftKey, event.target.value)}
                    onBlur={(event) => commitLength(key, draftKey, event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && commitLength(key, draftKey, (event.target as HTMLInputElement).value)}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-end text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">{unitLabel}</div>
        </div>
        {renderLevelsField()}

        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Program</Label>
          <Select value={block.defaultFunction} onValueChange={(val) => onUpdate(block.id, { defaultFunction: val as BlockFunction })}>
            <SelectTrigger>
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              {PROGRAM_OPTIONS.map((program) => (
                <SelectItem key={program} value={program}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FUNCTION_COLORS[program] }} />
                    {program}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>
    </div>
  );
};
