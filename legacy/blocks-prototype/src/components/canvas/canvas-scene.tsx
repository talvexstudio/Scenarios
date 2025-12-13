import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, OrbitControls } from "@react-three/drei";

import { BlocksTower } from "@/components/canvas/blocks-tower";
import { useBlockStore } from "@/store/blocks";

export const CanvasScene = () => {
  const selectBlock = useBlockStore((state) => state.selectBlock);

  return (
    <div className="h-full w-full bg-[#65788b]">
      <Canvas shadows camera={{ position: [80, 60, 80], fov: 38 }} onPointerMissed={() => selectBlock(null)}>
        <color attach="background" args={["#65788b"]} />
        <ambientLight intensity={0.35} />
        <directionalLight
          position={[120, 180, 40]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-near={50}
          shadow-camera-far={400}
          shadow-camera-left={-180}
          shadow-camera-right={180}
          shadow-camera-top={180}
          shadow-camera-bottom={-180}
        />
        <Suspense fallback={null}>
          <BlocksTower />
          <Grid
            args={[200, 200]}
            cellSize={5}
            cellThickness={0.6}
            cellColor="#d1d5db"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#f8fafc"
            position={[0, 0.05, 0]}
            infiniteGrid
          />
          <Environment preset="sunset" />
        </Suspense>
        <OrbitControls
          enablePan
          enableDamping
          dampingFactor={0.15}
          minDistance={20}
          maxDistance={300}
          target={[0, 0, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
};
