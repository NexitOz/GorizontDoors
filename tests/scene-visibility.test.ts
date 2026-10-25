import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Raycaster, Vector3 } from 'three';

const sceneUrl = new URL('../src/components/door/createScene.ts', import.meta.url).href;
const harnessUrl = new URL('./support/scene-renderer.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'three' && context.parentURL === sceneUrl) return nextResolve(harnessUrl, context);
    if (specifier.startsWith('.') && context.parentURL?.includes('/src/') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(specifier + '.ts', context);
    }
    return nextResolve(specifier, context);
  },
});

// Procedural textures need pixel storage, but no browser or WebGL context.
Object.assign(globalThis, {
  devicePixelRatio: 1,
  document: { createElement: () => ({
    getContext: () => ({
      createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
      putImageData() {}, strokeRect() {},
    }),
  }) },
  ResizeObserver: class { observe() {} disconnect() {} },
});
const { createDoorScene } = await import('../src/components/door/createScene.ts');

function visible(object: any): boolean {
  return object.visible && (!object.parent || visible(object.parent));
}
function renderedScene(width: number, height: number, options: Record<string, unknown> = {}) {
  const host = { clientWidth: width, clientHeight: height, appendChild() {} } as unknown as HTMLElement;
  const engine = createDoorScene(host, { mode: 'avers', hinge: 'left', finish: 'stone', profile: '#242a27', ...options });
  const renderer = engine.renderer as any;
  return { engine, scene: renderer.scene, camera: renderer.camera };
}
function assertLeavesVisible(scene: any, camera: any, label: string) {
  scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  const leaves: any[] = [];
  scene.traverse((object: any) => { if (object.isMesh && Array.isArray(object.material)) leaves.push(object); });
  assert.ok(leaves.length > 0, 'Actual door geometry must exist');
  for (const leaf of leaves) {
    const target = leaf.getWorldPosition(new Vector3());
    const ray = new Raycaster(camera.position, target.sub(camera.position).normalize());
    const first = ray.intersectObjects(scene.children, true).find(hit => visible(hit.object));
    assert.ok(first?.object === leaf, `${label}: the camera must see the door, rather than an intervening wall`);
  }
}

for (const [label, width, height] of [
  ['mobile comparison', 150, 225], ['mobile collection', 340, 305], ['desktop collection', 464, 278],
] as const) {
  for (const mode of ['avers', 'revers'] as const) for (const hinge of ['left', 'right'] as const) {
    test(`${label}: ${mode}, hinges ${hinge}, closed door is visible`, () => {
      const { engine, scene, camera } = renderedScene(width, height, { mode, hinge });
      try { assertLeavesVisible(scene, camera, label); } finally { engine.dispose(); }
    });
  }
}

test('both leaves of the double door remain visible after a resize', () => {
  const { engine, scene, camera } = renderedScene(340, 305, { double: true });
  try {
    assertLeavesVisible(scene, camera, 'double door');
    engine.setView('lock'); engine.setView('room');
    assertLeavesVisible(scene, camera, 'return from detail');
  } finally { engine.dispose(); }
});

test('the room behind the viewer remains available for mirror reflections', () => {
  const { engine, scene, camera } = renderedScene(150, 225, { finish: 'mirror' });
  try {
    const mirror = scene.getObjectByName('room-reflecting-mirror');
    assert.ok(mirror && visible(mirror));
    const reflection = new Raycaster(new Vector3(0, 1.5, 0.01), new Vector3(0, 0, 1));
    const backdrop = reflection.intersectObjects(scene.children, true).find(hit => visible(hit.object));
    assert.ok(backdrop, 'The mirror must retain a furnished room to reflect');
    assert.ok(backdrop.point.z > camera.position.z, 'The reflection backdrop must be behind the viewing camera');
  } finally { engine.dispose(); }
});
