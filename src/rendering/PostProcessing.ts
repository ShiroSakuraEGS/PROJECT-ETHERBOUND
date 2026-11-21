import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * 3A 級電影後處理渲染管線 (PostProcessing)
 * 提供以太輝光 (UnrealBloom)、ACESFilmic 色調映射與自適應解析度
 */
export class PostProcessing {
  public composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    // 建立後處理合成器
    this.composer = new EffectComposer(renderer);

    // 1. 基礎渲染通道
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // 2. 以太輝光通道 (UnrealBloomPass)
    // 讓長劍光軌、完美格擋火花、Boss紅眼與以太劍氣真正發出眩目光暈！
    const bloomParams = {
      threshold: 0.75, // 高光門檻：只讓發光體與高亮度反光泛光
      strength: 1.35,  // 輝光強度：濃郁且通透的以太光弧
      radius: 0.55     // 擴散半徑
    };
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomParams.strength,
      bloomParams.radius,
      bloomParams.threshold
    );
    this.composer.addPass(this.bloomPass);

    // 3. 輸出通道 (色彩空間與 Gamma 校正)
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  public setBloomStrength(strength: number) {
    this.bloomPass.strength = strength;
  }

  public resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  public render() {
    this.composer.render();
  }
}
