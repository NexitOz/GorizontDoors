import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Finish, HingeSide, OpeningMode } from '../../catalog/data';
import { finishColors, demoGeometry } from '../../catalog/data';
import { signedRotation } from '../../core/door';

export type SceneOptions = { mode: OpeningMode; hinge: HingeSide; finish: Finish; profile: string; double?: boolean; exploded?: number };
export type SceneView = 'room' | 'lock' | 'hinge';
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
  scene.environmentIntensity = 0.35;
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
  const metal = new THREE.MeshStandardMaterial({ color: '#242825', metalness: 0.6, roughness: 0.32 });
  const satin = new THREE.MeshStandardMaterial({ color: '#8c918e', metalness: 0.8, roughness: 0.3 });
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
  const floor = box(scene, [7, 0.06, 7], [0, -0.04, -0.7], floorMat);
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
  box(scene, [5.5, 3.0, 0.1], [0, 1.5, -2.7], plaster);
  box(scene, [0.1, 3, 2.5], [-2, 1.5, -1.6], plaster);
  box(scene, [1.15, 0.28, 0.65], [0.4, 0.25, -1.8], plaster);
  box(scene, [1.15, 0.42, 0.15], [0.4, 0.53, -2.04], plaster);
  box(scene, [0.95, 0.018, 0.95], [0.0, 0.01, -1.1], new THREE.MeshStandardMaterial({ color: '#ac9e84', roughness: 1 }));
  // Architectural shelf and console, out of the leaf swing envelope.
  box(scene, [0.58, 2.95, 0.11], [1.8, 1.48, 0.035], dark);
  for (const y of [0.5, 1.06, 1.65, 2.24]) {
    box(scene, [0.58, 0.025, 0.19], [1.8, y, 0.11], dark);
    box(scene, [0.45, 0.007, 0.02], [1.8, y - 0.018, 0.16], glow);
    for (let i = 0; i < 4; i++) box(scene, [0.036, 0.21 + (i % 2) * 0.055, 0.08], [1.65 + i * 0.055, y + 0.13, 0.105], i % 2 ? plaster : warm);
  }
  box(scene, [0.72, 0.055, 0.33], [-1.7, 0.67, 0.13], dark);
  for (let i = 0; i < 13; i++) box(scene, [0.019, 0.63, 0.04], [-2.01 + i * 0.05, 0.32, 0.12], warm);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.28, 16), dark);
  vase.position.set(-1.83, 0.84, 0.13); scene.add(vase);
  for (let i = 0; i < 7; i++) {
    const points = [new THREE.Vector3(-1.83, 0.92, 0.13), new THREE.Vector3(-1.83 + (i - 3) * 0.045, 1.42 + (i % 3) * 0.1, 0.1)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#605a3e' })));
  }
  // Back-room vertical accents.
  for (let i = 0; i < 14; i++) box(scene, [0.018, 2.4, 0.025], [-0.1 + i * 0.055, 1.4, -2.63], warm);
  box(scene, [0.85, 0.014, 0.025], [0.26, 2.65, -2.6], glow);

  const doors: { pivot: THREE.Group; handles: THREE.Group[]; hinge: HingeSide; width: number; latch: THREE.Mesh; body: THREE.Mesh; lockX: number }[] = [];
  const hits: THREE.Object3D[] = [];
  const dimension = options.mode === 'revers' ? demoGeometry.reversThickness : demoGeometry.aversThickness;
  function leaf(width: number, hinge: HingeSide, hingeX: number) {
    const handed = hinge === 'left' ? 1 : -1;
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, 0, options.mode === 'avers' ? 0 : -dimension);
    scene.add(pivot);
    const centreZ = options.mode === 'avers' ? -dimension / 2 : dimension / 2;
    const body = box(pivot, [width - 0.003, height, dimension], [handed * width / 2, height / 2 + 0.008, centreZ], leafMat);
    const edgeX = handed * (width - 0.003);
    box(pivot, [0.003, height, dimension], [edgeX, height / 2 + 0.008, centreZ], profileMat);
    const lockX = handed * (width - 0.075);
    const handles: THREE.Group[] = [];
    for (const front of [true, false]) {
      const faceZ = centreZ + (front ? 1 : -1) * (dimension / 2 + 0.002);
      const assembly = new THREE.Group(); assembly.position.set(lockX, 1.0, faceZ); pivot.add(assembly); handles.push(assembly);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.009, 20), metal);
      base.rotation.x = Math.PI / 2; assembly.add(base);
      const bar = box(assembly, [0.115, 0.011, 0.017], [-handed * 0.05, 0, front ? 0.025 : -0.025], metal);
      hits.push(bar);
    }
    box(pivot, [0.004, 0.19, dimension * 0.75], [edgeX + handed * 0.002, 1.0, centreZ], satin);
    const latch = box(pivot, [0.004, 0.022, 0.024], [edgeX + handed * 0.005, 1.03, centreZ], metal);
    for (const y of [0.92, 1.08]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.006, 8), metal);
      screw.rotation.z = Math.PI / 2; screw.position.set(edgeX + handed * 0.005, y, centreZ); pivot.add(screw);
    }
    const hinges = new THREE.Group(); pivot.add(hinges);
    // Recessed illustrative linkage, not a claimed CAD model of a manufacturer's hinge.
    for (const y of [0.35, 1.84]) {
      box(hinges, [0.007, 0.092, dimension * 0.65], [handed * 0.003, y, centreZ], satin);
      box(hinges, [0.019, 0.045, 0.012], [handed * 0.014, y, centreZ], metal);
      box(frame, [0.007, 0.092, dimension * 0.65], [hingeX - handed * 0.005, y, -dimension / 2], satin);
    }
    // Strike stays attached to the frame, opposite the hinge.
    box(frame, [0.005, 0.17, dimension * 0.75], [hingeX + handed * (width + 0.004), 1.0, -dimension / 2], satin);
    doors.push({ pivot, handles, hinge, width, latch, body, lockX });
    hits.push(body);
  }
  if (options.double) {
    leaf(fullWidth / 2 - 0.003, 'left', -fullWidth / 2);
    leaf(fullWidth / 2 - 0.003, 'right', fullWidth / 2);
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
      for (const handle of door.handles) handle.rotation.z = handlePressed ? (door.hinge === 'left' ? -0.2 : 0.2) : 0;
      door.latch.visible = angle < 0.5 && !handlePressed;
    });
    setView(view, false);
    render();
  }
  function setView(next: SceneView, redraw = true) {
    view = next;
    const door = doors[0];
    if (view === 'room') resize();
    else {
      scene.updateMatrixWorld(true);
      const localEdgeX = view === 'lock' ? (door.hinge === 'left' ? door.width : -door.width) : 0;
      const edge = new THREE.Vector3(localEdgeX, view === 'lock' ? 1.02 : 1.84, -dimension / 2);
      door.pivot.localToWorld(edge);
      const outward = new THREE.Vector3(door.hinge === 'left' ? 1 : -1, 0, 0).applyQuaternion(door.pivot.quaternion);
      camera.position.copy(edge).addScaledVector(outward, view === 'lock' ? 0.44 : -0.5);
      camera.position.y += 0.07;
      camera.position.z += 0.14;
      camera.lookAt(edge); camera.updateProjectionMatrix();
    }
    if (redraw) render();
  }
  function setMaterial(finish: Finish, profile: string) {
    profileMat.color.set(profile); leafMat.color.set(finishColors[finish]);
    leafMat.map = finish === 'wood' ? woodTexture : finish === 'mirror' ? null : stoneTexture;
    leafMat.roughness = finish === 'mirror' ? 0.055 : finish === 'wood' ? 0.68 : 0.82;
    leafMat.metalness = finish === 'mirror' ? 1 : 0;
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
    for (const tex of textures) tex.dispose(); environment.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  }
  resize(); setMaterial(options.finish, options.profile); update(0, false);
  return { renderer, update, render, hit, snapshot, setView, setMaterial, setExploded, dispose };
}
