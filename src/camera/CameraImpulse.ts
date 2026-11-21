import * as THREE from 'three';

/**
 * 物理阻尼相機衝擊器 (CameraImpulse)
 * 參考 @shapeshift-labs/ink-studio 中的 camera-impulses.js 架構：
 * 採用二階物理彈簧阻尼系統 (Spring-Damper Dynamics)，
 * 為揮劍、命中重擊、彈刀與受擊提供富有彈性動量與角速度的真實反饋，
 * 徹底取代廉價的隨機數相機抖動。
 */
export class CameraImpulse {
  // 線性衝擊 (X, Y, Z 位移)
  public offset = new THREE.Vector3();
  private velocity = new THREE.Vector3();

  // 角衝擊 (Roll, Pitch, Yaw 旋轉偏轉)
  public rotationOffset = new THREE.Vector3();
  private angularVelocity = new THREE.Vector3();

  // 物理彈簧參數
  private stiffness: number = 240.0; // 彈簧勁度係數 (越大回正越快)
  private damping: number = 18.0;    // 阻尼係數 (防止過度震盪)

  /**
   * 施加線性和角衝擊
   * @param force 方向與力量向量
   * @param rotationalAngularImpact 偏轉角力矩
   */
  public addImpulse(force: THREE.Vector3, angularImpact?: THREE.Vector3) {
    this.velocity.add(force);
    if (angularImpact) {
      this.angularVelocity.add(angularImpact);
    }
  }

  /**
   * 揮劍時的微弱慣性後座力
   */
  public addSwingImpulse(dirVector: THREE.Vector2, isHeavy: boolean) {
    const scale = isHeavy ? 0.045 : 0.018;
    this.velocity.x += dirVector.x * scale;
    this.velocity.y -= Math.abs(dirVector.y) * scale * 0.5;
    this.angularVelocity.z += -dirVector.x * scale * 0.4;
  }

  /**
   * 命中敵人時的強烈頓挫後座力
   */
  public addHitImpact(isHeavy: boolean) {
    const force = isHeavy ? 0.08 : 0.035;
    this.velocity.z += force; // 鏡頭微微後挫
    this.velocity.y += (Math.random() - 0.5) * force;
    this.angularVelocity.x -= force * 0.5;
  }

  /**
   * 完美彈刀時的向後震退
   */
  public addParryImpulse() {
    this.velocity.z += 0.07;
    this.velocity.y += 0.02;
    this.angularVelocity.z += (Math.random() > 0.5 ? 1 : -1) * 0.03;
  }

  /**
   * 每幀更新二階彈簧物理計算 (Update Loop)
   */
  public update(delta: number) {
    const dt = Math.min(0.05, delta);

    // 1. 線性彈簧: a = -k*x - c*v
    const springForce = this.offset.clone().multiplyScalar(-this.stiffness);
    const dampingForce = this.velocity.clone().multiplyScalar(-this.damping);
    const accel = springForce.add(dampingForce);

    this.velocity.addScaledVector(accel, dt);
    this.offset.addScaledVector(this.velocity, dt);

    // 2. 角彈簧 (旋轉偏轉)
    const rotSpring = this.rotationOffset.clone().multiplyScalar(-this.stiffness);
    const rotDamp = this.angularVelocity.clone().multiplyScalar(-this.damping);
    const rotAccel = rotSpring.add(rotDamp);

    this.angularVelocity.addScaledVector(rotAccel, dt);
    this.rotationOffset.addScaledVector(this.angularVelocity, dt);
  }
}
