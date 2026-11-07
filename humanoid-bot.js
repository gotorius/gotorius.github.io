import * as THREE from './vendor/three.module.min.js';

// A compact, self-contained robot rig. All animation coordinates are local to
// its floor-level root; the scene can move and turn that root independently.
export function createHumanoidBot() {
  const group = new THREE.Group();
  group.name = 'humanoid';
  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'humanoid-body-pivot';
  group.add(bodyPivot);
  const geometries = new Set();
  const materials = new Set();
  const boxes = new Map();
  const up = new THREE.Vector3(0, 1, 0);
  const tempDirection = new THREE.Vector3();
  const tempMidpoint = new THREE.Vector3();
  let disposed = false;

  function material(color, roughness = 0.5, metalness = 0.2) {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(result);
    return result;
  }
  const armor = material(0xe3e7df, 0.36, 0.33);
  const silver = material(0xa9b7b2, 0.38, 0.5);
  const dark = material(0x263532, 0.52, 0.36);
  const rubber = material(0x182624, 0.82, 0.04);
  const yellow = material(0xe5bc53, 0.47, 0.2);
  const visor = material(0x73afa4, 0.28, 0.4);
  const eye = material(0xd7f0dd, 0.3, 0.1);

  function geometry(value) {
    geometries.add(value);
    return value;
  }
  const sphere = geometry(new THREE.SphereGeometry(1, 16, 10));
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 16));

  function boxGeometry(width, height, depth, radius = 0.025) {
    const key = [width, height, depth, radius].join(':');
    if (boxes.has(key)) return boxes.get(key);
    const bevel = Math.min(0.009, depth * 0.12, radius * 0.4);
    const w = width / 2 - bevel;
    const h = height / 2 - bevel;
    const r = Math.min(radius, w * 0.7, h * 0.7);
    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    const result = geometry(new THREE.ExtrudeGeometry(shape, {
      depth: depth - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 3,
      steps: 1,
    }));
    result.translate(0, 0, -(depth - 2 * bevel) / 2);
    boxes.set(key, result);
    return result;
  }

  function mesh(parent, name, geo, mat, position, scale) {
    const result = new THREE.Mesh(geo, mat);
    result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    if (position) result.position.set(...position);
    if (scale) result.scale.set(...scale);
    parent.add(result);
    return result;
  }
  function box(parent, name, size, mat, position, radius) {
    return mesh(parent, name, boxGeometry(...size, radius), mat, position);
  }
  function joint(name, radius, mat = dark) {
    const result = new THREE.Group();
    result.name = name;
    mesh(result, `${name}-bearing`, sphere, mat, null, [radius, radius, radius]);
    const cap = mesh(result, `${name}-cap`, cylinder, silver, null,
      [radius * 0.67, radius * 1.68, radius * 0.67]);
    cap.rotation.z = Math.PI / 2;
    bodyPivot.add(result);
    return result;
  }
  function link(name, width, mat = armor) {
    const result = new THREE.Group();
    result.name = name;
    mesh(result, `${name}-piston`, cylinder, dark, null, [width * 0.28, 1, width * 0.28]);
    box(result, `${name}-armor`, [width, 0.7, width * 1.05], mat, [0, 0, 0], 0.025);
    bodyPivot.add(result);
    return result;
  }
  function alignLink(part, start, end) {
    tempDirection.subVectors(end, start);
    const length = tempDirection.length();
    part.position.copy(tempMidpoint.addVectors(start, end).multiplyScalar(0.5));
    part.quaternion.setFromUnitVectors(up, tempDirection.multiplyScalar(1 / length));
    part.scale.set(1, length, 1);
  }

  const pelvis = new THREE.Group();
  pelvis.name = 'humanoid-pelvis';
  bodyPivot.add(pelvis);
  box(pelvis, 'pelvis-armor', [0.35, 0.185, 0.25], armor, [0, 0, 0], 0.035);
  box(pelvis, 'pelvis-belt', [0.37, 0.055, 0.263], dark, [0, 0.055, 0], 0.013);
  box(pelvis, 'pelvis-buckle', [0.072, 0.047, 0.022], yellow, [0, 0.055, 0.142], 0.007);

  const torso = new THREE.Group();
  torso.name = 'humanoid-torso';
  bodyPivot.add(torso);
  box(torso, 'torso-shell', [0.44, 0.42, 0.27], armor, [0, 0, 0], 0.055);
  box(torso, 'chest-panel', [0.29, 0.18, 0.027], silver, [0, 0.035, 0.145], 0.023);
  box(torso, 'chest-accent', [0.074, 0.033, 0.02], yellow, [-0.08, 0.07, 0.165], 0.006);
  box(torso, 'chest-light', [0.045, 0.015, 0.017], visor, [0.065, 0.075, 0.166], 0.004);
  mesh(torso, 'neck-joint', cylinder, dark, [0, 0.255, 0], [0.061, 0.1, 0.061]);

  const head = new THREE.Group();
  head.name = 'humanoid-head';
  head.position.set(0, 0.39, 0);
  torso.add(head);
  box(head, 'head-shell', [0.31, 0.27, 0.26], armor, [0, 0, 0], 0.045);
  box(head, 'face-surround', [0.266, 0.137, 0.028], dark, [0, 0.009, 0.136], 0.027);
  box(head, 'visor', [0.236, 0.105, 0.019], visor, [0, 0.011, 0.157], 0.022);
  box(head, 'eye-right', [0.031, 0.025, 0.01], eye, [-0.055, 0.016, 0.17], 0.006);
  box(head, 'eye-left', [0.031, 0.025, 0.01], eye, [0.055, 0.016, 0.17], 0.006);
  box(head, 'head-yellow-tab', [0.065, 0.028, 0.065], yellow, [0.066, 0.139, -0.015], 0.009);
  for (const side of [-1, 1]) {
    mesh(head, `head-ear-${side}`, cylinder, dark, [side * 0.161, 0, 0], [0.047, 0.028, 0.047])
      .rotation.z = Math.PI / 2;
  }

  const legs = {};
  const arms = {};
  const contactPoints = {};
  const limbLengths = { thigh: 0.42, shin: 0.4, upperArm: 0.34, forearm: 0.32 };
  for (const [side, sign] of [['right', 1], ['left', -1]]) {
    // The named striking limbs occupy +x in this scene's coordinate system.
    const leg = {
      sign,
      hip: joint(`${side}Hip`, 0.076),
      knee: joint(`${side}Knee`, 0.075),
      ankle: joint(`${side}Ankle`, 0.057),
      thigh: link(`${side}Thigh`, 0.145),
      shin: link(`${side}Shin`, 0.135),
      foot: new THREE.Group(),
      hipPoint: new THREE.Vector3(),
      anklePoint: new THREE.Vector3(),
      kneePoint: new THREE.Vector3(),
    };
    leg.foot.name = `${side}Foot`;
    bodyPivot.add(leg.foot);
    box(leg.foot, `${side}Foot-shell`, [0.18, 0.09, 0.30], armor, [0, -0.045, 0.075], 0.022);
    box(leg.foot, `${side}Foot-sole`, [0.185, 0.025, 0.31], rubber, [0, -0.0925, 0.07], 0.01);
    box(leg.foot, `${side}Foot-toe`, [0.13, 0.027, 0.04], silver, [0, -0.018, 0.209], 0.007);
    const toe = new THREE.Object3D();
    toe.name = `${side}FootContact`;
    toe.position.set(0, -0.055, 0.225);
    leg.foot.add(toe);
    contactPoints[`${side}Foot`] = toe;
    legs[side] = leg;

    const arm = {
      sign,
      shoulder: joint(`${side}Shoulder`, 0.092),
      elbow: joint(`${side}Elbow`, 0.063),
      wrist: joint(`${side}Wrist`, 0.049),
      upperArm: link(`${side}UpperArm`, 0.13),
      forearm: link(`${side}Forearm`, 0.125, silver),
      hand: new THREE.Group(),
      shoulderPoint: new THREE.Vector3(),
      elbowPoint: new THREE.Vector3(),
      wristPoint: new THREE.Vector3(),
    };
    arm.hand.name = `${side}Hand`;
    bodyPivot.add(arm.hand);
    box(arm.hand, `${side}Fist-shell`, [0.135, 0.145, 0.15], armor, [0, 0, 0.02], 0.024);
    box(arm.hand, `${side}Fist-knuckles`, [0.115, 0.07, 0.027], dark, [0, 0.007, 0.097], 0.008);
    const fist = new THREE.Object3D();
    fist.name = `${side}FistContact`;
    fist.position.set(0, 0, 0.11);
    arm.hand.add(fist);
    contactPoints[`${side}Fist`] = fist;
    arms[side] = arm;
  }

  // Local knee/elbow plane selection preserves the lengths of every limb.
  const ikAxis = new THREE.Vector3();
  const ikBend = new THREE.Vector3();
  function solveJoint(start, end, firstLength, secondLength, preferredBend, result) {
    ikAxis.subVectors(end, start);
    const distance = ikAxis.length();
    ikAxis.multiplyScalar(1 / distance);
    const along = (firstLength * firstLength + distance * distance - secondLength * secondLength)
      / (2 * distance);
    const height = Math.sqrt(Math.max(0, firstLength * firstLength - along * along));
    ikBend.copy(preferredBend).addScaledVector(ikAxis, -preferredBend.dot(ikAxis)).normalize();
    result.copy(start).addScaledVector(ikAxis, along).addScaledVector(ikBend, height);
  }
  const forwardBend = new THREE.Vector3(0, 0, 1);
  const armBend = new THREE.Vector3();
  const shoulderOffset = new THREE.Vector3();
  const hipOffset = new THREE.Vector3();
  const smooth = value => value * value * (3 - 2 * value);
  const mix = THREE.MathUtils.lerp;
  function keyframes(phase, keys) {
    for (let i = 1; i < keys.length; i++) {
      if (phase <= keys[i][0]) {
        const t = smooth((phase - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
        return keys[i - 1][1].map((value, index) => mix(value, keys[i][1][index], t));
      }
    }
    return keys[keys.length - 1][1];
  }
  function walkingFoot(phase) {
    const p = ((phase % 1) + 1) % 1;
    if (p < 0.5) return [0.105, mix(0.15, -0.15, p * 2)];
    const t = (p - 0.5) * 2;
    return [0.105 + 0.135 * Math.sin(Math.PI * t), mix(-0.15, 0.15, smooth(t))];
  }

  function pose(action = 'idle', phase = 0, weight = 1) {
    if (disposed) return;
    const t = Number.isFinite(phase) ? THREE.MathUtils.clamp(phase, 0, 1) : 0;
    const wave = Math.sin(t * Math.PI * 2);
    let pelvisY = 0.87;
    let pelvisZ = 0;
    let torsoY = 1.13;
    let torsoZ = 0;
    let torsoLean = 0;
    let torsoTurn = 0;
    let bodyYaw = 0;
    let bodyJump = 0;
    let supportPivot = false;
    let strikingFootYaw = 0;
    const rightAnkle = [0.15, 0.105, -0.015];
    const leftAnkle = [-0.15, 0.105, -0.015];
    const rightWrist = [0.355, 0.65, 0.04];
    const leftWrist = [-0.355, 0.65, 0.04];

    if (action === 'roundhouse' || action === 'spinkick') {
      const spinning = action === 'spinkick';
      const amount = Math.sin(Math.PI * t) ** 2;
      const ankle = keyframes(t, spinning ? [
        [0, [0.15, 0.105, -0.015]],
        [0.16, [0.15, 0.74, -0.07]],
        [0.33, [0.28, 0.88, 0.05]],
        [0.5, [0.15, 0.825, 0.425]],
        [0.65, [0.10, 0.86, 0.23]],
        [0.82, [0.15, 0.70, -0.08]],
        [1, [0.15, 0.105, -0.015]],
      ] : [
        [0, [0.15, 0.105, -0.015]],
        [0.18, [0.37, 0.74, -0.10]],
        [0.34, [0.55, 0.85, 0.15]],
        [0.5, [0.15, 0.825, 0.425]],
        [0.66, [-0.12, 0.82, 0.35]],
        [0.82, [0.12, 0.65, -0.10]],
        [1, [0.15, 0.105, -0.015]],
      ]);
      rightAnkle.splice(0, 3, ...ankle);
      bodyYaw = keyframes(t, spinning ? [
        [0, [0]], [0.14, [-0.55]], [0.5, [Math.PI * 2]],
        [0.67, [Math.PI * 2 + 0.2]], [1, [Math.PI * 2]],
      ] : [
        [0, [0]], [0.18, [0.9]], [0.34, [0.6]],
        [0.5, [0]], [0.66, [-0.8]], [1, [0]],
      ])[0];
      supportPivot = true;
      strikingFootYaw = spinning ? 0 : keyframes(t, [
        [0, [0]], [0.30, [-0.65]], [0.5, [0]], [0.68, [0.55]], [1, [0]],
      ])[0];
      pelvisZ -= amount * 0.018;
      torsoZ -= amount * 0.05;
      torsoLean = -amount * 0.17;
      torsoTurn = (spinning ? 0.10 : -0.12) * Math.sin(t * Math.PI * 2);
      rightWrist[1] += amount * 0.31;
      rightWrist[2] += amount * 0.12;
      leftWrist[1] += amount * 0.34;
      leftWrist[2] += amount * 0.04;
    } else if (action === 'spinPunch') {
      const amount = Math.sin(Math.PI * t) ** 2;
      supportPivot = true;
      bodyYaw = keyframes(t, [
        [0, [0]], [0.12, [-0.6]], [0.5, [Math.PI * 2]], [1, [Math.PI * 2]],
      ])[0];
      torsoY -= amount * 0.05;
      torsoZ += amount * 0.12;
      torsoLean = amount * 0.27;
      const fist = keyframes(t, [
        [0, [0.355, 0.65, 0.15]],
        [0.18, [0.30, 1.13, -0.04]],
        [0.33, [0.32, 1.13, 0.02]],
        [0.5, [0.10, 0.80, 0.65]],
        [0.65, [0.08, 0.95, 0.44]],
        [0.82, [0.31, 1.03, 0.11]],
        [1, [0.355, 0.65, 0.15]],
      ]);
      rightWrist.splice(0, 3, fist[0], fist[1], fist[2] - 0.11);
      leftWrist[1] += amount * 0.35;
      leftWrist[2] += amount * 0.12;
    } else if (action === 'uppercut') {
      // Load low, make contact on the way up, then twist in the air with one
      // knee folded and the striking fist reaching above the head.
      pelvisY = keyframes(t, [
        [0, [0.87]], [0.25, [0.65]], [0.40, [0.69]], [0.5, [0.78]],
        [0.66, [0.87]], [0.78, [0.82]], [0.90, [0.71]], [1, [0.87]],
      ])[0];
      torsoY = pelvisY + 0.26;
      bodyJump = keyframes(t, [
        [0, [0]], [0.32, [0]], [0.5, [0.04]], [0.66, [0.36]],
        [0.78, [0.30]], [0.90, [0]], [1, [0]],
      ])[0];
      bodyYaw = keyframes(t, [
        [0, [0]], [0.25, [-0.10]], [0.5, [0]],
        [0.66, [Math.PI * 0.7]], [0.82, [Math.PI * 2]], [1, [Math.PI * 2]],
      ])[0];
      torsoZ = keyframes(t, [
        [0, [0]], [0.25, [0.04]], [0.5, [0.12]], [0.66, [-0.015]], [1, [0]],
      ])[0];
      torsoLean = keyframes(t, [
        [0, [0]], [0.25, [0.22]], [0.5, [0.27]], [0.66, [-0.12]], [1, [0]],
      ])[0];
      const fist = keyframes(t, [
        [0, [0.355, 0.65, 0.15]],
        [0.22, [0.24, 0.48, 0.05]],
        [0.38, [0.19, 0.57, 0.33]],
        [0.5, [0.10, 0.80, 0.65]],
        [0.66, [0.15, 2.23, 0.12]],
        [0.78, [0.20, 1.90, 0.05]],
        [0.90, [0.30, 0.85, 0.15]],
        [1, [0.355, 0.65, 0.15]],
      ]);
      rightWrist.splice(0, 3, fist[0], fist[1] - bodyJump, fist[2] - 0.11);
      const guard = smooth(Math.min(1, t / 0.15)) * smooth(Math.min(1, (1 - t) / 0.15));
      leftWrist[0] = mix(-0.355, -0.33, guard);
      leftWrist[1] = mix(0.65, torsoY - 0.15, guard);
      leftWrist[2] = mix(0.04, 0.18, guard);
      const ankle = keyframes(t, [
        [0, [0.15, 0.105, -0.015]], [0.5, [0.15, 0.105, -0.015]],
        [0.66, [0.15, 0.58, 0.25]], [0.78, [0.15, 0.44, 0.18]],
        [0.90, [0.15, 0.105, -0.015]], [1, [0.15, 0.105, -0.015]],
      ]);
      rightAnkle.splice(0, 3, ...ankle);
      leftAnkle[1] = keyframes(t, [
        [0, [0.105]], [0.5, [0.105]], [0.66, [0.16]],
        [0.78, [0.14]], [0.90, [0.105]], [1, [0.105]],
      ])[0];
    } else if (action === 'walk') {
      const rightStep = walkingFoot(t);
      const leftStep = walkingFoot(t + 0.5);
      rightAnkle[1] = rightStep[0];
      rightAnkle[2] = rightStep[1];
      leftAnkle[1] = leftStep[0];
      leftAnkle[2] = leftStep[1];
      const bob = 0.012 * Math.sin(t * Math.PI * 4) ** 2;
      pelvisY += bob;
      torsoY += bob;
      torsoLean = 0.035;
      torsoTurn = wave * 0.045;
      rightWrist[1] += 0.025;
      leftWrist[1] += 0.025;
      rightWrist[2] -= wave * 0.17;
      leftWrist[2] += wave * 0.17;
    } else if (action === 'kick') {
      // Lift behind the title before extending; the toe stays high while its
      // forward reach crosses the lower, permanent RYOSUKE row.
      const ankle = keyframes(t, [
        [0, [0.15, 0.105, -0.015]],
        [0.23, [0.15, 0.73, -0.10]],
        [0.5, [0.15, 0.825, 0.425]],
        [0.66, [0.15, 0.77, 0.20]],
        [0.82, [0.15, 0.65, -0.10]],
        [1, [0.15, 0.105, -0.015]],
      ]);
      rightAnkle.splice(0, 3, ...ankle);
      const amount = Math.sin(Math.PI * t) ** 2;
      pelvisZ -= amount * 0.018;
      torsoZ -= amount * 0.05;
      torsoLean = -amount * 0.17;
      rightWrist[1] += amount * 0.25;
      rightWrist[2] += amount * 0.11;
      leftWrist[1] += amount * 0.22;
      leftWrist[2] -= amount * 0.15;
    } else if (action === 'punch') {
      const amount = Math.sin(Math.PI * t) ** 2;
      torsoY -= amount * 0.05;
      torsoZ += amount * 0.12;
      torsoLean = amount * 0.27;
      const fist = keyframes(t, [
        [0, [0.355, 0.65, 0.15]],
        [0.22, [0.31, 1.06, -0.04]],
        [0.5, [0.10, 0.80, 0.65]],
        [0.68, [0.26, 1.00, 0.29]],
        [1, [0.355, 0.65, 0.15]],
      ]);
      rightWrist.splice(0, 3, fist[0], fist[1], fist[2] - 0.11);
      leftWrist[1] += amount * 0.27;
      leftWrist[2] += amount * 0.12;
    }

    // Weight lets a moving scene settle the walking gait into the exact neutral
    // pose at arrival, without stopping abruptly between two different poses.
    const requestedWeight = typeof weight === 'object' && weight !== null ? weight.weight : weight;
    const blend = Number.isFinite(requestedWeight) ? THREE.MathUtils.clamp(requestedWeight, 0, 1) : 1;
    pelvisY = mix(0.87, pelvisY, blend);
    pelvisZ *= blend;
    torsoY = mix(1.13, torsoY, blend);
    torsoZ *= blend;
    torsoLean *= blend;
    torsoTurn *= blend;
    bodyJump *= blend;
    bodyYaw *= blend;
    strikingFootYaw *= blend;
    for (const [point, rest] of [
      [rightAnkle, [0.15, 0.105, -0.015]],
      [leftAnkle, [-0.15, 0.105, -0.015]],
      [rightWrist, [0.355, 0.65, 0.04]],
      [leftWrist, [-0.355, 0.65, 0.04]],
    ]) {
      for (let axis = 0; axis < 3; axis++) point[axis] = mix(rest[axis], point[axis], blend);
    }

    // Normalize complete turns to the same transform as the neutral pose.
    const yaw = t === 0 || t === 1 ? 0 : Math.atan2(Math.sin(bodyYaw), Math.cos(bodyYaw));
    bodyPivot.rotation.set(0, yaw, 0);
    if (supportPivot) {
      const px = -0.15;
      const pz = -0.015;
      const cosine = Math.cos(yaw);
      const sine = Math.sin(yaw);
      bodyPivot.position.set(px - (cosine * px + sine * pz), bodyJump,
        pz - (-sine * px + cosine * pz));
    } else bodyPivot.position.set(0, bodyJump, 0);

    pelvis.position.set(0, pelvisY, pelvisZ);
    pelvis.rotation.set(0, torsoTurn * 0.5, 0);
    pelvis.updateMatrix();
    torso.position.set(0, torsoY, torsoZ);
    torso.rotation.set(torsoLean, torsoTurn, 0);
    torso.updateMatrix();
    head.rotation.y = action === 'walk' ? -torsoTurn * 0.5 : 0;

    for (const [side, ankle] of [['right', rightAnkle], ['left', leftAnkle]]) {
      const leg = legs[side];
      // Positive x is deliberately the striking side, matching the arm scene.
      const x = side === 'right' ? 0.15 : -0.15;
      leg.hipPoint.copy(hipOffset.set(x, 0, 0).applyMatrix4(pelvis.matrix));
      leg.anklePoint.set(...ankle);
      solveJoint(leg.hipPoint, leg.anklePoint, limbLengths.thigh, limbLengths.shin,
        forwardBend, leg.kneePoint);
      leg.hip.position.copy(leg.hipPoint);
      leg.knee.position.copy(leg.kneePoint);
      leg.ankle.position.copy(leg.anklePoint);
      leg.foot.position.copy(leg.anklePoint);
      leg.foot.rotation.set(0, side === 'right' ? strikingFootYaw : 0, 0);
      alignLink(leg.thigh, leg.hipPoint, leg.kneePoint);
      alignLink(leg.shin, leg.kneePoint, leg.anklePoint);
    }
    for (const [side, wrist] of [['right', rightWrist], ['left', leftWrist]]) {
      const arm = arms[side];
      const x = side === 'right' ? 0.285 : -0.285;
      arm.shoulderPoint.copy(shoulderOffset.set(x, 0.14, 0).applyMatrix4(torso.matrix));
      arm.wristPoint.set(...wrist);
      // Raise the free arm into a compact forward guard before the punch. This
      // keeps its elbow away from the parked industrial arm beside the title.
      const tuck = ['punch', 'spinPunch', 'uppercut'].includes(action) && side === 'left'
        ? smooth(Math.min(1, t / 0.12)) * smooth(Math.min(1, (1 - t) / 0.12)) * blend
        : 0;
      armBend.set(side === 'right' ? 1 : mix(-1, -0.15, tuck), 0, mix(-0.2, 1, tuck));
      if (action === 'spinPunch' && side === 'right') {
        const guard = smooth(Math.min(1, t / 0.10))
          * (1 - smooth(THREE.MathUtils.clamp((t - 0.34) / 0.10, 0, 1))) * blend;
        armBend.set(mix(1, 0.10, guard), 0, mix(-0.2, 1, guard));
      }
      solveJoint(arm.shoulderPoint, arm.wristPoint, limbLengths.upperArm, limbLengths.forearm,
        armBend, arm.elbowPoint);
      arm.shoulder.position.copy(arm.shoulderPoint);
      arm.elbow.position.copy(arm.elbowPoint);
      arm.wrist.position.copy(arm.wristPoint);
      arm.hand.position.copy(arm.wristPoint);
      alignLink(arm.upperArm, arm.shoulderPoint, arm.elbowPoint);
      alignLink(arm.forearm, arm.elbowPoint, arm.wristPoint);
    }
    group.updateMatrixWorld(true);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const value of geometries) value.dispose();
    for (const value of materials) value.dispose();
  }

  pose('idle', 0);
  return { group, pose, contactPoints, rig: { legs, arms, limbLengths, bodyPivot }, dispose };
}
