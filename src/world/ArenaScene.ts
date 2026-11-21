import * as THREE from 'three';

/**
 * 戰鬥訓練場場景構建器 (ArenaScene)
 * 全面提升明亮度與大氣通透感 (告別死黑，迎接明亮史詩幻想氛圍)
 */
export class ArenaScene {
  public scene: THREE.Scene;
  private torchLights: THREE.PointLight[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    // 告別極黑背景，採用深邃透光的晨曦以太藍
    this.scene.background = new THREE.Color(0x131b26);
    // 改用線性輕柔霧氣 (35m ~ 95m)，保證中近景清晰透亮！
    this.scene.fog = new THREE.Fog(0x131b26, 35, 95);

    this.setupLighting();
    this.buildEnvironment();
  }

  private setupLighting() {
    // 1. 大幅增強半球光 (天光 + 地光漫反射)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x334155, 1.35);
    this.scene.add(hemiLight);

    // 2. 主平行光源 (明亮暖白晨光，照亮整座試煉之庭)
    const dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight.position.set(18, 35, 22);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -28;
    dirLight.shadow.camera.right = 28;
    dirLight.shadow.camera.top = 28;
    dirLight.shadow.camera.bottom = -28;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // 3. 補充環境反彈光 (Fill Light)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    fillLight.position.set(-18, 15, -18);
    this.scene.add(fillLight);

    // 4. 四周火把暖橘色點光源 (明亮溫暖)
    const torchPositions = [
      new THREE.Vector3(14, 2.5, 14),
      new THREE.Vector3(-14, 2.5, 14),
      new THREE.Vector3(14, 2.5, -14),
      new THREE.Vector3(-14, 2.5, -20)
    ];

    torchPositions.forEach((pos) => {
      const torch = new THREE.PointLight(0xff9100, 2.8, 32, 1.2);
      torch.position.copy(pos);
      this.scene.add(torch);
      this.torchLights.push(torch);

      // 火把金屬基座
      const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 2.5, 8);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.6,
        metalness: 0.4
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(pos.x, 1.25, pos.z);
      this.scene.add(pillar);

      // 火苗發光小球
      const flameGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffab00 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(pos.x, 2.55, pos.z);
      this.scene.add(flame);
    });
  }

  private buildEnvironment() {
    // 1. 地面青石地磚 (提升明度與漫反射，清晰看清木人與地磚紋理)
    const floorGeo = new THREE.CylinderGeometry(26, 26, 0.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3b4252, // 明亮的諾斯克石青色
      roughness: 0.55,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 內環戰鬥標記圈 (明亮發光)
    const ringGeo = new THREE.RingGeometry(18, 18.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    this.scene.add(ring);

    // 2. 周圍石牆石柱 (Perimeter Pillars - 增加石質雕刻感)
    const pillarCount = 20;
    const radius = 25.0;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const pGeo = new THREE.BoxGeometry(1.8, 5.5, 1.4);
      const pMat = new THREE.MeshStandardMaterial({
        color: 0x4c566a,
        roughness: 0.7,
        metalness: 0.1
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(x, 2.75, z);
      p.lookAt(0, 2.75, 0);
      p.castShadow = true;
      p.receiveShadow = true;
      this.scene.add(p);
    }
  }

  public update(time: number) {
    this.torchLights.forEach((light, idx) => {
      light.intensity = 2.4 + Math.sin(time * 7 + idx * 2) * 0.4;
    });
  }
}
