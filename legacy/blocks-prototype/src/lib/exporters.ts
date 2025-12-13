import dayjs from "dayjs";
import * as THREE from "three";
import { GLTFExporter } from "three-stdlib";

import { FUNCTION_COLORS } from "@/constants/blocks";
import { downloadBlob } from "@/lib/download";
import { calculateMetrics, type MetricsSummary } from "@/lib/metrics";
import type { Units } from "@/lib/units";
import type { BlockModel, ExportPayload } from "@/types/blocks";

const buildScene = (blocks: BlockModel[]) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f8f8f8");

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(60, 120, 20);
  keyLight.castShadow = true;

  scene.add(ambient);
  scene.add(keyLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: "#f0f0f0", side: THREE.DoubleSide }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  blocks.forEach((block) => {
    const group = new THREE.Group();
    group.position.set(block.posX, block.posZ, block.posY);

    for (let i = 0; i < block.levels; i += 1) {
      const geometry = new THREE.BoxGeometry(block.xSize, block.levelHeight * 0.95, block.ySize);
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(FUNCTION_COLORS[block.defaultFunction]), roughness: 0.45, metalness: 0.05 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = block.levelHeight * i + block.levelHeight / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    scene.add(group);
  });

  return scene;
};

export const exportBlocksToGLB = async (blocks: BlockModel[]) => {
  const scene = buildScene(blocks);
  const exporter = new GLTFExporter();

  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          const blob = new Blob([JSON.stringify(result)], { type: "application/json" });
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as ArrayBuffer);
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        }
      },
      reject,
      { binary: true },
    );
  });

  const filename = `${dayjs().format("YYYYMMDD")}_TalvexBlock.glb`;
  const blob = new Blob([arrayBuffer], { type: "model/gltf-binary" });
  downloadBlob(blob, filename);
};

export const exportBlocksToJSON = async (
  blocks: BlockModel[],
  units: Units,
  metrics?: MetricsSummary,
) => {
  const snapshotMetrics = metrics ?? calculateMetrics(blocks);
  const payload: ExportPayload = {
    units,
    generatedAt: new Date().toISOString(),
    blocks,
    metrics: snapshotMetrics,
  };

  const filename = `${dayjs().format("YYYYMMDD")}_TalvexBlock.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
};
