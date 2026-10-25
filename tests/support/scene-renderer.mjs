// Keep real Three.js geometry and raycasting; replace only the GPU boundary.
export * from 'three';
import { Texture } from 'three';

export class WebGLRenderer {
  shadowMap = {};
  domElement = {
    setAttribute() {}, remove() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: this.width, height: this.height }),
  };
  setPixelRatio() {}
  setSize(width, height) { this.width = width; this.height = height; }
  render(scene, camera) {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    this.scene = scene; this.camera = camera;
  }
  dispose() {}
  forceContextLoss() {}
}

export class PMREMGenerator {
  fromScene() { return { texture: new Texture(), dispose() {} }; }
  dispose() {}
}
