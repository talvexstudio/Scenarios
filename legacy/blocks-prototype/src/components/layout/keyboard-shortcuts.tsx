import { useEffect } from "react";

import { useBlockStore } from "@/store/blocks";

export const KeyboardShortcuts = () => {
  const undo = useBlockStore((state) => state.undo);
  const redo = useBlockStore((state) => state.redo);
  const commitSnapshot = useBlockStore((state) => state.commitSnapshot);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        commitSnapshot();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && key === "r") {
        event.preventDefault();
        commitSnapshot();
        redo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, commitSnapshot]);

  return null;
};
