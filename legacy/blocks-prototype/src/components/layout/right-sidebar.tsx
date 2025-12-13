import { BlockCard } from "@/components/blocks/block-card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Units } from "@/lib/units";
import { useBlockStore } from "@/store/blocks";

export const RightSidebar = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const units = useBlockStore((state) => state.units);
  const addBlock = useBlockStore((state) => state.addBlock);
  const duplicateBlock = useBlockStore((state) => state.duplicateBlock);
  const updateBlock = useBlockStore((state) => state.updateBlock);
  const removeBlock = useBlockStore((state) => state.removeBlock);
  const setUnitsFromFirstBlock = useBlockStore((state) => state.setUnitsFromFirstBlock);
  const selectBlock = useBlockStore((state) => state.selectBlock);
  const selectedBlockId = useBlockStore((state) => state.selectedBlockId);

  const handleUnitsChange = (unit: Units) => setUnitsFromFirstBlock(unit);

  return (
    <aside className="flex w-full flex-col border-t border-border/60 bg-gradient-to-b from-background to-muted/40 lg:w-[320px] lg:border-l">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 p-4">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              units={units}
              isFirst={index === 0}
              canRemove={blocks.length > 1}
              isSelected={block.id === selectedBlockId}
              onUpdate={updateBlock}
              onRemove={removeBlock}
              onDuplicate={duplicateBlock}
              onSelect={(id) => selectBlock(id)}
              onUnitsChange={handleUnitsChange}
            />
          ))}

          <Button className="mt-2 w-full" onClick={addBlock}>
            New Block
          </Button>
        </div>
      </ScrollArea>
    </aside>
  );
};
