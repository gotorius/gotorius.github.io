import * as THREE from './vendor/three.module.min.js';
import { createHumanoidBot } from './humanoid-bot.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v(0, 1, 0);
const DURATION = 24;
const ASSEMBLY_DURATION = 9.6;
const ENTER_START = 10.8;
const EXIT_START = 19.8;
const EXIT_END = 22.6;
const OFFSTAGE_X = 6.5;
// Each block has its own contact, followed by a short step to the next one.
// Striking limbs reach local x=.15 (foot) or x=.10 (fist) at phase .5.
const STRIKES = [
  { letter: 3, action: 'kick', contact: 'rightFoot', start: 13.2, end: 14.4, x: 1.47 },
  { letter: 2, action: 'kick', contact: 'rightFoot', start: 15.0, end: 16.2, x: 0.87 },
  { letter: 1, action: 'punch', contact: 'rightFist', start: 16.8, end: 18.0, x: 0.32 },
  { letter: 0, action: 'uppercut', contact: 'rightFist', start: 18.6, end: 19.8, x: -0.28 },
];
const FLIGHT_DURATION = 3;
const NAME_POSE_PROGRESS = 10.5 / DURATION;

/** Collect, assemble, playfully scatter, and repeat with eleven persistent tiles. */
export function createMotionScene({ canvas, container, onUpdate = () => {}, onComplete = () => {}, onError = () => {} }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  if (renderer.debug) {
    renderer.debug.onShaderError = (gl, program) => {
      throw new Error(`3D shader compilation failed: ${gl.getProgramInfoLog(program) || 'unknown GPU error'}`);
    };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 50);
  const target = v(0.15, 1.40, 0.15);
  const orbit = { azimuth: 0.14, elevation: 0.30 };
  let width = 1;
  let height = 1;
  let disposed = false;
  let dirty = true;
  let progress = 0;
  let playing = false;
  let visible = !document.hidden;
  let intersecting = true;
  let lastFrame = 0;
  let lastUpdate = -Infinity;
  let frameId;
  let pointerStart = null;
  let hovered = false;
  let phase = 'Reach';
  let activeLetter = 0;
  const touchPointers = new Set();
  const materials = new Set();
  const geometries = new Set();
  const mesh = (geometry, material, parent = scene) => {
    geometries.add(geometry);
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  };
  const mat = (color, roughness = 0.45, metalness = 0.05) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(result);
    return result;
  };
  const yellow = mat('#eebd45', 0.34, 0.25);
  const paleYellow = mat('#f5d365', 0.39, 0.15);
  const charcoal = mat('#343c3c', 0.43, 0.38);
  const dark = mat('#20282a', 0.58, 0.17);
  const silver = mat('#aab3b1', 0.28, 0.75);
  const green = mat('#3f6b55', 0.48, 0.08);
  const ivory = mat('#f3f0e7', 0.54, 0.08);
  const brass = mat('#bc9952', 0.37, 0.52);
  const glyphMaterial = mat('#294e40', 0.38, 0.20);
  const boltGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.035, 6);

  function roundedGeometry(w, h, d, radius = 0.05) {
    const r = Math.min(radius, w / 4, h / 4, d / 4);
    const shape = new THREE.Shape();
    const x = w / 2 - r;
    const y = h / 2 - r;
    shape.moveTo(-x, -y); shape.lineTo(x, -y); shape.lineTo(x, y); shape.lineTo(-x, y); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, steps: 1 });
    geometry.translate(0, 0, -d / 2 + r);
    geometry.computeVertexNormals();
    return geometry;
  }
  function box(w, h, d, material, parent = scene, radius = 0.04) {
    return mesh(roundedGeometry(w, h, d, radius), material, parent);
  }
  function cylinder(radius, length, material, parent = scene, topRadius = radius, segments = 48) {
    return mesh(new THREE.CylinderGeometry(topRadius, radius, length, segments), material, parent);
  }
  function boltRing(parent, radius, y, count = 6) {
    for (let i = 0; i < count; i += 1) {
      const bolt = mesh(boltGeometry, silver, parent);
      bolt.position.set(Math.cos(i / count * TAU) * radius, y, Math.sin(i / count * TAU) * radius);
    }
  }

  scene.add(new THREE.HemisphereLight('#ffffff', '#d8dfd4', 2.5));
  const sunlight = new THREE.DirectionalLight('#fff6e6', 3.2);
  sunlight.position.set(-3.5, 7, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  Object.assign(sunlight.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.1, far: 20 });
  sunlight.shadow.normalBias = 0.02;
  sunlight.shadow.bias = -0.00015;
  sunlight.shadow.radius = 4;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight('#edf5ff', 1.1);
  fill.position.set(5, 4, -4);
  scene.add(fill);
  // A transparent shadow receiver leaves the white page uninterrupted.
  const shadowMaterial = new THREE.ShadowMaterial({ color: '#6c7768', opacity: 0.16 });
  materials.add(shadowMaterial);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), shadowMaterial);
  ground.name = 'shadow-floor';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.castShadow = false;

  const robot = new THREE.Group();
  scene.add(robot);
  robot.name = 'robot';
  const baseX = -1.30;
  const baseZ = -0.28;
  const pedestal = new THREE.Group();
  pedestal.position.set(baseX, 0, baseZ);
  robot.add(pedestal);
  const basePlate = cylinder(0.62, 0.11, charcoal, pedestal);
  basePlate.position.y = 0.075;
  boltRing(pedestal, 0.49, 0.146);
  const baseBody = cylinder(0.45, 0.44, yellow, pedestal, 0.34);
  baseBody.position.y = 0.34;
  const baseRim = cylinder(0.36, 0.09, dark, pedestal);
  baseRim.position.y = 0.59;
  const swivel = cylinder(0.31, 0.15, paleYellow, pedestal);
  swivel.position.y = 0.71;
  const shoulder = v(baseX, 0.98, baseZ);
  const shoulderBlock = box(0.56, 0.45, 0.44, yellow, pedestal);
  shoulderBlock.position.y = 0.87;
  const led = box(0.075, 0.035, 0.025, green, pedestal, 0.006);
  led.position.set(0.05, 0.39, 0.404);
  const badge = box(0.23, 0.075, 0.022, charcoal, pedestal, 0.008);
  badge.position.set(-0.06, 0.49, 0.359);

  const upperLength = 1.70;
  const lowerLength = 1.65;
  const upper = new THREE.Group();
  const lower = new THREE.Group();
  robot.add(upper, lower);
  upper.name = 'upper-arm';
  lower.name = 'forearm';
  box(0.40, upperLength - 0.12, 0.40, yellow, upper, 0.08);
  const upperInset = box(0.26, upperLength - 0.51, 0.025, paleYellow, upper, 0.015);
  upperInset.position.z = 0.214;
  const upperStripe = box(0.085, upperLength - 0.58, 0.027, charcoal, upper, 0.01);
  upperStripe.position.set(-0.115, 0, 0.217);
  box(0.29, lowerLength - 0.06, 0.30, yellow, lower, 0.055);
  const lowerInset = box(0.22, lowerLength - 0.44, 0.026, paleYellow, lower, 0.014);
  lowerInset.position.z = 0.163;
  const rail = box(0.075, lowerLength - 0.25, 0.09, charcoal, lower, 0.02);
  rail.position.set(0.19, 0, -0.015);
  const jointGroups = [];
  for (const radius of [0.30, 0.255, 0.10]) {
    const joint = new THREE.Group();
    robot.add(joint);
    cylinder(radius, 0.49, charcoal, joint);
    const ring = cylinder(radius * 0.79, 0.51, yellow, joint);
    const front = cylinder(radius * 0.45, 0.53, silver, joint);
    const cap = cylinder(radius * 0.27, 0.548, dark, joint);
    ring.castShadow = true;
    front.castShadow = true;
    cap.castShadow = true;
    joint.name = ['shoulder', 'elbow', 'wrist'][jointGroups.length];
    if (jointGroups.length === 2) joint.scale.y = 0.52;
    jointGroups.push(joint);
  }
  const tool = new THREE.Group();
  robot.add(tool);
  tool.name = 'gripper';
  const wristStem = cylinder(0.125, 0.20, silver, tool);
  wristStem.position.y = 0.58;
  const wristRing = cylinder(0.135, 0.09, dark, tool);
  wristRing.position.y = 0.48;
  const palm = box(0.63, 0.15, 0.27, charcoal, tool, 0.035);
  palm.position.y = 0.38;
  const palmFace = box(0.40, 0.065, 0.022, silver, tool, 0.008);
  palmFace.position.set(0, 0.38, 0.149);
  const jaws = [-1, 1].map((side) => {
    const jaw = new THREE.Group();
    jaw.name = side < 0 ? 'jaw-front' : 'jaw-back';
    const bar = box(0.095, 0.37, 0.18, silver, jaw, 0.015);
    bar.name = `${jaw.name}-bar`;
    bar.position.y = 0.12;
    const contact = box(0.045, 0.19, 0.19, dark, jaw, 0.012);
    contact.name = `${jaw.name}-contact-pad`;
    contact.position.set(-side * 0.057, 0.07, 0);
    tool.add(jaw);
    return jaw;
  });


  const name = new THREE.Group();
  name.name = 'name';
  scene.add(name);

  // Small geometric sans-serif outlines. Glyphs are solid extruded paths,
  // including real counters in O and R, so the name stays crisp at any DPR.
  function glyphShape(letter) {
    const s = new THREE.Shape();
    function polygon(points) { s.moveTo(...points[0]); for (const point of points.slice(1)) s.lineTo(...point); s.closePath(); }
    if (letter === 'O') {
      s.absellipse(0.36, 0.50, 0.36, 0.50, 0, TAU, false);
      const hole = new THREE.Path();
      hole.absellipse(0.36, 0.50, 0.16, 0.30, 0, TAU, true);
      s.holes.push(hole);
    } else if (letter === 'G') {
      s.moveTo(0.72, 0.82); s.bezierCurveTo(0.63, 0.95, 0.49, 1, 0.36, 1);
      s.bezierCurveTo(0.13, 1, 0, 0.78, 0, 0.50); s.bezierCurveTo(0, 0.22, 0.13, 0, 0.36, 0);
      s.bezierCurveTo(0.52, 0, 0.64, 0.08, 0.72, 0.17); s.lineTo(0.72, 0.53); s.lineTo(0.39, 0.53);
      s.lineTo(0.39, 0.36); s.lineTo(0.53, 0.36); s.lineTo(0.53, 0.25);
      s.bezierCurveTo(0.48, 0.20, 0.43, 0.18, 0.37, 0.18); s.bezierCurveTo(0.25, 0.18, 0.19, 0.31, 0.19, 0.50);
      s.bezierCurveTo(0.19, 0.70, 0.25, 0.82, 0.37, 0.82); s.bezierCurveTo(0.45, 0.82, 0.50, 0.78, 0.54, 0.71); s.closePath();
    } else if (letter === 'T') polygon([[0,1],[0.74,1],[0.74,0.80],[0.47,0.80],[0.47,0],[0.27,0],[0.27,0.80],[0,0.80]]);
    else if (letter === 'R') {
      s.moveTo(0,0); s.lineTo(0,1); s.lineTo(0.37,1); s.bezierCurveTo(0.61,1,0.72,0.88,0.72,0.70);
      s.bezierCurveTo(0.72,0.55,0.63,0.45,0.50,0.40); s.lineTo(0.77,0); s.lineTo(0.53,0);
      s.lineTo(0.30,0.36); s.lineTo(0.20,0.36); s.lineTo(0.20,0); s.closePath();
      const hole = new THREE.Path(); hole.moveTo(0.20,0.81); hole.lineTo(0.20,0.55); hole.lineTo(0.35,0.55);
      hole.bezierCurveTo(0.47,0.55,0.52,0.61,0.52,0.69); hole.bezierCurveTo(0.52,0.77,0.47,0.81,0.35,0.81); hole.closePath(); s.holes.push(hole);
    } else if (letter === 'Y') polygon([[0,1],[0.22,1],[0.39,0.63],[0.56,1],[0.78,1],[0.49,0.42],[0.49,0],[0.29,0],[0.29,0.42]]);
    else if (letter === 'S') {
      s.moveTo(0.68,0.88); s.bezierCurveTo(0.60,0.96,0.49,1,0.35,1); s.bezierCurveTo(0.13,1,0,0.87,0,0.70);
      s.bezierCurveTo(0,0.52,0.11,0.45,0.31,0.39); s.lineTo(0.40,0.36); s.bezierCurveTo(0.49,0.33,0.54,0.30,0.54,0.25);
      s.bezierCurveTo(0.54,0.19,0.48,0.16,0.38,0.16); s.bezierCurveTo(0.26,0.16,0.15,0.22,0.07,0.30);
      s.lineTo(-0.02,0.14); s.bezierCurveTo(0.08,0.04,0.22,0,0.38,0); s.bezierCurveTo(0.60,0,0.74,0.11,0.74,0.28);
      s.bezierCurveTo(0.74,0.46,0.62,0.54,0.43,0.60); s.lineTo(0.33,0.63); s.bezierCurveTo(0.23,0.66,0.20,0.69,0.20,0.74);
      s.bezierCurveTo(0.20,0.80,0.25,0.84,0.34,0.84); s.bezierCurveTo(0.44,0.84,0.53,0.80,0.60,0.74); s.closePath();
    } else if (letter === 'U') {
      s.moveTo(0,1); s.lineTo(0.20,1); s.lineTo(0.20,0.35); s.bezierCurveTo(0.20,0.23,0.25,0.18,0.36,0.18);
      s.bezierCurveTo(0.47,0.18,0.52,0.23,0.52,0.35); s.lineTo(0.52,1); s.lineTo(0.72,1); s.lineTo(0.72,0.34);
      s.bezierCurveTo(0.72,0.12,0.60,0,0.36,0); s.bezierCurveTo(0.12,0,0,0.12,0,0.34); s.closePath();
    } else if (letter === 'K') polygon([[0,0],[0,1],[0.20,1],[0.20,0.59],[0.49,1],[0.73,1],[0.38,0.52],[0.76,0],[0.52,0],[0.25,0.37],[0.20,0.31],[0.20,0]]);
    else if (letter === 'E') polygon([[0,0],[0,1],[0.66,1],[0.66,0.81],[0.20,0.81],[0.20,0.60],[0.60,0.60],[0.60,0.41],[0.20,0.41],[0.20,0.19],[0.68,0.19],[0.68,0]]);
    return s;
  }
  const glyphGeometries = new Map();
  function makeLetter(letter, index) {
    const tile = new THREE.Group();
    tile.name = `letter-${letter}-${index}`;
    tile.userData.letter = letter;
    name.add(tile);
    box(0.365, 0.50, 0.14, ivory, tile, 0.025);
    const back = box(0.353, 0.488, 0.018, brass, tile, 0.012);
    back.position.z = -0.068;
    if (!glyphGeometries.has(letter)) {
      const geometry = new THREE.ExtrudeGeometry(glyphShape(letter), { depth: 0.055, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 16, steps: 1 });
      geometry.scale(0.34, 0.34, 1);
      geometry.center();
      glyphGeometries.set(letter, geometry);
    }
    const glyph = mesh(glyphGeometries.get(letter), glyphMaterial, tile);
    glyph.name = `glyph-${letter}`;
    glyph.position.z = 0.108;
    return tile;
  }
  const rows = [];
  const spacing = 0.405;
  for (const [index, letter] of [...'RYOSUKE'].entries()) {
    const tile = makeLetter(letter, index + 4);
    tile.position.set(-0.315 + index * spacing, 0.27, 0.20);
    rows.push(tile);
  }
  const letters = [...'GOTO'].map((letter, index) => makeLetter(letter, index));
  const IDENTITY = new THREE.Quaternion();
  const gripAnchor = v(0, 0, 0.075);
  const toolQuaternion = new THREE.Quaternion();
  const workingQuaternion = new THREE.Quaternion();
  const spinQuaternion = new THREE.Quaternion();
  const floorPoint = new THREE.Vector3();
  const supportPoints = letters.map(letter => {
    const points = [];
    for (const child of letter.children) {
      child.geometry.computeBoundingBox();
      child.updateMatrix();
      const bounds = child.geometry.boundingBox;
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        points.push(v(x, y, z).applyMatrix4(child.matrix));
      }
    }
    letter.userData.gripAnchor = gripAnchor.toArray();
    letter.userData.supportPoints = points.map(point => point.toArray());
    return points;
  });
  function floorHeight(index, quaternion) {
    let minimum = Infinity;
    for (const point of supportPoints[index]) minimum = Math.min(minimum, floorPoint.copy(point).applyQuaternion(quaternion).y);
    return -minimum;
  }
  function floorPose(index, x, z, yaw, flat) {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    if (flat) quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), -Math.PI / 2));
    return { position: v(x, floorHeight(index, quaternion), z), quaternion };
  }
  const scatterPoses = [
    floorPose(0, -0.65, 1.32, -0.28, true),
    floorPose(1, 0.12, 1.65, 0.32, false),
    floorPose(2, 0.80, 1.24, 0.24, true),
    floorPose(3, 1.40, 1.24, -0.18, true),
  ];
  const assembledPoses = letters.map((_, index) => ({ position: v(-0.18 + index * 0.60, 0.77, 0.20), quaternion: IDENTITY.clone() }));
  const flightStarts = letters.map((_, index) => {
    const strike = STRIKES.find(item => item.letter === index);
    return (strike.start + strike.end) / 2;
  });
  const flightAxes = [v(0.25, 0.3, 1).normalize(), v(0.2, 1, 0.1).normalize(), v(1, 0.25, 0.2).normalize(), v(0.4, 0.8, 0.2).normalize()];
  const flightHeights = [1.35, 0.90, 0.70, 0.88];
  const flightTurns = [2, 1, 1, 1];
  const sidewaysArcs = [-0.10, 0.10, -0.10, 0.10];
  const HOVER_HEIGHT = 1.30;
  const home = v(-0.68, HOVER_HEIGHT, -1.25);
  const tip = home.clone();
  const sourceGrip = new THREE.Vector3();
  const sourceHover = new THREE.Vector3();
  const destinationGrip = new THREE.Vector3();
  const destinationHover = new THREE.Vector3();
  const previousHover = new THREE.Vector3();
  const carriedCenter = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const wrist = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const jointAxis = new THREE.Vector3();
  const toolUp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let gap = 0.34;
  let cycle = 0;
  let botAction = 'hidden';
  let botPhase = 0;
  let attackIndex = -1;
  let struckTile = null;
  let strikeLimb = null;
  let impact = false;
  const humanoid = createHumanoidBot();
  humanoid.group.name = 'humanoid';
  humanoid.group.visible = false;
  scene.add(humanoid.group);

  function copyPose(letter, pose) {
    letter.position.copy(pose.position);
    letter.quaternion.copy(pose.quaternion);
  }
  function gripPosition(pose, result) {
    return result.copy(gripAnchor).applyQuaternion(pose.quaternion).add(pose.position);
  }
  function hoverPosition(pose, result) {
    result.copy(gripAnchor).applyQuaternion(pose.quaternion).add(pose.position);
    result.y += HOVER_HEIGHT - pose.position.y;
    return result;
  }

  function moveLink(group, start, end) {
    group.position.copy(start).add(end).multiplyScalar(0.5);
    direction.copy(end).sub(start).normalize();
    group.quaternion.setFromUnitVectors(UP, direction);
  }
  function solveRobot() {
    tool.quaternion.copy(toolQuaternion);
    toolUp.copy(UP).applyQuaternion(toolQuaternion);
    wrist.copy(tip).addScaledVector(toolUp, 0.68);
    radial.copy(wrist).sub(shoulder);
    radial.y = 0;
    const reach = Math.max(radial.length(), 0.001);
    radial.divideScalar(reach);
    const dy = wrist.y - shoulder.y;
    const distance = Math.sqrt(reach * reach + dy * dy);
    const cosine = clamp((upperLength ** 2 + distance ** 2 - lowerLength ** 2) / (2 * upperLength * distance), -1, 1);
    const shoulderAngle = Math.atan2(dy, reach) + Math.acos(cosine);
    elbow.copy(shoulder).addScaledVector(radial, Math.cos(shoulderAngle) * upperLength);
    elbow.y += Math.sin(shoulderAngle) * upperLength;
    moveLink(upper, shoulder, elbow);
    moveLink(lower, elbow, wrist);
    jointAxis.set(-radial.z, 0, radial.x);
    for (let i = 0; i < jointGroups.length; i += 1) {
      jointGroups[i].position.copy(i === 0 ? shoulder : i === 1 ? elbow : wrist);
      jointGroups[i].quaternion.setFromUnitVectors(UP, jointAxis);
    }
    tool.position.copy(tip);
    jaws[0].position.x = -gap;
    jaws[1].position.x = gap;
    shoulderBlock.rotation.y = -Math.atan2(radial.z, radial.x);
  }
  function interpolate(a, b, t) { tip.copy(a).lerp(b, ease(t)); }
  function poseAssembly(time) {
    const scaled = clamp(time / ASSEMBLY_DURATION, 0, 1) * 4;
    activeLetter = Math.min(3, Math.floor(scaled));
    const t = time >= ASSEMBLY_DURATION ? 1 : scaled - activeLetter;
    const source = scatterPoses[activeLetter];
    const destination = assembledPoses[activeLetter];
    gripPosition(source, sourceGrip);
    hoverPosition(source, sourceHover);
    gripPosition(destination, destinationGrip);
    hoverPosition(destination, destinationHover);
    if (activeLetter === 0) previousHover.copy(home);
    else hoverPosition(assembledPoses[activeLetter - 1], previousHover);
    gap = 0.34;
    if (t < 0.12) {
      interpolate(previousHover, sourceHover, t / 0.12);
      toolQuaternion.copy(IDENTITY).slerp(source.quaternion, ease(t / 0.12));
      phase = 'Reach';
    } else if (t < 0.25) {
      interpolate(sourceHover, sourceGrip, (t - 0.12) / 0.13);
      toolQuaternion.copy(source.quaternion);
      phase = 'Approach';
    } else if (t < 0.32) {
      tip.copy(sourceGrip);
      toolQuaternion.copy(source.quaternion);
      gap = THREE.MathUtils.lerp(0.34, 0.267, ease((t - 0.25) / 0.07));
      phase = 'Grasp';
    } else if (t < 0.45) {
      interpolate(sourceGrip, sourceHover, (t - 0.32) / 0.13);
      toolQuaternion.copy(source.quaternion);
      gap = 0.267;
      phase = 'Lift';
    } else if (t < 0.55) {
      toolQuaternion.copy(source.quaternion).slerp(IDENTITY, ease((t - 0.45) / 0.10));
      carriedCenter.copy(source.position).setY(HOVER_HEIGHT);
      tip.copy(gripAnchor).applyQuaternion(toolQuaternion).add(carriedCenter);
      gap = 0.267;
      phase = 'Rotate';
    } else if (t < 0.72) {
      carriedCenter.copy(source.position).setY(HOVER_HEIGHT).lerp(previousHover.copy(destination.position).setY(HOVER_HEIGHT), ease((t - 0.55) / 0.17));
      toolQuaternion.copy(IDENTITY);
      tip.copy(carriedCenter).add(gripAnchor);
      gap = 0.267;
      phase = 'Transfer';
    } else if (t < 0.82) {
      interpolate(destinationHover, destinationGrip, (t - 0.72) / 0.10);
      toolQuaternion.copy(IDENTITY);
      gap = 0.267;
      phase = 'Place';
    } else if (t < 0.88) {
      tip.copy(destinationGrip);
      toolQuaternion.copy(IDENTITY);
      gap = THREE.MathUtils.lerp(0.267, 0.34, ease((t - 0.82) / 0.06));
      phase = 'Release';
    } else {
      interpolate(destinationGrip, destinationHover, (t - 0.88) / 0.12);
      toolQuaternion.copy(IDENTITY);
      phase = 'Retract';
    }
    letters.forEach((letter, index) => {
      if (index < activeLetter || (index === activeLetter && t >= 0.82)) copyPose(letter, assembledPoses[index]);
      else if (index === activeLetter && t >= 0.32) {
        letter.quaternion.copy(toolQuaternion);
        letter.position.copy(gripAnchor).applyQuaternion(toolQuaternion).negate().add(tip);
      } else copyPose(letter, scatterPoses[index]);
    });
  }
  function poseFlight(index, elapsed) {
    const letter = letters[index];
    const destination = scatterPoses[index];
    const t = clamp(elapsed / FLIGHT_DURATION, 0, 1);
    if (t >= 1) { copyPose(letter, destination); return; }
    if (t < 0.72) {
      const u = t / 0.72;
      letter.quaternion.copy(IDENTITY).slerp(destination.quaternion, ease(u));
      spinQuaternion.setFromAxisAngle(flightAxes[index], TAU * flightTurns[index] * ease(u));
      letter.quaternion.multiply(spinQuaternion);
      letter.position.copy(assembledPoses[index].position).lerp(destination.position, u);
      letter.position.x += sidewaysArcs[index] * Math.sin(Math.PI * u);
      letter.position.z += 0.12 * Math.sin(Math.PI * u);
      const supportedHeight = assembledPoses[index].position.y - floorHeight(index, IDENTITY);
      const clearance = supportedHeight * (1 - u) + 4 * flightHeights[index] * u * (1 - u);
      letter.position.y = floorHeight(index, letter.quaternion) + clearance;
    } else {
      const bounce = (t - 0.72) / 0.28;
      workingQuaternion.setFromAxisAngle(flightAxes[index], 0.10 * Math.sin(bounce * TAU) * (1 - bounce));
      letter.quaternion.copy(destination.quaternion).multiply(workingQuaternion);
      letter.position.copy(destination.position);
      letter.position.x += 0.015 * Math.sin(bounce * TAU) * (1 - bounce);
      letter.position.y = floorHeight(index, letter.quaternion) + 0.09 * Math.abs(Math.sin(bounce * TAU)) * (1 - bounce) ** 1.4;
    }
  }
  function poseHumanoid(time) {
    const group = humanoid.group;
    botAction = 'hidden'; botPhase = 0; attackIndex = -1; struckTile = null; strikeLimb = null; impact = false;
    group.visible = false;
    group.position.set(OFFSTAGE_X, 0, -0.65);
    group.rotation.set(0, 0, 0);
    humanoid.pose('idle', 0);
    if (time >= ENTER_START && time < STRIKES[0].start) {
      const t = (time - ENTER_START) / (STRIKES[0].start - ENTER_START);
      group.visible = true;
      group.position.set(THREE.MathUtils.lerp(OFFSTAGE_X, STRIKES[0].x, ease(t)), 0, THREE.MathUtils.lerp(-0.65, -0.53, ease(t)));
      group.rotation.y = -Math.PI / 2 * (1 - ease((t - 0.70) / 0.30));
      const weight = ease(t / 0.15) * (1 - ease((t - 0.82) / 0.18));
      humanoid.pose('walk', (t * 3) % 1, { weight });
      botAction = 'walk'; botPhase = (t * 3) % 1;
      phase = 'Enter';
    } else if (time >= STRIKES[0].start && time < EXIT_START) {
      group.visible = true;
      const index = STRIKES.findIndex(strike => time < strike.end);
      const strike = STRIKES[index];
      if (time >= strike.start) {
        const t = (time - strike.start) / (strike.end - strike.start);
        group.position.set(strike.x, 0, -0.53);
        humanoid.pose(strike.action, t);
        botAction = strike.action; botPhase = t; attackIndex = index;
        struckTile = strike.letter;
        strikeLimb = strike.contact;
        impact = Math.abs(time - flightStarts[strike.letter]) < 0.045;
        phase = strike.action === 'uppercut' ? 'Uppercut' : strike.contact === 'rightFoot' ? 'Kick' : 'Punch';
      } else {
        const previous = STRIKES[index - 1];
        const t = (time - previous.end) / (strike.start - previous.end);
        group.position.set(THREE.MathUtils.lerp(previous.x, strike.x, ease(t)), 0, -0.53);
        group.rotation.y = -Math.PI / 2 * ease(t / 0.22) * (1 - ease((t - 0.78) / 0.22));
        const weight = ease(t / 0.18) * (1 - ease((t - 0.82) / 0.18));
        humanoid.pose('walk', t % 1, { weight });
        botAction = 'walk'; botPhase = t % 1;
        phase = 'Step';
      }
    } else if (time >= EXIT_START && time < EXIT_END) {
      const t = (time - EXIT_START) / (EXIT_END - EXIT_START);
      group.visible = true;
      group.position.set(THREE.MathUtils.lerp(STRIKES[3].x, OFFSTAGE_X, ease(t)), 0, THREE.MathUtils.lerp(-0.53, -0.65, ease(t)));
      group.rotation.y = Math.PI / 2 * ease(t / 0.22);
      const weight = ease(t / 0.15) * (1 - ease((t - 0.85) / 0.15));
      humanoid.pose('walk', (t * 3.5) % 1, { weight });
      botAction = 'walk'; botPhase = (t * 3.5) % 1;
      phase = 'Exit';
    }
  }
  function updatePose() {
    const time = clamp(progress, 0, 1) * DURATION;
    if (time < ASSEMBLY_DURATION) poseAssembly(time);
    else {
      activeLetter = -1;
      gap = 0.34;
      toolQuaternion.copy(IDENTITY);
      if (time < ENTER_START) {
        hoverPosition(assembledPoses[3], destinationHover);
        interpolate(destinationHover, home, (time - ASSEMBLY_DURATION) / 0.80);
        phase = 'Name';
      } else {
        tip.copy(home);
        phase = 'Settle';
      }
      letters.forEach((letter, index) => {
        if (time < flightStarts[index]) copyPose(letter, assembledPoses[index]);
        else poseFlight(index, time - flightStarts[index]);
      });
    }
    poseHumanoid(time);
    solveRobot();
    dirty = true;
  }
  function emit() {
    const time = progress * DURATION;
    const local = activeLetter < 0 ? -1 : (time / ASSEMBLY_DURATION * 4 - activeLetter);
    onUpdate({
      progress, playing, phase, cycle, activeLetter, operationIndex: activeLetter,
      heldTile: activeLetter >= 0 && local >= 0.32 && local < 0.82 ? activeLetter : null,
      botAction, botPhase, attackIndex, struckTile, strikeLimb, impact, botVisible: humanoid.group.visible,
      botPosition: humanoid.group.position.toArray(),
      namePoseProgress: NAME_POSE_PROGRESS, duration: DURATION,
      position: { x: tip.x, y: tip.y, z: tip.z },
    });
  }
  function resetView() { orbit.azimuth = 0.14; orbit.elevation = 0.30; updateCamera(); }
  function updateCamera() {
    const aspect = width / height;
    const viewHeight = Math.max(4.20, 5.80 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.position.set(target.x + Math.sin(orbit.azimuth) * Math.cos(orbit.elevation) * 10, target.y + Math.sin(orbit.elevation) * 10, target.z + Math.cos(orbit.azimuth) * Math.cos(orbit.elevation) * 10);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false); updateCamera();
  }
  const resizeObserver = new ResizeObserver(() => {
    try { resize(); } catch (error) { fail(error); }
  });
  resizeObserver.observe(container);
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    intersecting = entry.isIntersecting; lastFrame = 0; if (intersecting) dirty = true;
  }, { rootMargin: '120px' }) : null;
  intersectionObserver?.observe(container);

  function setPlaying(value) {
    if (value && progress >= 1) { progress = 0; cycle += 1; }
    playing = Boolean(value); lastFrame = 0; updatePose(); emit();
  }
  function replay() { progress = 0; cycle = 0; setPlaying(true); }
  function togglePlayback() { if (progress >= 1) replay(); else setPlaying(!playing); }
  function hitTest(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const targets = humanoid.group.visible ? [robot, name, humanoid.group] : [robot, name];
    return Boolean(raycaster.intersectObjects(targets, true)[0]);
  }
  function pointerDown(event) {
    if (event.button !== 0) return;
    touchPointers.add(event.pointerId);
    if (touchPointers.size > 1) { pointerStart = null; return; }
    pointerStart = { x: event.clientX, y: event.clientY, px: event.clientX, py: event.clientY, moved: false, pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
  }
  function pointerMove(event) {
    if (!pointerStart) {
      if (event.pointerType === 'mouse') { const hit = hitTest(event); if (hit !== hovered) { hovered = hit; canvas.style.cursor = hit ? 'pointer' : 'grab'; } }
      return;
    }
    if (pointerStart.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) pointerStart.moved = true;
    if (pointerStart.moved) {
      orbit.azimuth = clamp(orbit.azimuth - (event.clientX - pointerStart.px) * 0.003, -0.22, 0.40);
      orbit.elevation = clamp(orbit.elevation + (event.clientY - pointerStart.py) * 0.003, 0.16, 0.43);
      updateCamera();
    }
    pointerStart.px = event.clientX; pointerStart.py = event.clientY;
  }
  function pointerUp(event) {
    touchPointers.delete(event.pointerId);
    if (!pointerStart || event.pointerId !== pointerStart.pointerId) return;
    const clicked = !pointerStart.moved; pointerStart = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab'; if (clicked && hitTest(event)) togglePlayback();
  }
  function pointerCancel(event) { touchPointers.delete(event.pointerId); pointerStart = null; canvas.style.cursor = 'grab'; }
  function pointerLeave() { if (!pointerStart) { hovered = false; canvas.style.cursor = 'grab'; } }
  function keyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', ' ', 'Enter', 'Escape'].includes(event.key)) event.preventDefault();
    switch (event.key) {
      case 'ArrowLeft': orbit.azimuth = clamp(orbit.azimuth - 0.08, -0.22, 0.40); break;
      case 'ArrowRight': orbit.azimuth = clamp(orbit.azimuth + 0.08, -0.22, 0.40); break;
      case 'ArrowUp': orbit.elevation = clamp(orbit.elevation + 0.05, 0.16, 0.43); break;
      case 'ArrowDown': orbit.elevation = clamp(orbit.elevation - 0.05, 0.16, 0.43); break;
      case 'Home': resetView(); return;
      case ' ': case 'Enter': togglePlayback(); return;
      case 'Escape': setPlaying(false); return;
      default: return;
    }
    updateCamera();
  }
  function visibilityChange() { visible = !document.hidden; lastFrame = 0; dirty = true; }
  function contextLost(event) { event.preventDefault(); fail(new Error('WebGL context lost')); }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', visibilityChange);
  canvas.style.cursor = 'grab';
  function dispose() {
    if (disposed) return;
    disposed = true;
    playing = false;
    cancelAnimationFrame(frameId);
    resizeObserver.disconnect();
    intersectionObserver?.disconnect();
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('pointerleave', pointerLeave); canvas.removeEventListener('keydown', keyDown);
    canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibilityChange);
    humanoid.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    renderer.dispose();
  }
  function fail(error) {
    if (disposed) return;
    dispose();
    onError(error);
  }
  function animate(time) {
    if (disposed) return;
    const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.10) : 0;
    lastFrame = time;
    try {
      if (visible && intersecting) {
        if (playing) {
          progress += delta / DURATION;
          if (progress >= 1) {
            cycle += Math.floor(progress);
            progress %= 1;
            onComplete();
          }
          updatePose();
          if (time - lastUpdate > 65 || !playing) { emit(); lastUpdate = time; }
        }
        if (dirty) { renderer.render(scene, camera); dirty = false; }
      }
    } catch (error) {
      fail(error);
      return;
    }
    if (!disposed) frameId = requestAnimationFrame(animate);
  }
  // Read the real CSS dimensions and verify the first GPU frame before the
  // caller hides its fallback. ResizeObserver delivery and RAF come later.
  try {
    resize();
    updatePose();
    emit();
    renderer.render(scene, camera);
    dirty = false;
  } catch (error) {
    dispose();
    throw error;
  }
  frameId = requestAnimationFrame(animate);
  return {
    setPlaying,
    seek(value) { progress = clamp(Number(value) || 0, 0, 1); updatePose(); emit(); },
    showName() { progress = NAME_POSE_PROGRESS; playing = false; lastFrame = 0; updatePose(); emit(); },
    namePoseProgress: NAME_POSE_PROGRESS,
    replay,
    resetView,
    dispose,
  };
}
