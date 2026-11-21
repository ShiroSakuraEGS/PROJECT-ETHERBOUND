import * as THREE from 'three';

/**
 * 空間以太環境微粒 (AmbientParticles)
 * 參考 NixieFX 的空間粒子技術，在場景中散佈微小浮動的以太塵埃與灰燼
 */
export class AmbientParticles {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private opacities: Float32Array;
  private count: number = 300;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.opacities = new Float32Array(this.count);

    // 在競技場半徑 22 公尺內隨機散佈
    for (let i = 0; i < this.count; i++) {
      const r = Math.random() * 22;
      const theta = Math.random() * Math.PI * 2;
      this.positions[i * 3] = Math.cos(theta) * r;
      this.positions[i * 3 + 1] = Math.random() * 6.5; // 高度 0 ~ 6.5m
      this.positions[i * 3 + 2] = Math.sin(theta) * r;

      this.opacities[i] = Math.random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x80deea,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);
  }

  public update(delta: number, time: number) {
    for (let i = 0; i < this.count; i++) {
      // 緩慢向上飄動，並帶有微風擾動
      this.positions[i * 3 + 1] += delta * 0.25;
      this.positions[i * 3] += Math.sin(time * 0.8 + i) * 0.005;
      this.positions[i * 3 + 2] += Math.cos(time * 0.8 + i) * 0.005;

      // 超過頂部重置到底部
      if (this.positions[i * 3 + 1] > 6.8) {
        this.positions[i * 3 + 1] = 0.2;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
