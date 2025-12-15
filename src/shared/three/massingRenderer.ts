import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BlocksModel, BlockFunction, Units } from '../types';
import { toMeters } from '../utils/units';

export const MAX_CONTEXT_BUILDINGS = 600;
const CONTEXT_BATCH_SIZE = 20;
const CONTEXT_COLOR = 0x48505f;
const DEBUG_CONTEXT = true;
let rendererInstanceCounter = 0;

export type ContextMeshPayload = {
  id: string;
  height: number;
  footprint: Array<[number, number]>;
};

export type MassingRenderer = {
  setModel: (model?: BlocksModel) => void;
  setAutoSpin: (enabled: boolean) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setPickHandler: (handler?: (blockId: string | null) => void) => void;
  setContext: (payload: ContextMeshPayload[] | null | undefined) => Promise<void>;
  frameContext: () => boolean;
  dispose: () => void;
  instanceId: number;
};

export function createMassingRenderer(container: HTMLElement): MassingRenderer {
  const instanceId = ++rendererInstanceCounter;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x65788b);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(90, 80, 90);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 4, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xf7f3e9, 0.95);
  directional.position.set(60, 120, 30);
  directional.castShadow = true;
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.camera.near = 1;
  directional.shadow.camera.far = 600;
  directional.shadow.camera.left = -200;
  directional.shadow.camera.right = 200;
  directional.shadow.camera.top = 200;
  directional.shadow.camera.bottom = -200;
  scene.add(directional);
  scene.add(directional.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const massingGroup = new THREE.Group();
  scene.add(massingGroup);
  const contextGroup = new THREE.Group();
  contextGroup.position.y = -0.05;
  scene.add(contextGroup);
  const contextBounds = new THREE.Box3();
  if (DEBUG_CONTEXT && import.meta.env.DEV) {
    console.log(`[Renderer ${instanceId}] created`, { contextGroupId: contextGroup.uuid });
  }
  let bboxHelper: THREE.Box3Helper | null = null;
  if (DEBUG_CONTEXT && import.meta.env.DEV) {
    scene.add(new THREE.AxesHelper(20));
    bboxHelper = new THREE.Box3Helper(new THREE.Box3(), 0xffff88);
    bboxHelper.visible = false;
    scene.add(bboxHelper);
  }

  const blockMeshes = new Map<string, THREE.Group>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const selectionHelper = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0xffffff);
  selectionHelper.visible = false;
  selectionHelper.material.depthTest = false;
  selectionHelper.material.transparent = true;
  selectionHelper.material.opacity = 0.9;
  scene.add(selectionHelper);

  let autoSpin = false;
  let raf: number;
  let resizeObserver: ResizeObserver | undefined;
  let highlightBlockId: string | null = null;
  let pickHandler: ((blockId: string | null) => void) | undefined;
  let contextBuildToken = 0;

  const handleResize = () => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  window.addEventListener('resize', handleResize);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
  }

  const animate = () => {
    raf = requestAnimationFrame(animate);
    if (autoSpin) {
      massingGroup.rotation.y += 0.002;
      contextGroup.rotation.y += 0.002;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const handlePointerDown = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes: THREE.Object3D[] = [];
    blockMeshes.forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child);
        }
      });
    });
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh & { userData: { blockId?: string } };
      if (mesh.userData.blockId) {
        pickHandler?.(mesh.userData.blockId);
        return;
      }
    }
    pickHandler?.(null);
  };

  renderer.domElement.addEventListener('pointerdown', handlePointerDown);

  const logContextChildren = (stage: string) => {
    if (!DEBUG_CONTEXT || !import.meta.env.DEV) return;
    console.log(`[Renderer ${instanceId}] ${stage}`, {
      contextChildren: contextGroup.children.length,
      contextGroupId: contextGroup.uuid
    });
  };

  const updateContextHelper = () => {
    if (!bboxHelper || !DEBUG_CONTEXT || !import.meta.env.DEV) return;
    bboxHelper.box.copy(contextBounds);
    bboxHelper.visible = !contextBounds.isEmpty();
  };

  const applySelectionHighlight = () => {
    if (!highlightBlockId) {
      selectionHelper.visible = false;
      return;
    }
    const mesh = blockMeshes.get(highlightBlockId);
    if (!mesh) {
      selectionHelper.visible = false;
      return;
    }
    selectionHelper.visible = true;
    selectionHelper.setFromObject(mesh);
  };

  const setModel = (model?: BlocksModel) => {
    logContextChildren('setModel/start');
    if (!model) {
      blockMeshes.forEach((group) => {
        massingGroup.remove(group);
        disposeObject(group);
      });
      blockMeshes.clear();
      highlightBlockId = null;
      selectionHelper.visible = false;
      return;
    }

    const leftover = new Set(blockMeshes.keys());

    model.blocks.forEach((block) => {
      leftover.delete(block.id);
      let container = blockMeshes.get(block.id);
      if (!container) {
        container = createBlockContainer(block.id);
        massingGroup.add(container);
        blockMeshes.set(block.id, container);
      }
      updateBlockContainer(container, block, model.units);
    });

    leftover.forEach((id) => {
      const container = blockMeshes.get(id);
      if (!container) return;
      massingGroup.remove(container);
      disposeObject(container);
      blockMeshes.delete(id);
    });

    applySelectionHighlight();
    logContextChildren('setModel/end');
  };

  return {
    setModel,
    setAutoSpin: (enabled: boolean) => {
      autoSpin = enabled;
    },
    setSelectedBlock: (blockId: string | null) => {
      highlightBlockId = blockId;
      applySelectionHighlight();
    },
    setPickHandler: (handler?: (blockId: string | null) => void) => {
      pickHandler = handler;
    },
    setContext: (payload: ContextMeshPayload[] | null | undefined) => {
      if (typeof payload === 'undefined') {
        if (import.meta.env?.DEV) {
          console.warn('[massingRenderer] setContext called with undefined payload.');
        }
        payload = null;
      }
      if (import.meta.env.DEV) {
        console.log(`[Renderer ${instanceId}] setContext called`, {
          isNull: !payload,
          receivedCount: payload?.length ?? 0
        });
      }
      contextBuildToken += 1;
      const token = contextBuildToken;
      return buildContextGeometry(payload, contextGroup, () => token === contextBuildToken, instanceId).then(
        (builtCount) => {
          contextBounds.makeEmpty();
          if (contextGroup.children.length > 0) {
            contextBounds.expandByObject(contextGroup);
          }
          if (import.meta.env.DEV) {
            const size = contextBounds.getSize(new THREE.Vector3());
            const center = contextBounds.getCenter(new THREE.Vector3());
            console.log('[Renderer] context bbox', {
              instanceId,
              contextChildren: contextGroup.children.length,
              contextGroupId: contextGroup.uuid,
              bboxMin: contextBounds.min.toArray(),
              bboxMax: contextBounds.max.toArray(),
              bboxSize: size.toArray(),
              bboxCenter: center.toArray()
            });
            console.log('[Renderer] context build summary', {
              instanceId,
              builtCount
            });
          }
          logContextChildren('setContext/after-build');
          updateContextHelper();
        }
      );
    },
    frameContext: () => {
      if (contextGroup.children.length === 0 || contextBounds.isEmpty()) return false;
      const center = contextBounds.getCenter(new THREE.Vector3());
      const size = contextBounds.getSize(new THREE.Vector3());
      const distance = Math.max(size.length(), 40);
      controls.target.copy(center);
      const offset = new THREE.Vector3(1, 0.6, 1).normalize().multiplyScalar(distance);
      camera.position.copy(center.clone().add(offset));
      camera.updateProjectionMatrix();
      controls.update();
      return true;
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      renderer.dispose();
      contextGroup.clear();
      container.innerHTML = '';
    },
    instanceId
  };
}

function getBlockDimensions(block: BlocksModel['blocks'][number], units: BlocksModel['units']) {
  const width = toMeters(block.xSize, units);
  const depth = toMeters(block.ySize, units);
  const height = toMeters(block.levelHeight * block.levels, units);
  return { width, depth, height };
}

function createBlockContainer(blockId: string) {
  const group = new THREE.Group();
  group.userData.blockId = blockId;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.01, depthWrite: false })
  );
  hull.name = 'block-hull';
  hull.userData.blockId = blockId;
  hull.castShadow = false;
  hull.receiveShadow = false;
  group.add(hull);
  const floors = new THREE.Group();
  floors.name = 'block-floors';
  group.add(floors);
  return group;
}

function updateBlockContainer(group: THREE.Group, block: BlocksModel['blocks'][number], units: Units) {
  const { width, depth, height } = getBlockDimensions(block, units);
  const hull = group.getObjectByName('block-hull') as THREE.Mesh;
  if (hull) {
    hull.geometry.dispose();
    hull.geometry = new THREE.BoxGeometry(width, height, depth);
  }

  group.position.set(
    toMeters(block.posX, units),
    height / 2 + toMeters(block.posY, units),
    toMeters(block.posZ, units)
  );
  group.rotation.y = THREE.MathUtils.degToRad(block.rotationZ ?? 0);
  group.userData.blockId = block.id;

  const floors = group.getObjectByName('block-floors') as THREE.Group;
  const targetCount = Math.max(1, block.levels);
  while (floors.children.length > targetCount) {
    const child = floors.children.pop();
    if (child) {
      floors.remove(child);
      disposeObject(child);
    }
  }
  const baseColor = new THREE.Color(getFunctionColor(block.defaultFunction));
  const floorColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.2);
  const levelHeight = toMeters(block.levelHeight, units);
  const floorThickness = levelHeight * 0.9;

  while (floors.children.length < targetCount) {
    const material = new THREE.MeshStandardMaterial({
      color: floorColor,
      transparent: true,
      opacity: 0.8,
      roughness: 0.35,
      metalness: 0.08,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, floorThickness, depth), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.blockId = block.id;
    floors.add(mesh);
  }

  floors.children.forEach((child, index) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(width, floorThickness, depth);
    const centerOffset = -height / 2 + levelHeight * index + levelHeight / 2;
    mesh.position.set(0, centerOffset, 0);
    mesh.userData.blockId = block.id;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(floorColor);
    mat.opacity = 0.8;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose?.());
      } else {
        material?.dispose?.();
      }
    }
  });
}

function getFunctionColor(fn: BlockFunction) {
  switch (fn) {
    case 'Retail':
      return 0xd05b5b;
    case 'Office':
      return 0x4a83d4;
    case 'Residential':
      return 0xf1d45c;
    case 'Mixed':
      return 0x6dbd91;
    default:
      return 0xb1b1b1;
  }
}

function buildContextGeometry(
  payload: ContextMeshPayload[] | null,
  targetGroup: THREE.Group,
  isCurrent: () => boolean,
  instanceId: number
): Promise<number> {
  clearGroup(targetGroup);
  if (!payload || payload.length === 0) {
    if (import.meta.env.DEV) {
      console.log(`[Renderer ${instanceId}] buildContext start`, { receivedCount: 0 });
    }
    return Promise.resolve(0);
  }

  const items = payload.slice(0, MAX_CONTEXT_BUILDINGS);
  if (import.meta.env.DEV) {
    console.log(`[Renderer ${instanceId}] buildContext start`, { receivedCount: items.length });
  }
  let index = 0;
  let built = 0;

  const schedule = (fn: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(fn);
    } else {
      setTimeout(fn, 16);
    }
  };

  return new Promise((resolve) => {
    const processChunk = () => {
      if (!isCurrent()) {
        clearGroup(targetGroup);
        resolve(0);
        return;
      }

      const limit = Math.min(index + CONTEXT_BATCH_SIZE, items.length);
      for (; index < limit; index++) {
        const mesh = createContextMesh(items[index]);
        if (mesh) {
          targetGroup.add(mesh);
          built += 1;
        }
      }

      if (index < items.length) {
        schedule(processChunk);
      } else {
        if (built === 0 && import.meta.env.DEV) {
          items.slice(0, 3).forEach((item, idx) => {
            console.log(`[Renderer ${instanceId}] context item sample ${idx}`, {
              id: item.id,
              points: item.footprint.slice(0, 3)
            });
          });
        }
        resolve(built);
      }
    };

    processChunk();
  });
}

function createContextMesh(payload: ContextMeshPayload) {
  if (!payload.footprint || payload.footprint.length < 3 || !Number.isFinite(payload.height) || payload.height <= 0) {
    return null;
  }

  const shape = new THREE.Shape();
  payload.footprint.forEach(([x, z], index) => {
    const yCoord = -z;
    if (index === 0) {
      shape.moveTo(x, yCoord);
    } else {
      shape.lineTo(x, yCoord);
    }
  });
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: payload.height, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: CONTEXT_COLOR,
      transparent: true,
      opacity: 0.55,
      roughness: 0.95,
      metalness: 0.05
    })
  );
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.userData.isContext = true;
  return mesh;
}

function clearGroup(group: THREE.Group) {
  [...group.children].forEach((child) => {
    group.remove(child);
    disposeObject(child);
  });
}
