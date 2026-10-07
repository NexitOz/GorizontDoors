import { readLocal, writeLocal } from './storage';
import type { DoorEvent } from './door';
class SoundController {
  enabled = readLocal('gorizont:sound', 'off') === 'on';
  private context: AudioContext | undefined;
  private sources = new Set<AudioScheduledSourceNode>();
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    writeLocal('gorizont:sound', enabled ? 'on' : 'off');
    if (enabled) this.activate(); else this.stop();
  }
  activate() {
    if (!this.enabled || typeof AudioContext === 'undefined') return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
  }
  play(event: DoorEvent) {
    if (!this.enabled || document.hidden) return;
    this.activate();
    const ctx = this.context;
    if (!ctx) return;
    const length = event === 'release' ? 0.09 : 0.13;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const values = buffer.getChannelData(0);
    for (let i = 0; i < values.length; i++) {
      const t = i / ctx.sampleRate;
      values[i] = ((Math.random() - 0.5) * 0.4 + Math.sin(2 * Math.PI * (event === 'release' ? 1200 : 650) * t) * 0.3) * Math.exp(-t * 75);
    }
    const source = ctx.createBufferSource(); source.buffer = buffer;
    const gain = ctx.createGain(); gain.gain.value = 0.15;
    source.connect(gain).connect(ctx.destination);
    this.sources.add(source); source.onended = () => { this.sources.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  }
  demo(level: number, ended: () => void) {
    // A listening illustration only, deliberately unrelated to a dB reduction formula.
    this.activate();
    if (!this.enabled || !this.context) { ended(); return; }
    this.stop();
    const ctx = this.context;
    const source = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    source.type = 'triangle'; source.frequency.value = 160;
    filter.type = 'lowpass'; filter.frequency.value = [950, 650, 400][level];
    const volume = [0.07, 0.035, 0.016][level];
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(volume, ctx.currentTime + 1.2);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    source.connect(filter).connect(gain).connect(ctx.destination);
    this.sources.add(source); source.onended = () => { this.sources.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); ended(); };
    source.start(); source.stop(ctx.currentTime + 1.6);
  }
  stop() {
    for (const source of this.sources) { try { source.stop(); } catch { /* Already ended. */ } }
    this.sources.clear();
  }
}
export const sound = new SoundController();
document.addEventListener('visibilitychange', () => { if (document.hidden) sound.stop(); });
