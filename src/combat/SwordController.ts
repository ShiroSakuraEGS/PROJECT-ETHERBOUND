import * as THREE from 'three';
import { SlashDirection } from './GestureRecognizer';

/**
 * 第一人稱劍身控制器 (SwordController)
 * 控制劍身 3D 姿態插值、呼吸怠速晃動、攻擊架勢以及程序化斬擊動畫
 */
export class SwordController {
  public group: THREE.Group;
  public swordMesh: THREE.Group;
  
  // 基礎姿態位置
  private idlePos = new THREE.Vector3(0.38, -0.32, -0.6);
  private idleRot = new THREE.Euler(0.1, -0.2, 0.05);

  // 防禦姿態位置 (橫劍胸前)
  private blockPos = new THREE.Vector3(0.0, -0.15, -0.45);
  private blockRot = new THREE.Euler(0.2, 0.4, 1.35);

  // 攻擊架勢位置 (按住左鍵聚力拉後)
  private stancePos = new THREE.Vector3(0.45, -0.25, -0.5);
  private stanceRot = new THREE.Euler(-0.2, -0.5, 0.3);

  private currentPos = new THREE.Vector3();
  private currentRot = new THREE.Euler();

  // 動畫狀態控制
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingDuration: number = 0.22; // 揮刀時間 (秒)
  private swingStartPos = new THREE.Vector3();
  private swingTargetPos = new THREE.Vector3();
  private swingStartRot = new THREE.Euler();
  private swingTargetRot = new THREE.Euler();

  // 劍光軌跡粒子 / 劍刃
  private bladeTip = new THREE.Vector3();
  private bladeBase = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.swordMesh = this.buildProceduralSword();
    this.group.add(this.swordMesh);

    this.currentPos.copy(this.idlePos);
    this.currentRot.copy(this.idleRot);
    this.swordMesh.position.copy(this.currentPos);
    this.swordMesh.rotation.copy(this.currentRot);
  }

  /**
   * 建立精緻的以太長劍 3D 模型 (程序化幾何體與材質)
   */
  private buildProceduralSword(): THREE.Group {
    const sword = new THREE.Group();

    // 1. 劍柄 (Handle)
    const handleGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.22, 12);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x211c18,
      roughness: 0.8,
      metalness: 0.2
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.11;
    sword.add(handle);

    // 2. 劍首配重球 (Pommel)
    const pommelGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const pommelMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // 金色
      roughness: 0.3,
      metalness: 0.9
    });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.22;
    sword.add(pommel);

    // 3. 護手 (Crossguard)
    const guardGeo = new THREE.BoxGeometry(0.24, 0.03, 0.04);
    const guard = new THREE.Mesh(guardGeo, pommelMat);
    guard.position.y = 0.0;
    sword.add(guard);

    // 4. 以太劍身 (Blade)
    const bladeGeo = new THREE.BoxGeometry(0.045, 0.85, 0.012);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.35 // 散發以太微光
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.44;
    sword.add(blade);

    // 5. 鋒利劍尖 (Tip)
    const tipGeo = new THREE.ConeGeometry(0.032, 0.15, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.92;
    tip.rotation.y = Math.PI / 4;
    sword.add(tip);

    // 調整旋轉軸心中心
    sword.scale.set(1.2, 1.2, 1.2);
    return sword;
  }

  /**
   * 觸發揮劍斬擊動畫
   */
  public triggerSlash(dir: SlashDirection, isHeavy: boolean) {
    this.isSwinging = true;
    this.swingProgress = 0;
    this.swingDuration = isHeavy ? 0.30 : 0.18; // 重斬時間稍長更具力量感

    this.swingStartPos.copy(this.swordMesh.position);
    this.swingStartRot.copy(this.swordMesh.rotation);

    switch (dir) {
      case SlashDirection.Left: // 由右至左大橫斬
        this.swingTargetPos.set(-0.45, -0.15, -0.45);
        this.swingTargetRot.set(0.1, 0.8, -1.2);
        break;
      case SlashDirection.Right: // 由左至右反手斬
        this.swingTargetPos.set(0.55, -0.1, -0.45);
        this.swingTargetRot.set(-0.2, -0.9, 1.4);
        break;
      case SlashDirection.Down: // 當頭下劈
        this.swingTargetPos.set(0.1, -0.65, -0.5);
        this.swingTargetRot.set(1.5, 0.0, 0.2);
        break;
      case SlashDirection.Up: // 上撩斬
        this.swingTargetPos.set(0.2, 0.35, -0.5);
        this.swingTargetRot.set(-1.3, 0.1, -0.4);
        break;
      case SlashDirection.Thrust: // 直刺
      default:
        this.swingTargetPos.set(0.0, -0.1, -0.95);
        this.swingTargetRot.set(0.0, 0.0, 0.0);
        break;
    }
  }

  /**
   * 取得劍尖在世界空間中的座標 (用於打擊射線與火花生成)
   */
  public getBladeWorldPosition(): THREE.Vector3 {
    this.swordMesh.getWorldPosition(this.bladeTip);
    return this.bladeTip;
  }

  /**
   * 每幀更新姿態插值 (Update Loop)
   */
  public update(
    delta: number,
    inStance: boolean,
    isBlocking: boolean,
    time: number
  ) {
    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;
      const t = Math.min(1, this.swingProgress);
      // 緩動公式 (Ease Out Cubic)
      const ease = 1 - Math.pow(1 - t, 3);

      this.swordMesh.position.lerpVectors(this.swingStartPos, this.swingTargetPos, ease);
      this.swordMesh.quaternion.slerpQuaternions(
        new THREE.Quaternion().setFromEuler(this.swingStartRot),
        new THREE.Quaternion().setFromEuler(this.swingTargetRot),
        ease
      );

      if (t >= 1) {
        this.isSwinging = false;
      }
    } else {
      // 決定目標姿態 (防禦 > 攻擊架勢 > 平常怠速)
      let targetPos = this.idlePos;
      let targetRot = this.idleRot;

      if (isBlocking) {
        targetPos = this.blockPos;
        targetRot = this.blockRot;
      } else if (inStance) {
        targetPos = this.stancePos;
        targetRot = this.stanceRot;
      } else {
        // 自然呼吸微晃動
        const swayY = Math.sin(time * 2.5) * 0.015;
        const swayX = Math.cos(time * 1.25) * 0.01;
        targetPos = new THREE.Vector3(this.idlePos.x + swayX, this.idlePos.y + swayY, this.idlePos.z);
      }

      this.swordMesh.position.lerp(targetPos, delta * 12);
      const targetQuat = new THREE.Quaternion().setFromEuler(targetRot);
      this.swordMesh.quaternion.slerp(targetQuat, delta * 12);
    }
  }

  public get swinging(): boolean {
    return this.isSwinging;
  }
}
