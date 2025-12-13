import { useMemo, useRef, useCallback } from "react";
import { DoubleSide, Group } from "three";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { FUNCTION_COLORS } from "@/constants/blocks";
import { useBlockStore } from "@/store/blocks";

export const BlocksTower = () => {
  const blocks = useBlockStore((state) => state.blocks);
  const selectedBlockId = useBlockStore((state) => state.selectedBlockId);
  const transformMode = useBlockStore((state) => state.transformMode);
  const selectBlock = useBlockStore((state) => state.selectBlock);
  const updateBlockLive = useBlockStore((state) => state.updateBlockLive);
  const startSnapshot = useBlockStore((state) => state.startSnapshot);
  const commitSnapshot = useBlockStore((state) => state.commitSnapshot);

  const orbit = useThree((state) => state.controls) as OrbitControlsImpl | null;
  const blockRefs = useRef<Record<string, Group | null>>({});

  const blockMeshes = useMemo(
    () =>
      blocks.map((block) => ({
        ...block,
        floors: Array.from({ length: block.levels }),
      })),
    [blocks],
  );

  const registerBlock = useCallback((id: string) => {
    return (node: Group | null) => {
      blockRefs.current[id] = node;
    };
  }, []);

  const selectedObject = selectedBlockId ? blockRefs.current[selectedBlockId] ?? null : null;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerDown={(event) => {
          event.stopPropagation();
          selectBlock(null);
        }}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshStandardMaterial color="#474747" side={DoubleSide} />
      </mesh>
      {blockMeshes.map((block) => (
        <group
          key={block.id}
          ref={registerBlock(block.id)}
          position={[block.posX, block.posZ, block.posY]}
          rotation={[block.rotationX ?? 0, block.rotationY ?? 0, block.rotationZ ?? 0]}
          onPointerDown={(event) => {
            event.stopPropagation();
            selectBlock(block.id);
          }}
        >
          {block.floors.map((_, levelIndex) => (
            <mesh
              key={`${block.id}-level-${levelIndex}`}
              position={[0, block.levelHeight * levelIndex + block.levelHeight / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[block.xSize, block.levelHeight * 0.95, block.ySize]} />
              <meshStandardMaterial
                color={FUNCTION_COLORS[block.defaultFunction]}
                roughness={0.45}
                metalness={0.05}
                transparent
                opacity={0.7}
              />
            </mesh>
          ))}
        </group>
      ))}

      {selectedObject && selectedBlockId ? (
        <TransformControls
          object={selectedObject}
          mode={transformMode}
          showX
          showY
          showZ
          size={0.85}
          onMouseDown={() => {
            orbit && (orbit.enabled = false);
            startSnapshot();
          }}
          onMouseUp={() => {
            orbit && (orbit.enabled = true);
            commitSnapshot();
          }}
          onChange={() => {
            const target = blockRefs.current[selectedBlockId];
            if (!target) return;
            updateBlockLive(selectedBlockId, {
              posX: target.position.x,
              posY: target.position.z,
              posZ: target.position.y,
              rotationX: target.rotation.x,
              rotationY: target.rotation.y,
              rotationZ: target.rotation.z,
            });
          }}
        />
      ) : null}
    </group>
  );
};
