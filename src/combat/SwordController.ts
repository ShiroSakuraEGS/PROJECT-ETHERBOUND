import * as THREE from 'three';
import { SlashDirection } from './GestureRecognizer';

/**
 * 第一人稱劍身控制器 (SwordController)
 */
export class SwordController {
  public group: THREE.Group;
  public swordMesh: THREE.Group;
  
  private idlePos = new THREE.Vector3(0.38, -0.32, -0.6);
  private idleRot = new THREE.Euler(0.1, -0.2, 0.05);

  private blockPos = new THREE.Vector3(0.0, -0.15, -0.45);
  private blockRot = new THREE.Euler(0.2, 0.4, 1.35);

  private stancePos = new THREE.Vector3(0.45, -0.25, -0.5);
  private stanceRot = new THREE.Euler(-0.2, -0.5, 0.3);

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingDuration: number = 0.22;
  private swingStartPos = new THREE.Vector3();
  private swingTargetPos = new THREE.Vector3();
  private swingStartRot = new THREE.Euler();
  private swingTargetRot = new THREE.Euler();

  // 劍刃關鍵採樣節點 (用於光軌生成)
  private tipMesh: THREE.Object3D;
  private baseMesh: THREE.Object3D;
  private tempTipWorld = new THREE.Vector3();
  private tempBaseWorld = new THREE.Vector3();

  constructor() {
    this.group = new THREE.Group();
    this.swordMesh = this.buildProceduralSword();
    this.group.add(this.swordMesh);

    // 建立劍尖與劍顎的附著定位空物件
    this.tipMesh = new THREE.Object3D();
    this.tipMesh.position.set(0, 0.95, 0);
    this.swordMesh.add(this.tipMesh);

    this.baseMesh = new THREE.Object3D();
    this.baseMesh.position.set(0, 0.05, 0);
    this.swordMesh.add(this.baseMesh);

    this.swordMesh.position.copy(this.idlePos);
    this.swordMesh.rotation.copy(this.idleRot);
  }

  private buildProceduralSword(): THREE.Group {
    const sword = new THREE.Group();

    // 1. 劍柄 (Handle)
    const handleGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.22, 12);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x1f1915,
      roughness: 0.85
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.11;
    sword.add(handle);

    // 2. 劍首 (Pommel)
    const pommelGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const pommelMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.25,
      metalness: 0.95
    });
    const pommel = new THREE.Mesh(pommelGeo, pommelMat);
    pommel.position.y = -0.22;
    sword.add(pommel);

    // 3. 護手 (Crossguard)
    const guardGeo = new THREE.BoxGeometry(0.26, 0.035, 0.045);
    const guard = new THREE.Mesh(guardGeo, pommelMat);
    guard.position.y = 0.0;
    sword.add(guard);

    // 4. 以太長劍刃 (Blade)
    const bladeGeo = new THREE.BoxGeometry(0.048, 0.88, 0.012);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      roughness: 0.12,
      metalness: 0.95,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.45
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.45;
    sword.add(blade);

    // 5. 劍尖 (Tip)
    const tipGeo = new THREE.ConeGeometry(0.034, 0.16, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.95;
    tip.rotation.y = Math.PI / 4;
    sword.add(tip);

    sword.scale.set(1.2, 1.2, 1.2);
    return sword;
  }

  public getBladeTipPosition(): THREE.Vector3 {
    this.tipMesh.getWorldPosition(this.tempTipWorld);
    return this.tempTipWorld;
  }

  public getBladeBasePosition(): THREE.Vector3 {
    this.baseMesh.getWorldPosition(this.tempBaseWorld);
    return this.tempBaseWorld;
  }

  public triggerSlash(dir: SlashDirection, isHeavy: boolean) {
    this.isSwinging = true;
    this.swingProgress = 0;
    this.swingDuration = isHeavy ? 0.30 : 0.18;

    this.swingStartPos.copy(this.swordMesh.position);
    this.swingStartRot.copy(this.swordMesh.rotation);

    switch (dir) {
      case SlashDirection.Left:
        this.swingTargetPos.set(-0.45, -0.15, -0.45);
        this.swingTargetRot.set(0.1, 0.8, -1.2);
        break;
      case SlashDirection.Right:
        this.swingTargetPos.set(0.55, -0.1, -0.45);
        this.swingTargetRot.set(-0.2, -0.9, 1.4);
        break;
      case SlashDirection.Down:
        this.swingTargetPos.set(0.1, -0.65, -0.5);
        this.swingTargetRot.set(1.5, 0.0, 0.2);
        break;
      case SlashDirection.Up:
        this.swingTargetPos.set(0.2, 0.35, -0.5);
        this.swingTargetRot.set(-1.3, 0.1, -0.4);
        break;
      case SlashDirection.Thrust:
      default:
        this.swingTargetPos.set(0.0, -0.1, -0.95);
        this.swingTargetRot.set(0.0, 0.0, 0.0);
        break;
    }
  }

  public update(delta: number, inStance: boolean, isBlocking: boolean, time: number) {
    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;
      const t = Math.min(1, this.swingProgress);
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
      let targetPos = this.idlePos;
      let targetRot = this.idleRot;

      if (isBlocking) {
        targetPos = this.blockPos;
        targetRot = this.blockRot;
      } else if (inStance) {
        targetPos = this.stancePos;
        targetRot = this.stanceRot;
      } else {
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
