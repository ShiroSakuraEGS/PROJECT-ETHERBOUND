import * as THREE from 'three';
import { SlashDirection } from './GestureRecognizer';
import { ModelLoader } from '../loaders/ModelLoader';

/**
 * 第一人稱劍身控制器 (SwordController)
 * 具備高精雕花以太長劍 (帶有符文輝光與金屬反射)，支援外部 GLB 武器模型載入
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

  public isSwinging: boolean = false;
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

  private modelLoader = new ModelLoader();

  constructor() {
    this.group = new THREE.Group();
    this.swordMesh = this.buildHighDetailSword();
    this.group.add(this.swordMesh);

    // 建立劍尖與劍顎的附著定位空物件
    this.tipMesh = new THREE.Object3D();
    this.tipMesh.position.set(0, 0.98, 0);
    this.swordMesh.add(this.tipMesh);

    this.baseMesh = new THREE.Object3D();
    this.baseMesh.position.set(0, 0.05, 0);
    this.swordMesh.add(this.baseMesh);

    this.swordMesh.position.copy(this.idlePos);
    this.swordMesh.rotation.copy(this.idleRot);

    this.tryLoadExternalSword();
  }

  private async tryLoadExternalSword() {
    const glb = await this.modelLoader.loadStaticGLB('/assets/models/sword.glb', 1.2);
    if (glb) {
      // 外部模型載入成功，保留定位點並替換幾何體
      while (this.swordMesh.children.length > 0) {
        this.swordMesh.remove(this.swordMesh.children[0]);
      }
      this.swordMesh.add(glb);
      this.swordMesh.add(this.tipMesh);
      this.swordMesh.add(this.baseMesh);
      this.tipMesh.position.set(0, 0.98, 0);
      this.baseMesh.position.set(0, 0.05, 0);
    }
  }

  /**
   * 建造高質感以太長劍 (High Detail Aether Blade)
   * 包含金屬刀刃、以太血槽發光符文、鍛金雕花護手與防滑握把
   */
  private buildHighDetailSword(): THREE.Group {
    const sword = new THREE.Group();

    // 1. 劍首 (Pommel) — 金黃色重力平衡球
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.22,
      metalness: 0.95
    });
    const pommelGeo = new THREE.SphereGeometry(0.034, 16, 16);
    const pommel = new THREE.Mesh(pommelGeo, goldMat);
    pommel.position.y = -0.22;
    sword.add(pommel);

    // 2. 劍柄 (Grip / Handle) — 深褐色皮革紋理握柄
    const handleGeo = new THREE.CylinderGeometry(0.016, 0.019, 0.22, 12);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x271e19,
      roughness: 0.8
    });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.11;
    sword.add(handle);

    // 握把防滑環節 (Rings)
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 16), goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.18 + i * 0.045;
      sword.add(ring);
    }

    // 3. 雙翼護手 (Winged Crossguard)
    const guardCenter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.045), goldMat);
    guardCenter.position.y = 0.005;
    sword.add(guardCenter);

    const wingGeo = new THREE.BoxGeometry(0.12, 0.025, 0.035);
    const leftWing = new THREE.Mesh(wingGeo, goldMat);
    leftWing.position.set(-0.09, 0.018, 0);
    leftWing.rotation.z = -0.2;
    sword.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, goldMat);
    rightWing.position.set(0.09, 0.018, 0);
    rightWing.rotation.z = 0.2;
    sword.add(rightWing);

    // 4. 精鋼劍身 (Steel Blade)
    const bladeGeo = new THREE.BoxGeometry(0.052, 0.86, 0.012);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf0fdfa,
      roughness: 0.15,
      metalness: 0.92
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.44;
    sword.add(blade);

    // 5. 劍脊發光以太血槽 (Aether Inscription - Bloom 泛光)
    const runeGeo = new THREE.BoxGeometry(0.012, 0.72, 0.015);
    const runeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff
    });
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.y = 0.44;
    sword.add(rune);

    // 6. 劍尖 (Blade Tip)
    const tipGeo = new THREE.ConeGeometry(0.036, 0.16, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.94;
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
    this.swingDuration = isHeavy ? 0.28 : 0.18;

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
        this.swingTargetPos.set(0.1, -0.1, -0.85);
        this.swingTargetRot.set(0.0, 0.0, 0.0);
        break;
    }
  }

  public update(delta: number, inStance: boolean, isBlocking: boolean, time: number) {
    if (this.isSwinging) {
      this.swingProgress += delta / this.swingDuration;
      if (this.swingProgress >= 1.0) {
        this.isSwinging = false;
        this.swingProgress = 0;
      } else {
        // 帶回彈的流暢非線性揮舞曲線
        const t = Math.sin((this.swingProgress * Math.PI) / 2);
        this.swordMesh.position.lerpVectors(this.swingStartPos, this.swingTargetPos, t);
        this.swordMesh.quaternion.slerpQuaternions(
          new THREE.Quaternion().setFromEuler(this.swingStartRot),
          new THREE.Quaternion().setFromEuler(this.swingTargetRot),
          t
        );
        return;
      }
    }

    let targetPos = this.idlePos;
    let targetRot = this.idleRot;

    if (isBlocking) {
      targetPos = this.blockPos;
      targetRot = this.blockRot;
    } else if (inStance) {
      targetPos = this.stancePos;
      targetRot = this.stanceRot;
    }

    // 呼吸律動浮動
    const breatheY = Math.sin(time * 2.2) * 0.012;
    const breatheRotZ = Math.cos(time * 1.5) * 0.015;

    const finalTargetPos = new THREE.Vector3(targetPos.x, targetPos.y + breatheY, targetPos.z);
    const finalTargetRot = new THREE.Euler(targetRot.x, targetRot.y, targetRot.z + breatheRotZ);

    this.swordMesh.position.lerp(finalTargetPos, delta * 12);
    this.swordMesh.quaternion.slerp(new THREE.Quaternion().setFromEuler(finalTargetRot), delta * 12);
  }

  public get swinging(): boolean {
    return this.isSwinging;
  }
}
