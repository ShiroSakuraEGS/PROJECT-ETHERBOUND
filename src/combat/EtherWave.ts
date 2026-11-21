import * as THREE from 'three';

/**
 * 以太劍氣飛刃 (EtherWave Projectile)
 * 玩家施展 Q 鍵特殊劍技時向前激發的高速月牙形能量波
 */
export class EtherWave {
  public mesh: THREE.Group;
  public velocity: THREE.Vector3;
  public life: number = 2.0; // 存活 2 秒
  public isDead: boolean = false;
  public damage: number = 65;

  constructor(origin: THREE.Vector3, direction: THREE.Vector3) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(origin);
    this.velocity = direction.clone().normalize().multiplyScalar(24.0); // 高速推進

    // 建立發光弧形月牙刃
    const waveGeo = new THREE.TorusGeometry(0.75, 0.06, 8, 24, Math.PI * 0.9);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide
    });
    const waveMesh = new THREE.Mesh(waveGeo, waveMat);
    waveMesh.rotation.x = Math.PI / 2;
    this.mesh.add(waveMesh);

    // 內層高亮白光核心
    const coreGeo = new THREE.TorusGeometry(0.72, 0.025, 8, 24, Math.PI * 0.85);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.x = Math.PI / 2;
    this.mesh.add(coreMesh);

    // 朝向飛行方向
    this.mesh.lookAt(origin.clone().add(direction));
  }

  public update(delta: number): boolean {
    this.life -= delta;
    if (this.life <= 0) {
      this.isDead = true;
      return true;
    }

    this.mesh.position.addScaledVector(this.velocity, delta);
    // 飛行旋轉與擴散
    this.mesh.scale.multiplyScalar(1.0 + delta * 0.4);
    return false;
  }
}
