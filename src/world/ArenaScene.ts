import * as THREE from 'three';

/**
 * 戰鬥訓練場場景構建器 (ArenaScene)
 * 建立 3D 中世紀石質地磚、周圍圓形石壁、火把與光照陰影
 */
export class ArenaScene {
  public scene: THREE.Scene;
  private torchLights: THREE.PointLight[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.025);

    this.setupLighting();
    this.buildEnvironment();
  }

  private setupLighting() {
    // 柔和半球環境光
    const hemiLight = new THREE.HemisphereLight(0x78909c, 0x1a237e, 0.45);
    this.scene.add(hemiLight);

    // 主月光 / 頂光
    const dirLight = new THREE.DirectionalLight(0xb0bec5, 0.85);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // 四周火把暖橘色點光源
    const torchPositions = [
      new THREE.Vector3(14, 2.5, 14),
      new THREE.Vector3(-14, 2.5, 14),
      new THREE.Vector3(14, 2.5, -14),
      new THREE.Vector3(-14, 2.5, -20)
    ];

    torchPositions.forEach((pos) => {
      const torch = new THREE.PointLight(0xff7043, 1.6, 25);
      torch.position.copy(pos);
      this.scene.add(torch);
      this.torchLights.push(torch);

      // 火把金屬基座
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.5, 8);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.8 });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(pos.x, 1.25, pos.z);
      this.scene.add(pillar);

      // 火苗發光小球
      const flameGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffab40 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, 2.55, pos.z);
      this.scene.add(flame);
    });
  }

  private buildEnvironment() {
    // 1. 地面石磚 (Ground Plane)
    const floorGeo = new THREE.CylinderGeometry(25, 25, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x212121,
      roughness: 0.75,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 內環戰鬥標記圈
    const ringGeo = new THREE.RingGeometry(18, 18.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // 2. 周圍石牆石柱 (Perimeter Pillars)
    const pillarCount = 20;
    const radius = 24.5;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const pGeo = new THREE.BoxGeometry(1.8, 5.0, 1.2);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0x263238,
        roughness: 0.9
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, 2.5, z);
      p.lookAt(0, 2.5, 0);
      p.castShadow = true;
      p.receiveShadow = true;
      this.scene.add(p);
    }
  }

  /**
   * 火把微弱動態跳動更新
   */
  public update(time: number) {
    this.torchLights.forEach((light, idx) => {
      light.intensity = 1.4 + Math.sin(time * 8 + idx * 2) * 0.35;
    });
  }
}
