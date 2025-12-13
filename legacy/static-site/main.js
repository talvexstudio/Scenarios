
const PROGRAM_DETAILS = {
  retail: { label: "Retail", hex: 0xd05b5b, css: "#d05b5b" },
  office: { label: "Office", hex: 0x4a83d4, css: "#4a83d4" },
  residential: { label: "Residential", hex: 0xf1d45c, css: "#f1d45c" },
  mixed: { label: "Mixed-Use", hex: 0x6dbd91, css: "#6dbd91" }
};

const OPTIONS = [
  {
    id: "A",
    name: "Option A – Courtyard",
    metrics: {
      gfa: "12,000 m²",
      efficiency: "78%",
      units: "120",
      height: "18 floors"
    },
    pros: [
      "Better daylight to central courtyard",
      "Clear separation between public and private zones"
    ],
    cons: [
      "Higher façade area",
      "Slightly more complex structure"
    ]
  },
  {
    id: "B",
    name: "Option B – Tower",
    metrics: {
      gfa: "13,500 m²",
      efficiency: "82%",
      units: "140",
      height: "22 floors"
    },
    pros: [
      "Higher efficiency and unit count",
      "Compact footprint"
    ],
    cons: [
      "Less articulated outdoor space",
      "More wind exposure at podium level"
    ]
  },
  {
    id: "C",
    name: "Option C – Perimeter Block",
    metrics: {
      gfa: "11,500 m²",
      efficiency: "75%",
      units: "110",
      height: "10 floors"
    },
    pros: [
      "Strong street edge and courtyard",
      "Good acoustic separation to interior"
    ],
    cons: [
      "Lower efficiency",
      "Less iconic skyline presence"
    ]
  }
];

let canvasContainer;
let scene;
let camera;
let renderer;
let controls;
let optionGroups = {};
let ui = {};
let spinToggleButton;
let autoSpinEnabled = false;
let gridHelper;
let cityContext;
let spinGroup;
let optionProgramStats = {};

window.addEventListener("DOMContentLoaded", () => {
  canvasContainer = document.getElementById("canvas-container");
  const sceneBundle = initScene(canvasContainer);
  scene = sceneBundle.scene;
  camera = sceneBundle.camera;
  renderer = sceneBundle.renderer;
  controls = sceneBundle.controls;
  optionGroups = sceneBundle.optionGroups;

  ui = initUI();
  spinToggleButton = document.getElementById("spinToggle");
  if (spinToggleButton) {
    spinToggleButton.addEventListener("click", () => {
      autoSpinEnabled = !autoSpinEnabled;
      updateSpinToggle();
    });
    updateSpinToggle();
  }
  setActiveOption(OPTIONS[0].id);

  window.addEventListener("resize", handleResize);
  setupImageGenerationUI();
  animate();
});

function initUI() {
  const select = document.getElementById("optionSelect");
  const metricEls = {
    gfa: document.getElementById("metricGfa"),
    efficiency: document.getElementById("metricEfficiency"),
    height: document.getElementById("metricHeight")
  };
  const prosList = document.getElementById("prosList");
  const consList = document.getElementById("consList");
  const programRows = document.getElementById("programRows");

  OPTIONS.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", (event) => {
    setActiveOption(event.target.value);
  });

  return { select, metricEls, prosList, consList, programRows };
}

function initScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x65788b);
  spinGroup = new THREE.Group();
  scene.add(spinGroup);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(90, 80, 90);
  camera.far = 2000;
  camera.updateProjectionMatrix();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.target.set(0, 4, 0);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xf7f3e9, 0.95);
  directionalLight.position.set(60, 120, 30);
  directionalLight.target.position.set(0, 0, 0);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.set(4096, 4096);
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 400;
  const shadowCam = directionalLight.shadow.camera;
  const shadowSize = 200;
  shadowCam.left = -shadowSize;
  shadowCam.right = shadowSize;
  shadowCam.top = shadowSize;
  shadowCam.bottom = -shadowSize;
  scene.add(directionalLight);
  scene.add(directionalLight.target);
  scene.userData.sunLight = directionalLight;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x3b3b3b, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  spinGroup.add(ground);

  gridHelper = new THREE.GridHelper(1000, 100, 0xffffff, 0xffffff);
  gridHelper.material.opacity = 0.35;
  gridHelper.material.transparent = true;
  gridHelper.position.y = 0.05;
  spinGroup.add(gridHelper);

  loadCityContext(scene);

  const optionGroups = createOptionGroups();
  Object.values(optionGroups).forEach((group) => {
    group.visible = false;
    spinGroup.add(group);
  });

  return { scene, camera, renderer, controls, optionGroups };
}

function loadCityContext(scene) {
  const loader = new THREE.OBJLoader();
  loader.load(
    "city.obj",
    (object) => {
      const replacements = [];
      object.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x8a8f9a,
            roughness: 0.8,
            metalness: 0.05,
            flatShading: true
          });
          child.castShadow = true;
          child.receiveShadow = true;
        } else if (child.isPoints) {
          const mesh = new THREE.Mesh(
            child.geometry.clone(),
            new THREE.MeshStandardMaterial({
              color: 0x8a8f9a,
              roughness: 0.8,
              metalness: 0.05,
              flatShading: true
            })
          );
          mesh.position.copy(child.position);
          mesh.rotation.copy(child.rotation);
          mesh.scale.copy(child.scale);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          replacements.push({ parent: child.parent, child, mesh });
        }
      });
      replacements.forEach(({ parent, child, mesh }) => {
        if (parent) {
          parent.add(mesh);
          parent.remove(child);
        }
      });

      const scale = 1;
      object.scale.setScalar(scale);

      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      object.position.set(-center.x, -box.min.y, -center.z);
      object.position.z += 15.3;
      object.position.x += 1;

      // Give the context some breathing room relative to the origin
      object.position.y += 0;
      object.position.x += 11;
      object.position.z += 20;

      cityContext = object;
      spinGroup.add(object);
    },
    undefined,
    (error) => {
      console.error("Failed to load city context", error);
    }
  );
}


function createOptionGroups() {
  const PLAN_SCALE = 1;
  const HEIGHT_SCALE = 1;
  const PODIUM_LEVELS = 4;
  const PODIUM_HEIGHT = 4;
  const UPPER_HEIGHT = 3;
  const MAX_FOOTPRINT = { width: 70, depth: 50 };

  const separatorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2128,
    roughness: 0.4,
    metalness: 0.02
  });

  const initStats = () => ({
    programs: { retail: 0, office: 0, residential: 0, mixed: 0 },
    totalGFA: 0,
    maxLevels: 0
  });

  const optionStats = { A: initStats(), B: initStats(), C: initStats() };

  const createSlice = (width, height, depth, color) => {
    return new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.05
      })
    );
  };

  const makeStack = ({
    width,
    depth,
    levels,
    levelHeight = UPPER_HEIGHT,
    program,
    x = 0,
    z = 0,
    yStart = 0,
    baseLevels = 0
  }) => {
    const detail = PROGRAM_DETAILS[program] || PROGRAM_DETAILS.mixed;
    const scaledWidth = width * PLAN_SCALE;
    const scaledDepth = depth * PLAN_SCALE;
    const scaledLevelHeight = levelHeight * HEIGHT_SCALE;
    const scaledX = x * PLAN_SCALE;
    const scaledZ = z * PLAN_SCALE;
    const scaledYStart = yStart * HEIGHT_SCALE;
    const gap = Math.min(0.025 * HEIGHT_SCALE, scaledLevelHeight * 0.08);
    const sliceHeight = Math.max(scaledLevelHeight - gap, scaledLevelHeight * 0.75);
    const stack = new THREE.Group();
    for (let i = 0; i < levels; i += 1) {
      const levelBase = scaledYStart + i * scaledLevelHeight;
      const slice = createSlice(scaledWidth, sliceHeight, scaledDepth, detail.hex);
      slice.position.set(0, levelBase + sliceHeight / 2, 0);
      slice.castShadow = true;
      slice.receiveShadow = true;
      stack.add(slice);
      if (i < levels - 1 && gap > 0) {
        const separator = new THREE.Mesh(
          new THREE.BoxGeometry(scaledWidth * 1.001, gap, scaledDepth * 1.001),
          separatorMaterial.clone()
        );
        separator.position.set(0, levelBase + sliceHeight + gap / 2, 0);
        separator.castShadow = true;
        separator.receiveShadow = true;
        stack.add(separator);
      }
    }
    stack.position.set(scaledX, 0, scaledZ);
    const areaPerLevel = scaledWidth * scaledDepth;
    return {
      mesh: stack,
      meta: {
        program,
        area: areaPerLevel * levels,
        totalLevels: baseLevels + levels
      }
    };
  };

  const registerStack = (key, meta) => {
    const entry = optionStats[key];
    if (!entry) return;
    entry.programs[meta.program] += meta.area;
    entry.totalGFA += meta.area;
    entry.maxLevels = Math.max(entry.maxLevels, meta.totalLevels);
  };

  const addStack = (key, group, params) => {
    const { mesh, meta } = makeStack(params);
    registerStack(key, meta);
    group.add(mesh);
  };

  const fitFootprint = (group) => {
    const box = new THREE.Box3().setFromObject(group);
    const width = box.max.x - box.min.x || 1;
    const depth = box.max.z - box.min.z || 1;
    const scaleFactor = Math.min(1, Math.min(MAX_FOOTPRINT.width / width, MAX_FOOTPRINT.depth / depth));
    group.scale.set(group.scale.x * scaleFactor, group.scale.y, group.scale.z * scaleFactor);
    const centeredBox = new THREE.Box3().setFromObject(group);
    const center = centeredBox.getCenter(new THREE.Vector3());
    group.position.x -= center.x;
    group.position.z -= center.z;
  };

  const optionA = new THREE.Group();
  const optionAPodiumTop = PODIUM_HEIGHT * PODIUM_LEVELS;
  addStack("A", optionA, { width: 68, depth: 10, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: -18, baseLevels: 0 });
  addStack("A", optionA, { width: 68, depth: 10, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: 18, baseLevels: 0 });
  addStack("A", optionA, { width: 10, depth: 36, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: -30, z: 0, baseLevels: 0 });
  addStack("A", optionA, { width: 10, depth: 36, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 30, z: 0, baseLevels: 0 });
  addStack("A", optionA, { width: 16, depth: 16, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: 0, baseLevels: 0 });
  addStack("A", optionA, { width: 30, depth: 18, levels: 8, levelHeight: UPPER_HEIGHT, program: "office", x: -15, z: -2, yStart: optionAPodiumTop, baseLevels: PODIUM_LEVELS });
  addStack("A", optionA, { width: 22, depth: 28, levels: 10, levelHeight: UPPER_HEIGHT, program: "residential", x: 18, z: 6, yStart: optionAPodiumTop, baseLevels: PODIUM_LEVELS });
  addStack("A", optionA, { width: 18, depth: 22, levels: 9, levelHeight: UPPER_HEIGHT, program: "residential", x: -20, z: -14, yStart: optionAPodiumTop, baseLevels: PODIUM_LEVELS });
  addStack("A", optionA, { width: 12, depth: 14, levels: 4, levelHeight: UPPER_HEIGHT, program: "mixed", x: 10, z: -12, yStart: optionAPodiumTop, baseLevels: PODIUM_LEVELS });

  const optionB = new THREE.Group();
  const podiumLevels = PODIUM_LEVELS;
  const podiumTop = PODIUM_HEIGHT * podiumLevels;
  const referenceBlock = new THREE.Mesh(
    new THREE.BoxGeometry(MAX_FOOTPRINT.width, 0.2, MAX_FOOTPRINT.depth),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2
    })
  );
  referenceBlock.position.y = 0.1;
  referenceBlock.receiveShadow = true;
  optionB.add(referenceBlock);
  addStack("B", optionB, { width: MAX_FOOTPRINT.width, depth: MAX_FOOTPRINT.depth, levels: podiumLevels, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: 0, baseLevels: 0 });
  addStack("B", optionB, { width: 60, depth: 40, levels: 8, levelHeight: UPPER_HEIGHT, program: "office", x: 0, z: 0, yStart: podiumTop, baseLevels: PODIUM_LEVELS });
  addStack("B", optionB, { width: 50, depth: 30, levels: 15, levelHeight: UPPER_HEIGHT, program: "residential", x: 0, z: 0, yStart: podiumTop + 8 * UPPER_HEIGHT, baseLevels: PODIUM_LEVELS + 8 });
  addStack("B", optionB, { width: 45, depth: 25, levels: 1, levelHeight: UPPER_HEIGHT, program: "mixed", x: 0, z: 0, yStart: podiumTop + 8 * UPPER_HEIGHT + 15 * UPPER_HEIGHT, baseLevels: PODIUM_LEVELS + 8 + 15 });

  const optionC = new THREE.Group();
  const perimeterTop = PODIUM_HEIGHT * PODIUM_LEVELS;
  addStack("C", optionC, { width: MAX_FOOTPRINT.width, depth: 9, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: -20, baseLevels: 0 });
  addStack("C", optionC, { width: MAX_FOOTPRINT.width, depth: 9, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 0, z: 20, baseLevels: 0 });
  addStack("C", optionC, { width: 10, depth: 46, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: -30, z: 0, baseLevels: 0 });
  addStack("C", optionC, { width: 10, depth: 46, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "retail", x: 30, z: 0, baseLevels: 0 });
  addStack("C", optionC, { width: 12, depth: 12, levels: PODIUM_LEVELS, levelHeight: PODIUM_HEIGHT, program: "mixed", x: 0, z: 0, baseLevels: 0 });
  addStack("C", optionC, { width: 58, depth: 12, levels: 6, levelHeight: UPPER_HEIGHT, program: "residential", x: 0, z: -19, yStart: perimeterTop, baseLevels: PODIUM_LEVELS });
  addStack("C", optionC, { width: 58, depth: 12, levels: 6, levelHeight: UPPER_HEIGHT, program: "residential", x: 0, z: 19, yStart: perimeterTop, baseLevels: PODIUM_LEVELS });
  addStack("C", optionC, { width: 16, depth: 30, levels: 8, levelHeight: UPPER_HEIGHT, program: "office", x: 24, z: 0, yStart: perimeterTop, baseLevels: PODIUM_LEVELS });
  addStack("C", optionC, { width: 20, depth: 26, levels: 7, levelHeight: UPPER_HEIGHT, program: "mixed", x: -22, z: 0, yStart: perimeterTop, baseLevels: PODIUM_LEVELS });
  addStack("C", optionC, { width: 18, depth: 18, levels: 3, levelHeight: UPPER_HEIGHT, program: "mixed", x: 0, z: 0, yStart: PODIUM_HEIGHT, baseLevels: 1 });

  fitFootprint(optionA);
  fitFootprint(optionC);

  optionProgramStats = optionStats;

  return { A: optionA, B: optionB, C: optionC };
}

function setActiveOption(optionId) {
  const nextOption = OPTIONS.find((opt) => opt.id === optionId) || OPTIONS[0];
  ui.select.value = nextOption.id;

  Object.entries(optionGroups).forEach(([id, group]) => {
    group.visible = id === nextOption.id;
  });

  updatePanel(nextOption);
}

function updatePanel(option) {
  const stats = optionProgramStats[option.id];
  if (stats) {
    ui.metricEls.gfa.textContent = formatArea(stats.totalGFA);
    ui.metricEls.height.textContent = `${stats.maxLevels} levels`;
    renderProgramRows(stats.programs);
  } else {
    ui.metricEls.gfa.textContent = option.metrics.gfa;
    ui.metricEls.height.textContent = option.metrics.height;
    renderProgramRows();
  }
  ui.metricEls.efficiency.textContent = option.metrics.efficiency;

  renderList(ui.prosList, option.pros);
  renderList(ui.consList, option.cons);
}

function renderList(target, items) {
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function formatArea(value) {
  if (!value) return "0 m²";
  return `${Math.round(value).toLocaleString()} m²`;
}

function renderProgramRows(programs = {}) {
  if (!ui.programRows) return;
  ui.programRows.innerHTML = "";
  Object.keys(PROGRAM_DETAILS).forEach((key) => {
    const detail = PROGRAM_DETAILS[key];
    const row = document.createElement("div");
    row.className = "metric-row program-row";

    const dt = document.createElement("dt");
    const dot = document.createElement("span");
    dot.className = "color-dot";
    dot.style.background = detail.css;
    dt.appendChild(dot);
    dt.appendChild(document.createTextNode(detail.label));

    const dd = document.createElement("dd");
    dd.textContent = formatArea(programs[key] || 0);

    row.append(dt, dd);
    ui.programRows.appendChild(row);
  });
}

function updateSpinToggle() {
  if (!spinToggleButton) return;
  spinToggleButton.setAttribute("aria-pressed", autoSpinEnabled);
  spinToggleButton.textContent = autoSpinEnabled ? "Disable Spin" : "Enable Spin";
}

function handleResize() {
  if (!renderer || !camera || !canvasContainer) return;
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight || 400;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    if (spinGroup && autoSpinEnabled) {
      spinGroup.rotation.y += 0.002;
      if (scene.userData.sunLight) {
        const radius = 150;
        const angle = performance.now() * 0.0002;
        scene.userData.sunLight.position.set(
          Math.cos(angle) * radius,
          120,
          Math.sin(angle) * radius
        );
        scene.userData.sunLight.target.position.set(0, 0, 0);
        scene.userData.sunLight.target.updateMatrixWorld();
      }
    }
    renderer.render(scene, camera);
  }
}

function setupImageGenerationUI() {
  const openButton = document.getElementById("openImageGenButton");
  const overlay = document.getElementById("imageGenOverlay");
  const closeButton = document.getElementById("imageGenCloseButton");
  const cancelButton = document.getElementById("imageGenCancelButton");
  const generateButton = document.getElementById("imageGenGenerateButton");
  const promptInput = document.getElementById("imageGenPrompt");
  const statusIdle = document.getElementById("imageGenStatusIdle");
  const statusLoading = document.getElementById("imageGenStatusLoading");
  const statusDone = document.getElementById("imageGenStatusDone");
  const screenshotImg = document.getElementById("imageGenScreenshot");
  const resultImg = document.getElementById("imageGenResult");

  if (!openButton || !overlay) return;

  const setStatus = (mode) => {
    [statusIdle, statusLoading, statusDone].forEach((el) => {
      if (!el) return;
      el.classList.remove("imagegen-status--active");
    });
    if (mode === "idle" && statusIdle) statusIdle.classList.add("imagegen-status--active");
    if (mode === "loading" && statusLoading) statusLoading.classList.add("imagegen-status--active");
    if (mode === "done" && statusDone) statusDone.classList.add("imagegen-status--active");
  };

  const openModal = () => {
    if (promptInput) promptInput.value = "";
    if (resultImg) resultImg.removeAttribute("src");
    setStatus("idle");
    try {
      if (renderer && renderer.domElement && screenshotImg) {
        screenshotImg.src = renderer.domElement.toDataURL("image/png");
      }
    } catch (error) {
      console.warn("Unable to capture screenshot", error);
    }
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    setStatus("idle");
    if (generateButton) generateButton.disabled = false;
  };

  openButton.addEventListener("click", openModal);
  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }
  if (cancelButton) {
    cancelButton.addEventListener("click", closeModal);
  }
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  if (generateButton) {
    generateButton.addEventListener("click", () => {
      setStatus("loading");
      generateButton.disabled = true;
      setTimeout(() => {
        if (screenshotImg && resultImg) {
          resultImg.src = screenshotImg.src;
        }
        setStatus("done");
        generateButton.disabled = false;
      }, 2000);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
      closeModal();
    }
  });
}

// --- About modal wiring ----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const aboutButton = document.getElementById("aboutButton");
  const overlay = document.getElementById("aboutOverlay");
  const closeButton = document.getElementById("aboutCloseButton");

  if (!aboutButton || !overlay || !closeButton) return;

  function openAbout() {
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeAbout() {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
  }

  aboutButton.addEventListener("click", openAbout);
  closeButton.addEventListener("click", closeAbout);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeAbout();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAbout();
    }
  });
});
