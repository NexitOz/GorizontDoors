import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Metals = { satin: THREE.Material; polished: THREE.Material; recess: THREE.Material; rosette: THREE.Material };
export const hardwareSize = { rosette: 0.05, leverLength: 0.126, plateHeight: 0.196, plateWidth: 0.018 };
function mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = object.receiveShadow = true;
  parent.add(object); return object;
}
function roundedBox(parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], material: THREE.Material, radius = 0.001) {
  const object = mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 3))), material);
  object.position.set(...at); return object;
}
function roundedPath(width: number, height: number, radius: number, offsetY = 0) {
  const x = -width / 2, y = -height / 2 + offsetY, r = radius;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r);
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}
function screw(parent: THREE.Object3D, y: number, metals: Metals) {
  const seat = mesh(parent, new THREE.TorusGeometry(0.0025, 0.0003, 6, 20), metals.polished);
  seat.position.set(0, y, 0.0013);
  const head = mesh(parent, new THREE.CylinderGeometry(0.0022, 0.0025, 0.00065, 20), metals.satin);
  head.rotation.x = Math.PI / 2; head.position.set(0, y, 0.0013);
  for (const turn of [0, Math.PI / 2]) {
    const slot = roundedBox(parent, [0.0032, 0.00045, 0.00013], [0, y, 0.00168], metals.recess, 0.00005);
    slot.rotation.z = turn + Math.PI / 4;
  }
}
function facePlate(parent: THREE.Object3D, height: number, metals: Metals) {
  const shape = roundedPath(hardwareSize.plateWidth, height, 0.008);
  // The aperture is cut through the metal, with a recessed socket behind it.
  shape.holes.push(roundedPath(0.0108, 0.029, 0.0008, 0.012));
  mesh(parent, new THREE.ExtrudeGeometry(shape, {
    depth: 0.0011, bevelEnabled: true, bevelSize: 0.00018, bevelThickness: 0.00018,
    bevelSegments: 2, steps: 1, curveSegments: 8,
  }), metals.satin);
  roundedBox(parent, [0.011, 0.0295, 0.001], [0, 0.012, -0.0014], metals.recess, 0.0004);
  screw(parent, height / 2 - 0.012, metals); screw(parent, -height / 2 + 0.012, metals);
}
function leverGeometry() {
  // A flattened rounded section follows a continuous bent metal lever.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.020), new THREE.Vector3(0.012, -0.003, 0.037),
    new THREE.Vector3(0.034, -0.007, 0.045), new THREE.Vector3(0.074, -0.002, 0.047),
    new THREE.Vector3(hardwareSize.leverLength, 0.012, 0.037),
  ]);
  const rows = 36, sides = 16, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, centre = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    const up = new THREE.Vector3(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
    const side = new THREE.Vector3().crossVectors(tangent, up).normalize();
    for (let col = 0; col < sides; col++) {
      const a = col / sides * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), taper = 1 - t * 0.15;
      const point = centre.clone()
        .addScaledVector(up, Math.sign(c) * Math.sqrt(Math.abs(c)) * 0.006 * taper)
        .addScaledVector(side, Math.sign(s) * Math.sqrt(Math.abs(s)) * 0.0085 * taper);
      positions.push(point.x, point.y, point.z); uvs.push(t, col / sides);
      if (row < rows) {
        const a0 = row * sides + col, b0 = row * sides + (col + 1) % sides;
        indices.push(a0, b0, a0 + sides, b0, b0 + sides, a0 + sides);
      }
    }
  }
  for (let col = 1; col < sides - 1; col++) {
    indices.push(0, col + 1, col);
    const end = rows * sides; indices.push(end, end + col, end + col + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
export function addHandles(parent: THREE.Object3D, lockX: number, centreZ: number, thickness: number, handed: number, metals: Metals) {
  const moving: THREE.Group[] = [], hits: THREE.Object3D[] = [];
  for (const front of [true, false]) {
    const assembly = new THREE.Group();
    assembly.position.set(lockX, 1, centreZ + (front ? 1 : -1) * (thickness / 2 + 0.0007));
    assembly.scale.set(-handed, 1, front ? 1 : -1); parent.add(assembly);
    roundedBox(assembly, [0.051, 0.051, 0.0012], [0, 0, 0.0006], metals.recess, 0.0015);
    const rosette = roundedBox(assembly, [hardwareSize.rosette, hardwareSize.rosette, 0.0055], [0, 0, 0.0039], metals.rosette, 0.0013);
    rosette.name = 'fixed-square-rosette'; hits.push(rosette);
    const collar = mesh(assembly, new THREE.CylinderGeometry(0.0102, 0.011, 0.004, 32), metals.polished);
    collar.rotation.x = Math.PI / 2; collar.position.z = 0.008;
    const lever = new THREE.Group(); lever.position.z = 0.007; assembly.add(lever); moving.push(lever);
    lever.name = 'moving-lever';
    const hub = mesh(lever, new THREE.CylinderGeometry(0.0088, 0.0088, 0.021, 32), metals.satin);
    hub.rotation.x = Math.PI / 2; hub.position.z = 0.0105;
    const bar = mesh(lever, leverGeometry(), metals.satin); bar.name = 'curved-satin-lever'; hits.push(bar);
  }
  return { moving, hits };
}
export function addMagneticLock(parent: THREE.Object3D, edgeX: number, centreZ: number, handed: number, metals: Metals) {
  const lock = new THREE.Group();
  lock.position.set(edgeX + handed * 0.0003, 1, centreZ);
  lock.rotation.y = handed * Math.PI / 2; parent.add(lock);
  lock.name = 'edge-lock-plate'; facePlate(lock, hardwareSize.plateHeight, metals);
  const latch = roundedBox(lock, [0.0097, 0.024, 0.0036], [0, 0.012, -0.001], metals.recess, 0.0006);
  latch.name = 'magnetic-latch'; return latch;
}
export function addStrike(parent: THREE.Object3D, at: [number, number, number], handed: number, metals: Metals) {
  const strike = new THREE.Group(); strike.position.set(...at);
  strike.rotation.y = -handed * Math.PI / 2; parent.add(strike);
  strike.name = 'fixed-strike-plate'; facePlate(strike, 0.118, metals); return strike;
}

// Two mortised leaves and articulated links; dimensions are illustrative, in metres.
export function addConcealedHinge(scene: THREE.Scene, frame: THREE.Group, leaf: THREE.Group, y: number, centreZ: number, frameZ: number, handed: number, metals: Metals) {
  const fixed = new THREE.Group(), moving = new THREE.Group(), linkage = new THREE.Group();
  fixed.position.set(leaf.position.x - handed * 0.0045, y, frameZ);
  fixed.rotation.y = handed * Math.PI / 2; frame.add(fixed);
  moving.position.set(handed * 0.0003, y, centreZ);
  moving.rotation.y = -handed * Math.PI / 2; leaf.add(moving);
  scene.add(linkage); linkage.name = 'articulated-concealed-hinge';
  for (const mount of [fixed, moving]) {
    const shape = roundedPath(0.027, 0.15, 0.0135);
    shape.holes.push(roundedPath(0.022, 0.059, 0.002));
    mesh(mount, new THREE.ExtrudeGeometry(shape, { depth: 0.0015, bevelEnabled: true, bevelSize: 0.00025, bevelThickness: 0.00025, bevelSegments: 2, curveSegments: 16 }), metals.satin);
    roundedBox(mount, [0.024, 0.062, 0.010], [0, 0, -0.005], metals.recess, 0.002);
    for (const sy of [-0.055, 0.055]) screw(mount, sy, metals);
    // A pivot barrel lies in each dark mortise, underneath the rounded covers.
    const pin = mesh(mount, new THREE.CylinderGeometry(0.004, 0.004, 0.056, 24), metals.polished);
    pin.position.z = 0.002;
  }
  const links: { object: THREE.Mesh; level: number; side: number }[] = [];
  for (const level of [-0.022, 0, 0.022]) for (const side of [0, 1]) {
    const object = roundedBox(linkage, [1, 0.013, 0.010], [0, 0, 0], metals.satin, 0.003);
    links.push({ object, level, side });
  }
  const knuckle = mesh(linkage, new THREE.CylinderGeometry(0.006, 0.006, 0.061, 24), metals.polished);
  const start = new THREE.Vector3(), end = new THREE.Vector3(), elbow = new THREE.Vector3();
  function update() {
    scene.updateMatrixWorld(true);
    fixed.getWorldPosition(start); moving.getWorldPosition(end);
    const spread = Math.min(1, Math.abs(leaf.rotation.y) / (Math.PI / 2));
    elbow.copy(start).lerp(end, 0.5);
    elbow.x += handed * 0.014 * spread;
    elbow.z += (leaf.rotation.y * handed > 0 ? -1 : 1) * 0.023 * spread;
    knuckle.position.copy(elbow);
    for (const { object, level, side } of links) {
      const a = side ? elbow : start, b = side ? end : elbow;
      object.position.copy(a).lerp(b, 0.5); object.position.y += level;
      object.scale.x = Math.max(0.001, a.distanceTo(b));
      object.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    }
    linkage.visible = Math.abs(leaf.rotation.y) > 0.035;
  }
  return { update };
}
