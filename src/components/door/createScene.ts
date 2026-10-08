import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addHandles, addMagneticLock, addStrike, addConcealedHinge } from './hardware';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Finish, HingeSide, OpeningMode } from '../../catalog/data';
import { finishColors, demoGeometry } from '../../catalog/data';
import { signedRotation } from '../../core/door';

export type SceneOptions = { mode: OpeningMode; hinge: HingeSide; finish: Finish; profile: string; double?: boolean; exploded?: number };
export type SceneView = 'room' | 'edge' | 'lock' | 'handle' | 'hinge';
export function createDoorScene(host: HTMLElement, options: SceneOptions) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d7d0c3');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const environment = pmrem.fromScene(environmentScene);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.6;
  environmentScene.dispose(); pmrem.dispose();
  const textures: THREE.Texture[] = [];
  function texture(kind: 'stone' | 'wood' | 'floor') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const grain = kind === 'wood' ? Math.sin(x * 0.55 + Math.sin(y * 0.05) * 1.5) * 14 + Math.sin(x * 1.9) * 5 : 0;
      const value = 208 + grain + (Math.random() - 0.5) * (kind === 'floor' ? 18 : 9);
      const i = (y * 256 + x) * 4;
      pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    if (kind === 'floor') { ctx.strokeStyle = '#a79f92'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, 256, 256); }
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    if (kind === 'floor') tex.repeat.set(6, 6);
    textures.push(tex); return tex;
  }
  const stoneTexture = texture('stone'), woodTexture = texture('wood');
  const plaster = new THREE.MeshStandardMaterial({ color: '#e0d8ca', roughness: 0.93, map: stoneTexture });
  const floorMat = new THREE.MeshStandardMaterial({ color: '#c9c0b0', roughness: 0.78, map: texture('floor') });
  const profileMat = new THREE.MeshStandardMaterial({ color: options.profile, metalness: 0.65, roughness: 0.42 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: options.profile, metalness: 0.72, roughness: 0.3 });
  const satin = new THREE.MeshPhysicalMaterial({ color: '#c3c7c9', metalness: 0.9, roughness: 0.27, anisotropy: 0.35, envMapIntensity: 1.5 });
  const polished = new THREE.MeshStandardMaterial({ color: '#d3d6d6', metalness: 0.92, roughness: 0.2, envMapIntensity: 1.5 });
  const recess = new THREE.MeshStandardMaterial({ color: '#191c1d', roughness: 0.8 });
  const rosette = new THREE.MeshStandardMaterial({ color: '#ccd2d5', metalness: 0.58, roughness: 0.32, envMapIntensity: 1.3 });
  const metals = { satin, polished, recess, rosette };
  const dark = new THREE.MeshStandardMaterial({ color: '#34342d', roughness: 0.8 });
  const warm = new THREE.MeshStandardMaterial({ color: '#9a7857', map: woodTexture, roughness: 0.75 });
  const leafMat = new THREE.MeshStandardMaterial({ color: finishColors[options.finish], roughness: 0.82, map: stoneTexture });
  const glow = new THREE.MeshStandardMaterial({ color: '#ecd9b6', emissive: '#ffce84', emissiveIntensity: 1.8 });
  function box(parent: THREE.Object3D, size: [number, number, number], at: [number, number, number], material: THREE.Material) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at);
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  const hemi = new THREE.HemisphereLight('#fff7e6', '#9b9080', 2.0); scene.add(hemi);
  const light = new THREE.DirectionalLight('#fff1d6', 3.2);
  light.position.set(-2.5, 4, 4); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -3; light.shadow.camera.right = 3;
  light.shadow.camera.top = 4; light.shadow.camera.bottom = -2; light.shadow.camera.near = 0.5; light.shadow.camera.far = 12;
  light.shadow.normalBias = 0.015; light.shadow.bias = -0.0004; light.shadow.radius = 3; scene.add(light);
  const backLight = new THREE.PointLight('#ffd49a', 9, 5, 2); backLight.position.set(0.4, 2.5, -1.7); scene.add(backLight);
  const room = new THREE.Group(); scene.add(room);
  const floor = box(room, [7, 0.06, 7], [0, -0.04, -0.7], floorMat);
  floor.receiveShadow = true;
  const fullWidth = options.double ? 1.45 : demoGeometry.width;
  const height = demoGeometry.height, gap = 0.008, opening = fullWidth + gap * 2;
  const wall = new THREE.Group(); scene.add(wall);
  box(wall, [2.4, 3.2, 0.24], [-opening / 2 - 1.2, 1.6, -0.12], plaster);
  box(wall, [2.4, 3.2, 0.24], [opening / 2 + 1.2, 1.6, -0.12], plaster);
  box(wall, [opening, 0.98, 0.24], [0, 2.72, -0.12], plaster);
  const frame = new THREE.Group(); scene.add(frame);
  box(frame, [0.008, height + 0.02, 0.095], [-opening / 2 + 0.004, height / 2 + 0.008, -0.048], profileMat);
  box(frame, [0.008, height + 0.02, 0.095], [opening / 2 - 0.004, height / 2 + 0.008, -0.048], profileMat);
  box(frame, [opening, 0.008, 0.095], [0, height + 0.012, -0.048], profileMat);
  // An actual room behind the opening. No duplicate closed leaf in the background.
  box(room, [5.5, 3.0, 0.1], [0, 1.5, -2.7], plaster);
  box(room, [0.1, 3, 2.5], [-2, 1.5, -1.6], plaster);
  box(room, [1.15, 0.28, 0.65], [0.4, 0.25, -1.8], plaster);
  box(room, [1.15, 0.42, 0.15], [0.4, 0.53, -2.04], plaster);
  box(room, [0.95, 0.018, 0.95], [0.0, 0.01, -1.1], new THREE.MeshStandardMaterial({ color: '#ac9e84', roughness: 1 }));
  // Architectural shelf and console, out of the leaf swing envelope.
  box(room, [0.58, 2.95, 0.11], [1.8, 1.48, 0.035], dark);
  for (const y of [0.5, 1.06, 1.65, 2.24]) {
    box(room, [0.58, 0.025, 0.19], [1.8, y, 0.11], dark);
    box(room, [0.45, 0.007, 0.02], [1.8, y - 0.018, 0.16], glow);
    for (let i = 0; i < 4; i++) box(room, [0.036, 0.21 + (i % 2) * 0.055, 0.08], [1.65 + i * 0.055, y + 0.13, 0.105], i % 2 ? plaster : warm);
  }
  box(room, [0.72, 0.055, 0.33], [-1.7, 0.67, 0.13], dark);
  for (let i = 0; i < 13; i++) box(room, [0.019, 0.63, 0.04], [-2.01 + i * 0.05, 0.32, 0.12], warm);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.28, 16), dark);
  vase.position.set(-1.83, 0.84, 0.13); room.add(vase);
  for (let i = 0; i < 7; i++) {
    const points = [new THREE.Vector3(-1.83, 0.92, 0.13), new THREE.Vector3(-1.83 + (i - 3) * 0.045, 1.42 + (i % 3) * 0.1, 0.1)];
    room.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#605a3e' })));
  }
  // Back-room vertical accents.
  for (let i = 0; i < 14; i++) box(room, [0.018, 2.4, 0.025], [-0.1 + i * 0.055, 1.4, -2.63], warm);
  box(room, [0.85, 0.014, 0.025], [0.26, 2.65, -2.6], glow);

  const mirrors: Reflector[] = [];
  const hingeMechanisms: ReturnType<typeof addConcealedHinge>[] = [];
  let mirrored = options.finish === 'mirror';
  // Furnish the viewer's side too: this is what a closed mirror actually sees.
  box(room, [7, 3.2, 0.1], [0, 1.6, 3.4], plaster);
  box(room, [0.1, 3.2, 6], [-3.1, 1.6, 0.3], plaster);
  box(room, [0.1, 3.2, 6], [3.1, 1.6, 0.3], plaster);
  const windowMat = new THREE.MeshBasicMaterial({ color: '#e5eff3' });
  box(room, [1.4, 1.65, 0.025], [-0.65, 1.86, 3.33], dark);
  box(room, [1.30, 1.55, 0.028], [-0.65, 1.86, 3.31], windowMat);
  box(room, [0.035, 1.55, 0.04], [-0.65, 1.86, 3.28], dark);
  box(room, [1.3, 0.035, 0.04], [-0.65, 1.86, 3.28], dark);
  box(room, [1.45, 0.07, 0.40], [1.35, 0.76, 3.05], warm);
  for (const x of [0.75, 1.95]) box(room, [0.045, 0.72, 0.045], [x, 0.38, 3.05], dark);
  box(room, [0.46, 0.66, 0.028], [1.36, 1.53, 3.31], dark);
  box(room, [0.39, 0.59, 0.03], [1.36, 1.53, 3.29], warm);
  const doors: { pivot: THREE.Group; handles: THREE.Group[]; hinge: HingeSide; width: number; latch: THREE.Mesh | undefined; body: THREE.Mesh; lockX: number }[] = [];
  const hits: THREE.Object3D[] = [];
  const dimension = options.mode === 'revers' ? demoGeometry.reversThickness : demoGeometry.aversThickness;
  function leaf(width: number, hinge: HingeSide, hingeX: number) {
    const handed = hinge === 'left' ? 1 : -1;
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, 0, options.mode === 'avers' ? 0 : -dimension);
    scene.add(pivot);
    const centreZ = options.mode === 'avers' ? -dimension / 2 : dimension / 2;
    // Side faces carry the selected aluminium colour; no buried coplanar overlay.
    const body = new THREE.Mesh(new RoundedBoxGeometry(width - 0.003, height, dimension, 2, 0.0008),
      [edgeMat, edgeMat, edgeMat, edgeMat, leafMat, leafMat]);
    body.position.set(handed * width / 2, height / 2 + 0.008, centreZ);
    body.castShadow = body.receiveShadow = true; pivot.add(body);
    const edgeX = handed * (width - 0.0015);
    const lockX = handed * (width - 0.075);
    const hardware = addHandles(pivot, lockX, centreZ, dimension, handed, metals);
    const handles = hardware.moving; hits.push(...hardware.hits);
    const latch = !options.double || hinge === 'left' ? addMagneticLock(pivot, edgeX, centreZ, handed, metals) : undefined;
    for (const y of [0.35, 1.84]) hingeMechanisms.push(addConcealedHinge(scene, frame, pivot, y, centreZ, -dimension / 2, handed, metals));
    // A planar reflection renders the actual room from the reflected camera.
    for (const front of [true, false]) {
      const mirror = new Reflector(new THREE.PlaneGeometry(width - 0.005, height - 0.004), {
        color: '#f2f4f5', textureWidth: 512, textureHeight: 1024, clipBias: 0.003,
      });
      mirror.position.set(handed * width / 2, height / 2 + 0.008, centreZ + (front ? 1 : -1) * (dimension / 2 + 0.0005));
      if (!front) mirror.rotation.y = Math.PI;
      mirror.visible = mirrored; mirror.name = 'room-reflecting-mirror'; pivot.add(mirror); mirrors.push(mirror);
      const reflect = mirror.onBeforeRender;
      mirror.onBeforeRender = function (...args) {
        const visibility = mirrors.map(other => other.visible);
        for (const other of mirrors) if (other !== mirror) other.visible = false;
        try { reflect.apply(this, args); }
        finally { mirrors.forEach((other, i) => { other.visible = visibility[i]; }); }
      };
    }
    // Strike stays attached to the frame, opposite the hinge.
    if (!options.double) addStrike(frame, [hingeX + handed * (width + 0.004), 1, -dimension / 2], handed, metals);
    doors.push({ pivot, handles, hinge, width, latch, body, lockX });
    hits.push(body);
  }
  if (options.double) {
    leaf(fullWidth / 2 - 0.003, 'left', -fullWidth / 2);
    leaf(fullWidth / 2 - 0.003, 'right', fullWidth / 2);
    // The centre strike belongs to the passive leaf, never to a floating frame.
    const passive = doors[1];
    addStrike(passive.pivot, [-(passive.width - 0.0015), 1, options.mode === 'avers' ? -dimension / 2 : dimension / 2], 1, metals);
  } else leaf(fullWidth, options.hinge, options.hinge === 'left' ? -fullWidth / 2 : fullWidth / 2);

  let view: SceneView = 'room';
  function resize() {
    const width = host.clientWidth || 300, height = host.clientHeight || 350;
    camera.aspect = width / height;
    renderer.setSize(width, height, false);
    if (view === 'room') {
      camera.position.set(1.0, 1.6, camera.aspect < 0.75 ? 5.2 : 4.65);
      camera.lookAt(-0.04, 1.16, -0.22);
    }
    camera.updateProjectionMatrix();
    if (view !== 'room') setView(view, false);
  }
  const resizeObserver = new ResizeObserver(() => { resize(); render(); }); resizeObserver.observe(host);
  let expensiveFrames = 0, simplified = false;
  function render() {
    const started = performance.now(); renderer.render(scene, camera);
    if (!simplified) {
      expensiveFrames = performance.now() - started > 33 ? expensiveFrames + 1 : Math.max(0, expensiveFrames - 1);
      if (expensiveFrames >= 12) {
        simplified = true; renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
        renderer.shadowMap.enabled = false; resize();
      }
    }
  }
  function update(angle: number, handlePressed: boolean, secondAngle = angle) {
    doors.forEach((door, index) => {
      door.pivot.rotation.y = signedRotation(index === 1 ? secondAngle : angle, options.mode, door.hinge);
      // Only the lever pivots. The mounting rosette remains fixed on the leaf.
      for (const handle of door.handles) handle.rotation.z = handlePressed ? -0.22 : 0;
      if (door.latch) door.latch.position.z = (index === 1 ? secondAngle : angle) < 0.5 && !handlePressed ? 0.0027 : -0.001;
    });
    for (const mechanism of hingeMechanisms) mechanism.update();
    setView(view, false);
    render();
  }
  function setView(next: SceneView, redraw = true) {
    view = next;
    room.visible = view === 'room' || mirrored; wall.visible = view === 'room';
    const door = doors[0], handed = door.hinge === 'left' ? 1 : -1;
    if (view === 'room') resize();
    else {
      scene.updateMatrixWorld(true);
      const centreZ = options.mode === 'avers' ? -dimension / 2 : dimension / 2;
      const edge = door.pivot.localToWorld(new THREE.Vector3(handed * (door.width - 0.0015), view === 'hinge' ? 1.84 : view === 'edge' ? 1.11 : 1.0, centreZ));
      const outward = new THREE.Vector3(handed, 0, 0).applyQuaternion(door.pivot.quaternion);
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(door.pivot.quaternion);
      const target = edge.clone();
      if (view === 'lock') {
        target.addScaledVector(outward, -0.032);
        camera.position.copy(edge).addScaledVector(outward, 0.23).addScaledVector(front, 0.26); camera.position.y += 0.06;
      } else if (view === 'handle') {
        const base = door.pivot.localToWorld(new THREE.Vector3(door.lockX, 1, centreZ + dimension / 2));
        target.copy(base).addScaledVector(outward, -0.05).addScaledVector(front, 0.026);
        camera.position.copy(base).addScaledVector(outward, 0.10).addScaledVector(front, 0.30); camera.position.y += 0.04;
      } else if (view === 'edge') {
        target.addScaledVector(outward, -0.13);
        const distance = Math.max(3.6, 2.6 / camera.aspect);
        camera.position.copy(edge).addScaledVector(outward, distance * 0.86).addScaledVector(front, distance * 0.5);
      } else {
        target.copy(door.pivot.localToWorld(new THREE.Vector3(handed * 0.006, 1.84, centreZ)));
        camera.position.copy(target).addScaledVector(outward, -0.34).addScaledVector(front, 0.24); camera.position.y += 0.06;
      }
      camera.lookAt(target); camera.updateProjectionMatrix();
    }
    if (redraw) render();
  }
  function setMaterial(finish: Finish, profile: string) {
    profileMat.color.set(profile); edgeMat.color.set(profile); leafMat.color.set(finishColors[finish]);
    leafMat.map = finish === 'wood' ? woodTexture : finish === 'mirror' ? null : stoneTexture;
    leafMat.roughness = finish === 'mirror' ? 0.055 : finish === 'wood' ? 0.68 : 0.82;
    leafMat.metalness = finish === 'mirror' ? 1 : 0;
    mirrored = finish === 'mirror';
    for (const mirror of mirrors) mirror.visible = mirrored;
    room.visible = view === 'room' || mirrored;
    leafMat.needsUpdate = true; render();
  }
  function setExploded(value: number) {
    wall.position.x = -value * 0.25; frame.position.x = value * 0.05;
    doors.forEach(door => { door.pivot.position.z = (options.mode === 'avers' ? 0 : -dimension) + value * 0.55; });
    render();
  }
  function hit(clientX: number, clientY: number) {
    const rect = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera);
    return ray.intersectObjects(hits, true).length > 0;
  }
  function snapshot() { return renderer.domElement.toDataURL('image/webp', 0.85); }
  function dispose() {
    resizeObserver.disconnect();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
    for (const mirror of mirrors) mirror.dispose();
    for (const tex of textures) tex.dispose(); environment.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  resize(); setMaterial(options.finish, options.profile); update(0, false);
  return { renderer, update, render, hit, snapshot, setView, setMaterial, setExploded, dispose };
}
