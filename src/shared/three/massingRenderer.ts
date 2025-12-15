import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { BlocksModel, BlockFunction, Units } from '../types';
import { fromMeters, toMeters } from '../utils/units';

export const MAX_CONTEXT_BUILDINGS = 600;
const CONTEXT_BATCH_SIZE = 20;
const CONTEXT_COLOR = 0x48505f;
const DEBUG_CONTEXT = true;
let rendererInstanceCounter = 0;

type SelectionHandlers = {
  enabled: boolean;
  onSelect?: (blockId: string | null) => void;
  onTransform?: (payload: { id: string; position: THREE.Vector3; rotationY: number }) => void;
  onDeselect?: () => void;
  onTransformChange?: (payload: { id: string; position: THREE.Vector3; rotationY: number }) => void;
  undo?: () => void;
  redo?: () => void;
};

export type ContextMeshPayload = {
  id: string;
  height: number;
  footprint: Array<[number, number]>;
};

export type MassingRenderer = {
  setModel: (model?: BlocksModel) => void;
  setAutoSpin: (enabled: boolean) => void;
  setSelectionHandlers: (handlers?: SelectionHandlers) => void;
  setSelectedBlock: (blockId: string | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate') => void;
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

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode('translate');
  transformControls.enabled = false;
  scene.add(transformControls as unknown as THREE.Object3D);
  styleTransformGizmo(transformControls);

  transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value;
  });

  let autoSpin = false;
  let raf: number;
  let resizeObserver: ResizeObserver | undefined;
  let selectionHandlers: SelectionHandlers | undefined;
  let selectionEnabled = false;
  let selectedBlockId: string | null = null;
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

  const selectBlock = (blockId: string | null) => {
    if (selectedBlockId === blockId) return;
    selectedBlockId = blockId;
    if (!selectionEnabled) return;

    if (blockId && blockMeshes.has(blockId)) {
      const mesh = blockMeshes.get(blockId)!;
      transformControls.attach(mesh);
      transformControls.enabled = true;
    } else {
      transformControls.detach();
      transformControls.enabled = false;
    }
    selectionHandlers?.onSelect?.(blockId);
    if (!blockId) {
      selectionHandlers?.onDeselect?.();
    }
  };

  const emitTransform = () => {
    if (!selectionEnabled || !selectedBlockId) return;
    const mesh = blockMeshes.get(selectedBlockId);
    if (!mesh) return;
    const payload = {
      id: selectedBlockId,
      position: mesh.position.clone(),
      rotationY: mesh.rotation.y
    };
    selectionHandlers?.onTransformChange?.(payload);
  };

  transformControls.addEventListener('change', emitTransform);
  transformControls.addEventListener('mouseUp', () => {
    emitTransform();
    if (!selectionEnabled || !selectedBlockId) return;
    const mesh = blockMeshes.get(selectedBlockId);
    if (!mesh) return;
    selectionHandlers?.onTransform?.({
      id: selectedBlockId,
      position: mesh.position.clone(),
      rotationY: mesh.rotation.y
    });
  });

  const handlePointerDown = (event: PointerEvent) => {
    if (!selectionEnabled) return;
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
        selectBlock(mesh.userData.blockId);
      }
    } else {
      selectBlock(null);
    }
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

  const setModel = (model?: BlocksModel) => {
    logContextChildren('setModel/start');
    if (!model) {
      blockMeshes.forEach((group) => {
        massingGroup.remove(group);
        disposeObject(group);
      });
      blockMeshes.clear();
      selectBlock(null);
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

    if (selectedBlockId) {
      const target = blockMeshes.get(selectedBlockId);
      if (target) {
        transformControls.attach(target);
        transformControls.enabled = true;
      } else {
        selectBlock(null);
      }
    }
    logContextChildren('setModel/end');
  };

  return {
    setModel,
    setAutoSpin: (enabled: boolean) => {
      autoSpin = enabled;
    },
    setSelectionHandlers: (handlers?: SelectionHandlers) => {
      selectionHandlers = handlers;
      selectionEnabled = !!handlers?.enabled;
      if (!selectionEnabled) {
        selectBlock(null);
        transformControls.detach();
        transformControls.enabled = false;
      }
    },
    setSelectedBlock: (blockId: string | null) => {
      selectBlock(blockId);
    },
    setTransformMode: (mode: 'translate' | 'rotate') => {
      transformControls.setMode(mode);
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

function styleTransformGizmo(transformControls: TransformControls) {
  const gizmoContainer = (transformControls as unknown as { gizmo?: Record<string, THREE.Object3D> }).gizmo;
  if (!gizmoContainer?.rotate) return;

  const rotateGroup = gizmoContainer.rotate;
  const colorMap: Record<string, { color: number; opacity?: number }> = {
    X: { color: 0xff5757 },
    Y: { color: 0x4ad18b },
    Z: { color: 0x5a82ff },
    E: { color: 0xf4d256, opacity: 0.35 },
    XYZE: { color: 0xffffff, opacity: 0.3 }
  };

  const applyMaterialStyle = (object: any, style: { color: number; opacity?: number }) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material: THREE.Material) => {
      const mat = material as THREE.Material & { color?: THREE.Color };
      if (!mat || !mat.color) return;
      mat.color.setHex(style.color);
      if (style.opacity !== undefined) {
        mat.opacity = style.opacity;
        mat.transparent = true;
      }
    });
  };

  rotateGroup.children.forEach((child: any) => {
    const style = colorMap[child.name as keyof typeof colorMap];
    if (style) {
      applyMaterialStyle(child, style);
      if (child.name === 'X' || child.name === 'Y' || child.name === 'Z') {
        addRotationDiamondsToHandle(child, style.color);
      }
    }
  });

  transformControls.setSize(1.2);
}

function addRotationDiamondsToHandle(handle: THREE.Object3D, color: number) {
  const parent = handle.parent;
  if ((handle as any).userData?.hasDiamonds || !parent) return;

  const radius = 0.55;
  const baseGeometry = new THREE.PlaneGeometry(0.14, 0.14);
  baseGeometry.rotateZ(Math.PI / 4);

  const material = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide
  });

  const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  const getPosition = (axis: string, angle: number) => {
    switch (axis) {
      case 'X':
        return new THREE.Vector3(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      case 'Y':
        return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      case 'Z':
      default:
        return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    }
  };

  angles.forEach((angle) => {
    const diamond = new THREE.Mesh(baseGeometry.clone(), material.clone());
    diamond.name = handle.name;
    (diamond as any).tag = 'diamond';

    const pos = getPosition(handle.name, angle);
    const normal = pos.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    diamond.position.copy(pos);
    diamond.quaternion.copy(quaternion);
    diamond.renderOrder = 1000;

    diamond.updateMatrix();
    diamond.geometry.applyMatrix4(diamond.matrix);
    diamond.position.set(0, 0, 0);
    diamond.rotation.set(0, 0, 0);
    diamond.scale.set(1, 1, 1);
    diamond.matrix.identity();

    parent.add(diamond);
  });

  const userData = (handle as any).userData || {};
  userData.hasDiamonds = true;
  (handle as any).userData = userData;
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
