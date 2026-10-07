export type OpeningMode = 'avers' | 'revers';
export type HingeSide = 'left' | 'right';
export const MAX_DEMO_ANGLE = 85;
export function clampAngle(angle: number) {
  return Number.isFinite(angle) ? Math.min(MAX_DEMO_ANGLE, Math.max(0, angle)) : 0;
}
export function signedRotation(angle: number, mode: OpeningMode, hinge: HingeSide) {
  const towards = mode === 'avers' ? -1 : 1;
  const handed = hinge === 'left' ? 1 : -1;
  return clampAngle(angle) * Math.PI / 180 * towards * handed;
}
export function freeEdge(angle: number, mode: OpeningMode, hinge: HingeSide, width = 0.9) {
  const a = signedRotation(angle, mode, hinge);
  const localX = hinge === 'left' ? width : -width;
  return { x: (hinge === 'left' ? -width / 2 : width / 2) + Math.cos(a) * localX, z: -Math.sin(a) * localX };
}
export type DoorPhase = 'closed' | 'releasing' | 'opening' | 'open' | 'closing';
export type DoorEvent = 'release' | 'latch';
/** Events are emitted by physical state transitions, never by render frequency. */
export class DoorMotion {
  angle: number;
  target: number;
  phase: DoorPhase;
  private releaseRemaining = 0;
  private latchReleased: boolean;
  constructor(initialAngle = 0) {
    this.angle = this.target = clampAngle(initialAngle);
    this.phase = this.angle > 0 ? 'open' : 'closed';
    this.latchReleased = this.angle > 0;
  }
  command(angle: number, immediate = false): DoorEvent[] {
    const target = clampAngle(angle);
    const events: DoorEvent[] = [];
    if (target > 0 && !this.latchReleased) {
      this.latchReleased = true;
      events.push('release');
      this.releaseRemaining = immediate ? 0 : 0.14;
    }
    this.target = target;
    if (target === 0 && this.angle === 0) {
      this.releaseRemaining = 0;
      this.latchReleased = false;
    }
    if (immediate) {
      const old = this.angle;
      this.angle = target;
      this.releaseRemaining = 0;
      if (target === 0 && this.latchReleased) {
        this.latchReleased = false;
        if (old > 0) events.push('latch');
      }
    }
    this.refreshPhase();
    return events;
  }
  tick(dt: number): DoorEvent[] {
    if (this.releaseRemaining > 0) {
      this.releaseRemaining = Math.max(0, this.releaseRemaining - Math.min(dt, 0.05));
      this.refreshPhase();
      return [];
    }
    const delta = this.target - this.angle;
    this.angle += Math.sign(delta) * Math.min(Math.abs(delta), Math.max(0, Math.min(dt, 0.05)) * 84);
    const events: DoorEvent[] = [];
    if (this.angle === 0 && this.target === 0 && this.latchReleased) {
      this.latchReleased = false;
      events.push('latch');
    }
    this.refreshPhase();
    return events;
  }
  get moving() { return this.releaseRemaining > 0 || Math.abs(this.target - this.angle) > 0.001; }
  get handlePressed() { return this.phase === 'releasing'; }
  private refreshPhase() {
    this.phase = this.releaseRemaining > 0 ? 'releasing'
      : this.target > this.angle ? 'opening'
      : this.target < this.angle ? 'closing'
      : this.angle === 0 ? 'closed' : 'open';
  }
}
