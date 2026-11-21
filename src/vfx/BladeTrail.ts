import * as THREE from 'three';

/**
 * 劍刃動態光軌管理器 (BladeTrail)
 * 參考 NixieFX / Unity Ribbon Trail 架構：
 * 每幀記錄劍尖 (Tip) 與劍顎 (Base) 兩個點的世界座標，
 * 動態重建雙面四邊形三角網格，實現劍刃揮砍時的流暢半透明漸變光帶。
 */
export class BladeTrail {
  public mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private uvs: Float32Array;
  private colors: Float32Array;

  private readonly MAX_POINTS = 24; // 軌跡節點上限
  private points: { tip: THREE.Vector3; base: THREE.Vector3; age: number }[] = [];
  private readonly TRAIL_LIFETIME = 0.22; // 光軌殘留時間 (秒)

  constructor(scene: THREE.Scene) {
    const vertexCount = this.MAX_POINTS * 2;
    this.positions = new Float32Array(vertexCount * 3);
    this.uvs = new Float32Array(vertexCount * 2);
    this.colors = new Float32Array(vertexCount * 4); // RGBA

    // 預建索引 (三角形帶)
    const indices: number[] = [];
    for (let i = 0; i < this.MAX_POINTS - 1; i++) {
      const p1 = i * 2;
      const p2 = i * 2 + 1;
      const p3 = (i + 1) * 2;
      const p4 = (i + 1) * 2 + 1;

      indices.push(p1, p2, p3);
      indices.push(p2, p4, p3);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setIndex(indices);

    // 以太發光漸層材質
    const material = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /**
   * 採樣當前幀的劍刃位置
   */
  public addSample(tipWorldPos: THREE.Vector3, baseWorldPos: THREE.Vector3, isSwinging: boolean) {
    if (!isSwinging) {
      return;
    }

    this.points.unshift({
      tip: tipWorldPos.clone(),
      base: baseWorldPos.clone(),
      age: 0
    });

    if (this.points.length > this.MAX_POINTS) {
      this.points.pop();
    }
  }

  /**
   * 每幀更新節點年齡與重構動態幾何頂點
   */
  public update(delta: number) {
    // 增加年齡並剔除過期點
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age += delta;
      if (this.points[i].age >= this.TRAIL_LIFETIME) {
        this.points.splice(i, 1);
      }
    }

    const n = this.points.length;
    for (let i = 0; i < this.MAX_POINTS; i++) {
      const idx = i * 2;
      if (i < n) {
        const p = this.points[i];
        const alpha = Math.max(0, 1.0 - p.age / this.TRAIL_LIFETIME);

        // 劍尖頂點
        this.positions[idx * 3] = p.tip.x;
        this.positions[idx * 3 + 1] = p.tip.y;
        this.positions[idx * 3 + 2] = p.tip.z;

        // 劍顎頂點
        this.positions[(idx + 1) * 3] = p.base.x;
        this.positions[(idx + 1) * 3 + 1] = p.base.y;
        this.positions[(idx + 1) * 3 + 2] = p.base.z;

        // 頂點顏色與透明度漸層
        for (let v = 0; v < 2; v++) {
          const cIdx = (idx + v) * 4;
          this.colors[cIdx] = 0.2;     // R
          this.colors[cIdx + 1] = 0.9; // G
          this.colors[cIdx + 2] = 1.0; // B
          this.colors[cIdx + 3] = alpha * 0.85; // A
        }
      } else {
        // 多餘的頂點折疊至原點
        this.positions[idx * 3] = 0;
        this.positions[idx * 3 + 1] = 0;
        this.positions[idx * 3 + 2] = 0;
        this.positions[(idx + 1) * 3] = 0;
        this.positions[(idx + 1) * 3 + 1] = 0;
        this.positions[(idx + 1) * 3 + 2] = 0;

        for (let v = 0; v < 2; v++) {
          const cIdx = (idx + v) * 4;
          this.colors[cIdx + 3] = 0;
        }
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}
