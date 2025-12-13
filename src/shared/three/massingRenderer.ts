import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BlocksModel, BlockFunction } from '../types';
import { toMeters } from '../utils/units';

export type MassingRenderer = {
  setModel: (model?: BlocksModel) => void;
  setAutoSpin: (enabled: boolean) => void;
  dispose: () => void;
};

export function createMassingRenderer(container: HTMLElement): MassingRenderer {
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

  const grid = new THREE.GridHelper(1000, 100, 0xffffff, 0xffffff);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = 0.35;
  grid.position.y = 0.05;
  scene.add(grid);

  const massingGroup = new THREE.Group();
  scene.add(massingGroup);

  let autoSpin = false;
  let raf: number;

  const handleResize = () => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  window.addEventListener('resize', handleResize);

  const animate = () => {
    raf = requestAnimationFrame(animate);
    if (autoSpin) {
      massingGroup.rotation.y += 0.002;
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const setModel = (model?: BlocksModel) => {
    massingGroup.clear();
    if (!model) return;
    massingGroup.add(buildBlocksGroup(model));
  };

  const dispose = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', handleResize);
    controls.dispose();
    renderer.dispose();
    container.innerHTML = '';
  };

  return {
    setModel,
    setAutoSpin: (enabled: boolean) => {
      autoSpin = enabled;
    },
    dispose
  };
}

function buildBlocksGroup(model: BlocksModel) {
  const group = new THREE.Group();
  model.blocks.forEach((block) => {
    const width = toMeters(block.xSize, model.units);
    const depth = toMeters(block.ySize, model.units);
    const height = toMeters(block.levelHeight * block.levels, model.units);

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: getFunctionColor(block.defaultFunction),
      roughness: 0.45,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.position.set(
      toMeters(block.posX, model.units),
      height / 2 + toMeters(block.posY, model.units),
      toMeters(block.posZ, model.units)
    );
    group.add(mesh);
  });
  return group;
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
