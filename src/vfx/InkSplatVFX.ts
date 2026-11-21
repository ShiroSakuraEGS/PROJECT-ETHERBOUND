import * as THREE from 'three';

/**
 * 水墨以太墨斑噴濺系統 (InkSplatVFX)
 * 參考 @shapeshift-labs/ink-studio 中的 art-ink.js 與 splat-effects.js：
 * 攻擊命中或劍氣爆發時，產生富有張力的水墨墨滴（Ink Splats），
 * 具備擴散、重力墜落與深邃墨青色階。
 */
export class InkSplatVFX {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private readonly MAX_SPLATS = 350;
  private activeCount = 0;

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.MAX_SPLATS * 3);
    this.velocities = new Float32Array(this.MAX_SPLATS * 3);
    this.colors = new Float32Array(this.MAX_SPLATS * 3);
    this.sizes = new Float32Array(this.MAX_SPLATS);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // 水墨質感的點著色材質
    const material = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.points = new THREE.Points(this.geometry, material);
    scene.add(this.points);
  }

  /**
   * 觸發水墨墨點噴射
   * @param origin 命中點
   * @param normal 方向
   * @param isEtherMagic 是否為以太高光水墨
   */
  public spawnInkBurst(origin: THREE.Vector3, normal: THREE.Vector3, isEtherMagic: boolean = false) {
    const burstCount = isEtherMagic ? 35 : 18;

    for (let i = 0; i < burstCount; i++) {
      const idx = (this.activeCount % this.MAX_SPLATS) * 3;
      const sizeIdx = this.activeCount % this.MAX_SPLATS;

      this.positions[idx] = origin.x + (Math.random() - 0.5) * 0.15;
      this.positions[idx + 1] = origin.y + (Math.random() - 0.5) * 0.15;
      this.positions[idx + 2] = origin.z + (Math.random() - 0.5) * 0.15;

      // 扇形散射速度
      const spread = normal.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.8,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 1.8
      )).normalize();

      const speed = Math.random() * 6.0 + 2.5;
      this.velocities[idx] = spread.x * speed;
      this.velocities[idx + 1] = spread.y * speed;
      this.velocities[idx + 2] = spread.z * speed;

      // 水墨調色盤：濃墨黑 (0.05, 0.08, 0.12) 與以太青 (0.0, 0.9, 1.0)
      if (isEtherMagic || Math.random() > 0.4) {
        this.colors[idx] = 0.0;     // R
        this.colors[idx + 1] = 0.85; // G (以太青墨)
        this.colors[idx + 2] = 0.95; // B
      } else {
        this.colors[idx] = 0.08;    // 濃郁墨色
        this.colors[idx + 1] = 0.12;
        this.colors[idx + 2] = 0.18;
      }

      this.sizes[sizeIdx] = Math.random() * 0.25 + 0.15;
      this.activeCount++;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public update(delta: number) {
    for (let i = 0; i < this.MAX_SPLATS; i++) {
      const idx = i * 3;
      if (this.positions[idx + 1] > 0.05) {
        this.positions[idx] += this.velocities[idx] * delta;
        this.positions[idx + 1] += this.velocities[idx + 1] * delta;
        this.positions[idx + 2] += this.velocities[idx + 2] * delta;

        // 空氣阻力與重力
        this.velocities[idx] *= 0.92;
        this.velocities[idx + 1] -= 14.0 * delta;
        this.velocities[idx + 2] *= 0.92;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
