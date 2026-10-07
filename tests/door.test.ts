import test from 'node:test';
import assert from 'node:assert/strict';
import { DoorMotion, freeEdge, clampAngle, signedRotation } from '../src/core/door.ts';
import { adjacentPage, swipeDecision, validPage, visiblePages } from '../src/core/navigation.ts';
test('all four opening modes move towards the declared side of the wall', () => {
  for (const hinge of ['left', 'right'] as const) for (const angle of [30, 60, 85]) {
    assert.ok(freeEdge(angle, 'avers', hinge).z > 0);
    assert.ok(freeEdge(angle, 'revers', hinge).z < 0);
    assert.equal(Math.abs(signedRotation(angle, 'avers', hinge)), Math.abs(signedRotation(angle, 'revers', hinge)));
  }
});
test('the hinge is fixed and the free edge stays on a circle with the actual leaf width', () => {
  for (const hinge of ['left', 'right'] as const) for (const mode of ['avers', 'revers'] as const) {
    const pivot = hinge === 'left' ? -0.45 : 0.45;
    for (const angle of [0, 30, 60, 85]) {
      const edge = freeEdge(angle, mode, hinge);
      assert.ok(Math.abs(Math.hypot(edge.x - pivot, edge.z) - 0.9) < 1e-10);
    }
  }
});
test('angles cannot exceed the demo range or become non-finite', () => {
  assert.equal(clampAngle(999), 85); assert.equal(clampAngle(-4), 0); assert.equal(clampAngle(NaN), 0);
});
test('release precedes motion and repeated commands emit no duplicate clicks', () => {
  const m = new DoorMotion(); assert.deepEqual(m.command(72), ['release']);
  assert.equal(m.phase, 'releasing'); assert.deepEqual(m.command(72), []);
  m.tick(0.05); assert.equal(m.angle, 0);
  for (let i = 0; i < 40; i++) m.tick(0.05);
  assert.equal(m.angle, 72); assert.equal(m.phase, 'open');
  assert.deepEqual(m.command(0), []);
  const events = Array.from({ length: 40 }, () => m.tick(0.05)).flat();
  assert.deepEqual(events, ['latch']); assert.equal(m.phase, 'closed');
  assert.deepEqual(m.tick(0.05), []);
});
test('reversing a running animation starts from the current angle without a jump', () => {
  const m = new DoorMotion(40); m.command(85); m.tick(0.05);
  const angle = m.angle; m.command(0); assert.equal(m.angle, angle);
  m.tick(0.05); assert.ok(m.angle < angle); assert.equal(m.phase, 'closing');
});
test('restoring a previously open scene does not emit sounds', () => {
  const m = new DoorMotion(55); assert.equal(m.angle, 55);
  assert.deepEqual(m.tick(0.01), []); assert.deepEqual(m.command(55), []);
});
test('cancelled release does not create a false closing sound', () => {
  const m = new DoorMotion(); m.command(72); m.command(0);
  assert.equal(m.phase, 'closed'); assert.deepEqual(m.tick(0.05), []);
});
test('spread pagination preserves the original 11 pages', () => {
  assert.deepEqual(visiblePages(1, true), [1]); assert.deepEqual(visiblePages(3, true), [2, 3]);
  assert.deepEqual(visiblePages(10, true), [10]);
  assert.deepEqual(visiblePages(11, true), [11]);
  assert.equal(adjacentPage(3, true, 1), 4);
  assert.equal(adjacentPage(4, true, -1), 3);
  assert.equal(adjacentPage(11, true, 1), 11);
  assert.equal(adjacentPage(1, false, -1), 1);
});
test('vertical scroll and small taps never become page swipes', () => {
  assert.equal(swipeDecision(5, 1, 20, 390), 0);
  assert.equal(swipeDecision(90, 100, 300, 390), 0);
  assert.equal(swipeDecision(-120, 3, 350, 390), 1);
  assert.equal(swipeDecision(120, 3, 350, 390), -1);
  assert.equal(swipeDecision(-50, 2, 50, 390), 1);
});
test('invalid shared page links are handled safely', () => {
  for (const bad of [null, undefined, 'foo', '-3', '50', 1.5]) assert.equal(validPage(bad), 1);
  assert.equal(validPage('5'), 5);
});
