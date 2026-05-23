import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------- Constants ----------
const GRID = 10;                 // 10x10 battleship board
const CELL = 4;                  // world units per cell
const BOARD_GAP = 18;            // gap between the two boards
const WATER_LEVEL = 0;
const BOARD_Y = 0.05;

const SHIP_DEFS = {
  us: [
    { id: 'cvn',  name: 'CVN-77 G.H.W. BUSH',  len: 5, class: 'carrier'    },
    { id: 'cg',   name: 'CG-69 VICKSBURG',     len: 4, class: 'cruiser'    },
    { id: 'ddg',  name: 'DDG-87 MASON',        len: 3, class: 'destroyer'  },
    { id: 'ffg',  name: 'FFG-62 CONSTELLATION',len: 3, class: 'frigate'    },
    { id: 'ssn',  name: 'SSN-22 CONNECTICUT',  len: 2, class: 'submarine'  },
  ],
  ir: [
    { id: 'mowj', name: 'MOWJ-CLASS CORVETTE', len: 4, class: 'corvette'   },
    { id: 'kilo', name: 'KILO 901 (TAREQ)',    len: 3, class: 'submarine'  },
    { id: 'sina', name: 'SINA FAC',            len: 3, class: 'fac'        },
    { id: 'pey',  name: 'PEYKAAP IPS-16',      len: 2, class: 'swarm'      },
    { id: 'gh',   name: 'GHADIR MIDGET SUB',   len: 2, class: 'midget'     },
  ],
};

// ---------- Scene setup ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1118);
scene.fog = new THREE.Fog(0x14202c, 80, 280);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 70, 90);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 40;
controls.maxDistance = 180;
controls.maxPolarAngle = Math.PI * 0.48;

// ---------- Lighting (Persian Gulf dusk) ----------
const hemi = new THREE.HemisphereLight(0xffd9a3, 0x1a2a3a, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffc88a, 1.4);
sun.position.set(80, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 300;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x4a90e2, 0.35);
fill.position.set(-50, 40, -30);
scene.add(fill);

// ---------- Water ----------
const waterGeo = new THREE.PlaneGeometry(600, 600, 200, 200);
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x0d3a5c,
  roughness: 0.25,
  metalness: 0.35,
  emissive: 0x041826,
  emissiveIntensity: 0.4,
});
const water = new THREE.Mesh(waterGeo, waterMat);
water.rotation.x = -Math.PI/2;
water.receiveShadow = true;
scene.add(water);

// Animate water vertices
const waterPositions = waterGeo.attributes.position;
const waterBase = new Float32Array(waterPositions.array);
function updateWater(t) {
  for (let i = 0; i < waterPositions.count; i++) {
    const x = waterBase[i*3];
    const y = waterBase[i*3+1];
    waterPositions.array[i*3+2] = Math.sin(x*0.08 + t*0.7)*0.25 + Math.cos(y*0.09 + t*0.9)*0.22;
  }
  waterPositions.needsUpdate = true;
  waterGeo.computeVertexNormals();
}

// ---------- Strait of Hormuz coastlines ----------
function makeCoast(color, posZ, scale = 1) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true });
  // jagged peninsula composed of cones/boxes
  for (let i = -10; i <= 10; i++) {
    const w = 14 + Math.random()*10;
    const h = 4 + Math.random()*6;
    const g = new THREE.ConeGeometry(w*0.5*scale, h, 5 + Math.floor(Math.random()*3));
    const m = new THREE.Mesh(g, mat);
    m.position.set(i*16 + (Math.random()-0.5)*6, h/2 - 0.2, posZ + (Math.random()-0.5)*8);
    m.rotation.y = Math.random()*Math.PI;
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  // base plate
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(340, 1.5, 30*scale),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  base.position.set(0, 0.2, posZ);
  base.receiveShadow = true;
  group.add(base);
  return group;
}
// Iranian coast (north) — sandy red-brown
scene.add(makeCoast(0x8a6a3a, -85, 1));
// Omani / UAE coast (south) — lighter beige
scene.add(makeCoast(0xa89070, 85, 0.9));

// Iranian shore batteries (visual flavour, also act as enemy "advantage" lore)
function makeBattery(x, z) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.4, 1, 12),
    new THREE.MeshStandardMaterial({ color: 0x444036, roughness: 0.9 }));
  pad.position.y = 0.5; g.add(pad);
  const launcher = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x2a2a26 }));
  launcher.position.y = 1.4; g.add(launcher);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x666 }));
  tube.rotation.x = -Math.PI/2.3;
  tube.position.set(0, 1.7, 0.5);
  g.add(tube);
  g.position.set(x, 0, z);
  g.rotation.y = Math.PI;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
scene.add(makeBattery(-40, -70));
scene.add(makeBattery(10, -75));
scene.add(makeBattery(55, -68));

// ---------- Boards ----------
class Board {
  constructor(faction, originX, label) {
    this.faction = faction;             // 'us' or 'ir'
    this.originX = originX;
    this.size = GRID * CELL;
    this.group = new THREE.Group();
    this.group.position.set(originX, BOARD_Y, 0);
    scene.add(this.group);

    // base plate
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(this.size + 1, 0.3, this.size + 1),
      new THREE.MeshStandardMaterial({
        color: faction === 'us' ? 0x0e2a44 : 0x3a1212,
        roughness: 0.6, metalness: 0.4,
        transparent: true, opacity: 0.55,
      })
    );
    plate.position.y = 0;
    plate.receiveShadow = true;
    this.group.add(plate);

    // grid lines
    const gridColor = faction === 'us' ? 0x5cd0ff : 0xff7a7a;
    const grid = new THREE.GridHelper(this.size, GRID, gridColor, gridColor);
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    grid.position.y = 0.18;
    this.group.add(grid);

    // label
    const lbl = makeTextSprite(label, faction === 'us' ? '#5cd0ff' : '#ff7a7a');
    lbl.position.set(0, 1.5, -this.size/2 - 3);
    this.group.add(lbl);

    // cell state
    this.cells = Array.from({length: GRID}, () => Array(GRID).fill(null));
    this.shots = Array.from({length: GRID}, () => Array(GRID).fill(0)); // 0/1/2 = unfired/miss/hit
    this.ships = [];
    this.markers = new THREE.Group();
    this.group.add(this.markers);

    // hover cursor
    this.cursor = new THREE.Mesh(
      new THREE.BoxGeometry(CELL*0.92, 0.1, CELL*0.92),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
    );
    this.cursor.position.y = 0.25;
    this.cursor.visible = false;
    this.group.add(this.cursor);
  }

  cellToLocal(cx, cz) {
    return new THREE.Vector3(
      (cx - (GRID-1)/2) * CELL,
      0,
      (cz - (GRID-1)/2) * CELL,
    );
  }

  worldToCell(point) {
    const local = this.group.worldToLocal(point.clone());
    const cx = Math.round(local.x / CELL + (GRID-1)/2);
    const cz = Math.round(local.z / CELL + (GRID-1)/2);
    if (cx < 0 || cz < 0 || cx >= GRID || cz >= GRID) return null;
    return { cx, cz };
  }

  canPlace(cx, cz, len, horizontal) {
    for (let i = 0; i < len; i++) {
      const x = horizontal ? cx + i : cx;
      const z = horizontal ? cz : cz + i;
      if (x < 0 || z < 0 || x >= GRID || z >= GRID) return false;
      if (this.cells[x][z]) return false;
    }
    return true;
  }

  placeShip(ship, cx, cz, horizontal, visible = true) {
    ship.cells = [];
    for (let i = 0; i < ship.len; i++) {
      const x = horizontal ? cx + i : cx;
      const z = horizontal ? cz : cz + i;
      this.cells[x][z] = ship;
      ship.cells.push({ x, z });
    }
    ship.horizontal = horizontal;
    ship.hits = 0;
    ship.sunk = false;

    // 3D model
    const model = makeShipModel(ship.class, ship.len, this.faction);
    model.userData.shipId = ship.id;
    model.visible = visible;
    const center = this.cellToLocal(
      horizontal ? cx + (ship.len-1)/2 : cx,
      horizontal ? cz : cz + (ship.len-1)/2
    );
    model.position.set(center.x, 0.6, center.z);
    if (!horizontal) model.rotation.y = Math.PI/2;
    this.group.add(model);
    ship.model = model;
    this.ships.push(ship);
  }

  fireAt(cx, cz) {
    if (this.shots[cx][cz]) return { repeat: true };
    const target = this.cells[cx][cz];
    const local = this.cellToLocal(cx, cz);
    if (target) {
      this.shots[cx][cz] = 2;
      target.hits++;
      this._marker(local, 'hit');
      if (target.hits >= target.len) {
        target.sunk = true;
        target.model.visible = true;
        // burn effect
        addBurning(this.group, target.model.position.clone(), target.len);
      }
      return { hit: true, ship: target, sunk: target.sunk, pos: local };
    } else {
      this.shots[cx][cz] = 1;
      this._marker(local, 'miss');
      return { hit: false, pos: local };
    }
  }

  _marker(local, kind) {
    const isHit = kind === 'hit';
    const geo = new THREE.CylinderGeometry(CELL*0.32, CELL*0.32, 0.2, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: isHit ? 0xff4422 : 0x77c8ff,
      emissive: isHit ? 0xff2200 : 0x224488,
      emissiveIntensity: isHit ? 0.9 : 0.5,
    });
    const peg = new THREE.Mesh(geo, mat);
    peg.position.set(local.x, 0.35, local.z);
    this.markers.add(peg);
    if (isHit) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.4, 5, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0.7 })
      );
      pillar.position.set(local.x, 2.5, local.z);
      this.markers.add(pillar);
    }
  }

  revealShipOutline(ship) {
    const box = new THREE.BoxGeometry(
      ship.horizontal ? CELL*ship.len : CELL,
      0.6,
      ship.horizontal ? CELL : CELL*ship.len,
    );
    const wire = new THREE.Mesh(box,
      new THREE.MeshBasicMaterial({ color: 0xffe066, wireframe: true, transparent: true, opacity: 0.8 }));
    wire.position.copy(ship.model.position);
    wire.position.y = 0.7;
    this.group.add(wire);
    setTimeout(() => this.group.remove(wire), 4000);
  }

  allSunk() { return this.ships.every(s => s.sunk); }
}

// ---------- Text sprite ----------
function makeTextSprite(text, color = '#5cd0ff') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,20,30,0.65)';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, c.width-4, c.height-4);
  ctx.fillStyle = color;
  ctx.font = 'bold 56px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width/2, c.height/2);
  const tex = new THREE.CanvasTexture(c);
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(18, 3.4, 1);
  return spr;
}

// ---------- Ship model factory ----------
function makeShipModel(cls, len, faction) {
  const g = new THREE.Group();
  const hullColor = faction === 'us' ? 0x4a5a6a : 0x4a3a32;
  const deckColor = faction === 'us' ? 0x2a3845 : 0x3a2e26;
  const accent    = faction === 'us' ? 0x222a32 : 0x1a1612;

  const length = CELL * len * 0.92;
  const width = CELL * 0.7;

  // hull (tapered)
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-length/2, -width/2);
  hullShape.lineTo(length/2 - width*0.4, -width/2);
  hullShape.quadraticCurveTo(length/2, 0, length/2 - width*0.4, width/2);
  hullShape.lineTo(-length/2, width/2);
  hullShape.lineTo(-length/2, -width/2);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.0, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.1, bevelSegments: 2 });
  hullGeo.rotateX(-Math.PI/2);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.7, metalness: 0.3 }));
  hull.position.y = 0;
  hull.castShadow = true; hull.receiveShadow = true;
  g.add(hull);

  // deck
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(length*0.92, 0.15, width*0.86),
    new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.85 })
  );
  deck.position.y = 1.0;
  deck.castShadow = true;
  g.add(deck);

  // class-specific superstructure
  switch (cls) {
    case 'carrier': {
      // flat deck + island
      const flightDeck = new THREE.Mesh(
        new THREE.BoxGeometry(length*1.05, 0.18, width*1.15),
        new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.95 })
      );
      flightDeck.position.y = 1.15; g.add(flightDeck);
      const island = new THREE.Mesh(
        new THREE.BoxGeometry(length*0.18, 1.6, width*0.3),
        new THREE.MeshStandardMaterial({ color: deckColor })
      );
      island.position.set(length*0.18, 2.05, width*0.32); g.add(island);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 2.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x999 })
      );
      mast.position.set(length*0.18, 4, width*0.32); g.add(mast);
      // tiny aircraft silhouettes
      for (let i = 0; i < 3; i++) {
        const ac = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.1, 1.2),
          new THREE.MeshStandardMaterial({ color: 0xb0b8c0 })
        );
        ac.position.set(-length*0.25 + i*1.4, 1.3, -width*0.2);
        g.add(ac);
      }
      break;
    }
    case 'cruiser': case 'destroyer': case 'frigate': case 'corvette': {
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(length*0.18, 1.0, width*0.55),
        new THREE.MeshStandardMaterial({ color: deckColor })
      );
      bridge.position.set(-length*0.05, 1.6, 0); g.add(bridge);
      const stack = new THREE.Mesh(
        new THREE.BoxGeometry(length*0.08, 1.4, width*0.4),
        new THREE.MeshStandardMaterial({ color: accent })
      );
      stack.position.set(length*0.15, 1.8, 0); g.add(stack);
      const mast = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 2.6, 5),
        new THREE.MeshStandardMaterial({ color: 0x888 })
      );
      mast.position.set(-length*0.05, 3.2, 0); g.add(mast);
      // gun turret
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.55, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: accent })
      );
      turret.position.set(-length*0.32, 1.3, 0); g.add(turret);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x444 })
      );
      barrel.rotation.z = Math.PI/2;
      barrel.position.set(-length*0.32 - 0.6, 1.35, 0); g.add(barrel);
      break;
    }
    case 'submarine': case 'midget': {
      // mostly cylindrical, sail
      const sub = new THREE.Mesh(
        new THREE.CapsuleGeometry(width*0.4, length*0.55, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.6 })
      );
      sub.rotation.z = Math.PI/2;
      sub.position.y = 0.6;
      g.add(sub);
      const sail = new THREE.Mesh(
        new THREE.BoxGeometry(length*0.18, 0.7, width*0.25),
        new THREE.MeshStandardMaterial({ color: 0x12141a })
      );
      sail.position.y = 1.2; g.add(sail);
      break;
    }
    case 'fac': case 'swarm': {
      // fast attack craft / swarm boat — low profile, missile rails
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(length*0.25, 0.7, width*0.55),
        new THREE.MeshStandardMaterial({ color: deckColor })
      );
      cabin.position.set(-length*0.1, 1.45, 0); g.add(cabin);
      // two missile rails
      for (const off of [-0.35, 0.35]) {
        const tube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, length*0.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x555 })
        );
        tube.rotation.z = Math.PI/2;
        tube.position.set(length*0.15, 1.25, off);
        g.add(tube);
      }
      break;
    }
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------- Burning effect ----------
const fireGroups = [];
function addBurning(parent, pos, size) {
  const g = new THREE.Group();
  g.position.copy(pos);
  for (let i = 0; i < 6 + size*2; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.5 + Math.random()*0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.05 + Math.random()*0.04, 1, 0.55), transparent: true, opacity: 0.85 })
    );
    m.position.set((Math.random()-0.5)*size*2, 0.5 + Math.random()*2.5, (Math.random()-0.5)*size*1.5);
    m.userData = { vy: 0.02 + Math.random()*0.04, life: 1 };
    g.add(m);
  }
  parent.add(g);
  fireGroups.push(g);
}
function updateFires() {
  for (const g of fireGroups) {
    g.children.forEach(c => {
      c.position.y += c.userData.vy;
      c.material.opacity *= 0.992;
      c.scale.multiplyScalar(1.005);
    });
  }
}

// ---------- Build boards ----------
const usBoard = new Board('us', -BOARD_GAP/2 - GRID*CELL/2, 'USN — CTF 50');
const irBoard = new Board('ir', BOARD_GAP/2 + GRID*CELL/2, 'IRGCN — HORMUZ');

// ---------- Game state ----------
const state = {
  phase: 'deploy',           // deploy | playing | over
  toPlace: [...SHIP_DEFS.us],
  currentPlacement: null,    // ship currently being placed
  horizontal: true,
  turn: 'us',
  reconCharges: 0,
  reconCooldown: 0,
  enemyAdvantage: { extraShotsPerTurn: 1, mines: 3 },
  mines: [],                 // hidden mine cells (on USN board)
  log: [],
  ai: {
    targets: [],             // queued cells to follow up after a hit
    lastHits: [],
  },
};

// place enemy fleet randomly
function placeAIFleet() {
  for (const def of SHIP_DEFS.ir) {
    const ship = { ...def };
    let ok = false, tries = 0;
    while (!ok && tries < 300) {
      tries++;
      const horiz = Math.random() < 0.5;
      const cx = Math.floor(Math.random() * GRID);
      const cz = Math.floor(Math.random() * GRID);
      if (irBoard.canPlace(cx, cz, ship.len, horiz)) {
        irBoard.placeShip(ship, cx, cz, horiz, /*visible*/ false);
        ok = true;
      }
    }
  }
  refreshFleetUI();
}
placeAIFleet();

// place hidden mines on USN board (enemy advantage)
function placeMines() {
  state.mines = [];
  let placed = 0;
  while (placed < state.enemyAdvantage.mines) {
    const cx = Math.floor(Math.random() * GRID);
    const cz = Math.floor(Math.random() * GRID);
    if (!state.mines.some(m => m.cx === cx && m.cz === cz) && !usBoard.cells[cx][cz]) {
      state.mines.push({ cx, cz });
      placed++;
    }
  }
}

// ---------- Placement preview ----------
const previewMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.4 });
const previewBadMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4 });
let previewMesh = null;

function startNextPlacement() {
  if (state.toPlace.length === 0) {
    state.currentPlacement = null;
    removePreview();
    updateHint('All ships deployed. Click READY to begin combat.');
    document.getElementById('btnReady').disabled = false;
    return;
  }
  state.currentPlacement = { ...state.toPlace[0] };
  updateHint(`Deploy <b>${state.currentPlacement.name}</b> (length ${state.currentPlacement.len}). R to rotate.`);
}

function removePreview() {
  if (previewMesh) {
    usBoard.group.remove(previewMesh);
    previewMesh.geometry.dispose();
    previewMesh = null;
  }
}

function showPreview(cx, cz) {
  removePreview();
  const ship = state.currentPlacement;
  if (!ship) return;
  const valid = usBoard.canPlace(cx, cz, ship.len, state.horizontal);
  const geo = new THREE.BoxGeometry(
    state.horizontal ? CELL*ship.len*0.95 : CELL*0.95,
    0.3,
    state.horizontal ? CELL*0.95 : CELL*ship.len*0.95
  );
  previewMesh = new THREE.Mesh(geo, valid ? previewMat : previewBadMat);
  const center = usBoard.cellToLocal(
    state.horizontal ? cx + (ship.len-1)/2 : cx,
    state.horizontal ? cz : cz + (ship.len-1)/2,
  );
  previewMesh.position.set(center.x, 0.4, center.z);
  usBoard.group.add(previewMesh);
}

// ---------- Input ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function pickBoard(board) {
  const hits = raycaster.intersectObject(board.group, true);
  for (const h of hits) {
    // only consider the base plate / grid plane
    if (h.object.geometry && h.object.geometry.type !== 'GridHelper') {
      const cell = board.worldToCell(h.point);
      if (cell) return cell;
    }
  }
  return null;
}

canvas.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  if (state.phase === 'deploy' && state.currentPlacement) {
    const cell = pickBoard(usBoard);
    if (cell) showPreview(cell.cx, cell.cz);
    else removePreview();
  } else if (state.phase === 'playing' && state.turn === 'us') {
    const cell = pickBoard(irBoard);
    if (cell) {
      irBoard.cursor.position.copy(irBoard.cellToLocal(cell.cx, cell.cz));
      irBoard.cursor.position.y = 0.3;
      irBoard.cursor.visible = true;
    } else {
      irBoard.cursor.visible = false;
    }
  }
});

canvas.addEventListener('click', () => {
  if (state.phase === 'deploy' && state.currentPlacement) {
    const cell = pickBoard(usBoard);
    if (!cell) return;
    if (usBoard.canPlace(cell.cx, cell.cz, state.currentPlacement.len, state.horizontal)) {
      usBoard.placeShip(state.currentPlacement, cell.cx, cell.cz, state.horizontal, true);
      state.toPlace.shift();
      refreshFleetUI();
      startNextPlacement();
    }
  } else if (state.phase === 'playing' && state.turn === 'us') {
    const cell = pickBoard(irBoard);
    if (!cell) return;
    playerFire(cell.cx, cell.cz);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    state.horizontal = !state.horizontal;
    // refresh preview
    const cell = pickBoard(usBoard);
    if (cell) showPreview(cell.cx, cell.cz);
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (state.phase === 'deploy') state.horizontal = !state.horizontal;
});

// ---------- Buttons ----------
document.getElementById('btnRotate').onclick = () => {
  state.horizontal = !state.horizontal;
};
document.getElementById('btnRandom').onclick = () => {
  // clear current US ships
  for (const s of usBoard.ships) usBoard.group.remove(s.model);
  usBoard.ships = [];
  usBoard.cells = Array.from({length: GRID}, () => Array(GRID).fill(null));
  state.toPlace = [...SHIP_DEFS.us];
  for (const def of SHIP_DEFS.us) {
    const ship = { ...def };
    let ok = false, tries = 0;
    while (!ok && tries < 300) {
      tries++;
      const horiz = Math.random() < 0.5;
      const cx = Math.floor(Math.random() * GRID);
      const cz = Math.floor(Math.random() * GRID);
      if (usBoard.canPlace(cx, cz, ship.len, horiz)) {
        usBoard.placeShip(ship, cx, cz, horiz, true);
        ok = true;
      }
    }
  }
  state.toPlace = [];
  state.currentPlacement = null;
  removePreview();
  refreshFleetUI();
  document.getElementById('btnReady').disabled = false;
  updateHint('Random deployment complete. Click READY to begin.');
};
document.getElementById('btnReady').onclick = () => {
  if (state.toPlace.length > 0) return;
  beginCombat();
};
document.getElementById('btnRecon').onclick = () => useRecon();
document.getElementById('btnRestart').onclick = () => location.reload();
document.getElementById('endRestart').onclick = () => location.reload();

function updateHint(html) { document.getElementById('hint').innerHTML = html; }
function setPhase(p) {
  state.phase = p;
  document.getElementById('phase').textContent = 'PHASE: ' + p.toUpperCase();
}
function setTurn(t) {
  state.turn = t;
  document.getElementById('turn').textContent = 'TURN: ' + (t === 'us' ? 'USN' : 'IRGCN');
  document.getElementById('turn').style.color = t === 'us' ? '#5cd0ff' : '#ff7a7a';
}

function log(msg, cls = '') {
  const div = document.createElement('div');
  div.className = 'log-line ' + cls;
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  div.innerHTML = `<span class="t">[${t}]</span>${msg}`;
  const list = document.getElementById('logList');
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function refreshFleetUI() {
  const us = document.getElementById('usFleetList');
  const ir = document.getElementById('irFleetList');
  us.innerHTML = ''; ir.innerHTML = '';
  for (const s of usBoard.ships) {
    const li = document.createElement('li');
    li.className = s.sunk ? 'dead' : '';
    const remaining = s.len - s.hits;
    li.innerHTML = `<span>${s.name}</span><span class="health-bar">${'■'.repeat(remaining)}${'□'.repeat(s.hits)}</span>`;
    us.appendChild(li);
  }
  for (const s of irBoard.ships) {
    const li = document.createElement('li');
    li.className = s.sunk ? 'dead' : '';
    const remaining = s.len - s.hits;
    const label = s.sunk ? s.name : `??? (${s.class})`;
    li.innerHTML = `<span>${label}</span><span class="health-bar">${'■'.repeat(remaining)}${'□'.repeat(s.hits)}</span>`;
    ir.appendChild(li);
  }
}

// ---------- Combat ----------
function beginCombat() {
  setPhase('playing');
  placeMines();
  state.reconCharges = 1;
  document.getElementById('btnRecon').disabled = false;
  document.getElementById('btnRecon').textContent = `RECON SCAN (${state.reconCharges})`;
  document.getElementById('btnReady').hidden = true;
  document.getElementById('btnRotate').hidden = true;
  document.getElementById('btnRandom').hidden = true;
  updateHint('Click any cell on the <b>enemy board</b> to fire. Beware mines on your board.');
  log('Combat initiated. Enemy holds the chokepoint.', 'ir');
  log(`Intel: ${state.enemyAdvantage.mines} naval mines have been laid in your transit lane.`, 'ir');

  // ENEMY ADVANTAGE: first strike
  setTurn('ir');
  setTimeout(enemyTurn, 800);
}

function playerFire(cx, cz) {
  if (state.turn !== 'us') return;
  const result = irBoard.fireAt(cx, cz);
  if (result.repeat) return;
  if (result.hit) {
    log(`USN salvo on ${coord(cx, cz)} — <b>HIT</b>${result.sunk ? ` — ${result.ship.name} SUNK` : ''}`, result.sunk ? 'sunk' : 'hit us');
    refreshFleetUI();
    if (irBoard.allSunk()) return endGame(true);
    // player keeps turn on hit (classic salvo variant — keeps you in the game vs the asymmetric edge)
    return;
  } else {
    log(`USN salvo on ${coord(cx, cz)} — splash`, 'us');
    if (state.reconCooldown > 0) state.reconCooldown--;
  }
  // pass turn to enemy
  setTurn('ir');
  setTimeout(enemyTurn, 600);
}

function enemyTurn() {
  if (state.phase !== 'playing') return;
  const shots = 1 + state.enemyAdvantage.extraShotsPerTurn;
  let remaining = shots;
  const fireOnce = () => {
    if (remaining-- <= 0 || state.phase !== 'playing') return finishEnemyTurn();
    const cell = aiPickCell();
    if (!cell) return finishEnemyTurn();
    const result = usBoard.fireAt(cell.cx, cell.cz);

    // mine check — if the enemy fires next to a US ship, occasionally trigger a mine
    const mineIdx = state.mines.findIndex(m => m.cx === cell.cx && m.cz === cell.cz);
    if (mineIdx >= 0) {
      state.mines.splice(mineIdx, 1);
      log(`MINE detonation at ${coord(cell.cx, cell.cz)}`, 'ir');
      addBurning(usBoard.group, usBoard.cellToLocal(cell.cx, cell.cz).setY(0.5), 2);
    }

    if (result.hit) {
      log(`Enemy ASCM strike on ${coord(cell.cx, cell.cz)} — <b>HIT</b>${result.sunk ? ` — ${result.ship.name} LOST` : ''}`, result.sunk ? 'sunk' : 'hit ir');
      state.ai.lastHits.push({ cx: cell.cx, cz: cell.cz });
      // queue neighbours
      for (const n of neighbours(cell.cx, cell.cz)) {
        if (!usBoard.shots[n.cx][n.cz]) state.ai.targets.push(n);
      }
      refreshFleetUI();
      if (usBoard.allSunk()) return endGame(false);
    } else {
      log(`Enemy salvo on ${coord(cell.cx, cell.cz)} — missed`, 'ir');
    }
    setTimeout(fireOnce, 550);
  };
  fireOnce();
}

function finishEnemyTurn() {
  if (state.phase !== 'playing') return;
  if (state.reconCharges < 2 && state.reconCooldown === 0) {
    // regen one recon every 3 enemy turns
    state.reconCooldown = 3;
  }
  if (state.reconCooldown > 0) state.reconCooldown--;
  if (state.reconCooldown === 0 && state.reconCharges < 2) {
    state.reconCharges++;
    document.getElementById('btnRecon').textContent = `RECON SCAN (${state.reconCharges})`;
    document.getElementById('btnRecon').disabled = false;
    state.reconCooldown = 3;
  }
  setTurn('us');
}

function aiPickCell() {
  // hunt mode: take queued cell if available
  while (state.ai.targets.length) {
    const c = state.ai.targets.shift();
    if (!usBoard.shots[c.cx][c.cz]) return c;
  }
  // search mode: parity pattern (skip every other cell) — efficient hunt
  for (let attempt = 0; attempt < 200; attempt++) {
    const cx = Math.floor(Math.random()*GRID);
    const cz = Math.floor(Math.random()*GRID);
    if ((cx+cz) % 2 !== 0) continue;
    if (!usBoard.shots[cx][cz]) return { cx, cz };
  }
  // fallback
  for (let cx = 0; cx < GRID; cx++)
    for (let cz = 0; cz < GRID; cz++)
      if (!usBoard.shots[cx][cz]) return { cx, cz };
  return null;
}

function neighbours(cx, cz) {
  return [
    { cx: cx-1, cz }, { cx: cx+1, cz },
    { cx, cz: cz-1 }, { cx, cz: cz+1 },
  ].filter(n => n.cx >= 0 && n.cz >= 0 && n.cx < GRID && n.cz < GRID);
}

function coord(cx, cz) {
  return `${String.fromCharCode(65+cx)}${cz+1}`;
}

// ---------- Recon ----------
function useRecon() {
  if (state.reconCharges <= 0 || state.turn !== 'us' || state.phase !== 'playing') return;
  state.reconCharges--;
  document.getElementById('btnRecon').textContent = `RECON SCAN (${state.reconCharges})`;
  if (state.reconCharges <= 0) document.getElementById('btnRecon').disabled = true;
  // reveal one random not-yet-sunk enemy ship outline temporarily
  const alive = irBoard.ships.filter(s => !s.sunk);
  if (!alive.length) return;
  const target = alive[Math.floor(Math.random()*alive.length)];
  irBoard.revealShipOutline(target);
  log(`E-2D HAWKEYE recon: contact bearing on a ${target.class}.`, 'us');
}

// ---------- End game ----------
function endGame(playerWon) {
  setPhase('over');
  // reveal all enemy ships
  for (const s of irBoard.ships) s.model.visible = true;
  const card = document.getElementById('endcard');
  const title = document.getElementById('endTitle');
  const body = document.getElementById('endBody');
  if (playerWon) {
    title.textContent = 'STRAIT CLEARED';
    title.classList.remove('defeat');
    body.innerHTML = `CTF 50 broke the chokepoint. ${irBoard.ships.length} hostile combatants sunk.`;
  } else {
    title.textContent = 'CARRIER GROUP LOST';
    title.classList.add('defeat');
    body.innerHTML = `Asymmetric warfare bit hard. ${usBoard.ships.filter(s=>s.sunk).length} of ${usBoard.ships.length} US ships destroyed in the strait.`;
  }
  card.hidden = false;
}

// ---------- Render loop ----------
let lastT = 0;
function tick(t) {
  t *= 0.001;
  const dt = t - lastT; lastT = t;
  controls.update();
  updateWater(t);
  updateFires();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Boot ----------
startNextPlacement();
refreshFleetUI();
document.getElementById('btnReady').disabled = true;
requestAnimationFrame(tick);
