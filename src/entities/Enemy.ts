import * as THREE from 'three';
import { SlashDirection } from '../combat/GestureRecognizer';
import { ModelLoader, AnimatedModelResult } from '../loaders/ModelLoader';

export enum EnemyType {
  Dummy = 'DUMMY',         // 訓練木人 (試刀)
  Soldier = 'SOLDIER',     // 巡邏以太衛兵 (破曉之劍試煉)
  VoidBoss = 'VOID_BOSS'   // 第 1 層守層 Boss: 虛空漫遊者 (Void Stalker)
}

export enum EnemyState {
  Idle,
  Patrol,
  Chase,
  Windup,
  Attack,
  Recover,
  Stagger,
  Dead
}

/**
 * 敵方單位控制器 (Enemy)
 * 具備骨骼關節步態系統 (Procedural Limb Animation) 與外部 GLB 動畫無縫整合，
 * 徹底解決「冰壺滑行」生硬感，展現真實的走路、跑步、揮刀與受擊後仰反饋！
 */
export class Enemy {
  public mesh: THREE.Group;
  public type: EnemyType;
  public state: EnemyState = EnemyState.Idle;

  public maxHealth: number = 100;
  public currentHealth: number = 100;
  public isStaggered: boolean = false;

  private stateTimer: number = 0;
  private patrolTarget = new THREE.Vector3();
  private moveSpeed = 3.8;

  // 外部 GLB 骨骼動畫模組
  private animatedResult: AnimatedModelResult | null = null;
  private modelLoader: ModelLoader;

  // 程序化關節骨架 (Procedural Articulated Skeleton)
  private torsoGroup = new THREE.Group();
  private leftLegGroup = new THREE.Group();
  private rightLegGroup = new THREE.Group();
  private leftArmGroup = new THREE.Group();
  private rightArmGroup = new THREE.Group();
  private weaponMesh: THREE.Mesh | null = null;
  private eyeGlowMesh: THREE.Mesh | null = null;

  private walkCycle: number = 0;
  private hitShakeTimer: number = 0;

  constructor(scene: THREE.Scene, type: EnemyType, startPos: THREE.Vector3) {
    this.type = type;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPos);
    this.modelLoader = new ModelLoader();

    if (type === EnemyType.Dummy) {
      this.buildDummyModel();
      this.maxHealth = 9999;
      this.currentHealth = 9999;
    } else if (type === EnemyType.Soldier) {
      this.buildSoldierModel();
      this.maxHealth = 120;
      this.currentHealth = 120;
      this.pickNewPatrolTarget();
      this.tryLoadExternalModel('/assets/models/enemy_soldier.glb', 1.85);
    } else if (type === EnemyType.VoidBoss) {
      this.buildBossModel();
      this.maxHealth = 350;
      this.currentHealth = 350;
      this.moveSpeed = 4.5;
      this.tryLoadExternalModel('/assets/models/boss.glb', 2.8);
    }

    scene.add(this.mesh);
  }

  private async tryLoadExternalModel(path: string, height: number) {
    const res = await this.modelLoader.loadAnimatedGLB(path, height);
    if (res) {
      this.animatedResult = res;
      // 替換程序化模型
      while (this.mesh.children.length > 0) {
        this.mesh.remove(this.mesh.children[0]);
      }
      this.mesh.add(res.root);
      res.playAction('idle');
    }
  }

  private buildDummyModel() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.8, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.2, 16), ironMat);
    base.position.y = 0.1;
    this.mesh.add(base);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 16), woodMat);
    body.position.y = 1.0;
    this.mesh.add(body);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.16), woodMat);
    arm.position.y = 1.35;
    this.mesh.add(arm);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), woodMat);
    head.position.y = 2.05;
    this.mesh.add(head);
  }

  /**
   * 建造以太衛兵 (具備完整的關節手臂與邁步雙腿)
   */
  private buildSoldierModel() {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.75, roughness: 0.35 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

    // 1. 軀幹核心
    this.torsoGroup.position.y = 1.0;
    this.mesh.add(this.torsoGroup);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.9, 12), armorMat);
    torso.position.y = 0.45;
    this.torsoGroup.add(torso);

    // 頭部與以太眼眸
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), armorMat);
    helm.position.y = 1.05;
    this.torsoGroup.add(helm);

    const eyeGeo = new THREE.BoxGeometry(0.22, 0.05, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.eyeGlowMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowMesh.position.set(0, 1.08, 0.19);
    this.torsoGroup.add(this.eyeGlowMesh);

    // 2. 雙腿關節 (Legs)
    const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.9, 8);
    legGeo.translate(0, -0.45, 0);

    this.leftLegGroup.position.set(-0.18, 0.9, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, innerMat);
    this.leftLegGroup.add(leftLegMesh);
    this.mesh.add(this.leftLegGroup);

    this.rightLegGroup.position.set(0.18, 0.9, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, innerMat);
    this.rightLegGroup.add(rightLegMesh);
    this.mesh.add(this.rightLegGroup);

    // 3. 雙手關節 (Arms)
    const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.8, 8);
    armGeo.translate(0, -0.38, 0);

    this.leftArmGroup.position.set(-0.42, 0.85, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, armorMat);
    this.leftArmGroup.add(leftArmMesh);
    this.torsoGroup.add(this.leftArmGroup);

    this.rightArmGroup.position.set(0.42, 0.85, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, armorMat);
    this.rightArmGroup.add(rightArmMesh);

    // 衛兵長刃
    const bladeGeo = new THREE.BoxGeometry(0.07, 1.0, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.25
    });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0, -0.65, 0.35);
    this.weaponMesh.rotation.set(0.7, 0, 0);
    this.rightArmGroup.add(this.weaponMesh);

    this.torsoGroup.add(this.rightArmGroup);
  }

  /**
   * 建造守層 Boss：虛空漫遊者 (巨大化霸體與紫黑虛空巨刃)
   */
  private buildBossModel() {
    this.mesh.scale.set(1.4, 1.4, 1.4);

    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x180b24,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x4a148c,
      emissiveIntensity: 0.4
    });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x0f0717, roughness: 0.9 });

    this.torsoGroup.position.y = 1.1;
    this.mesh.add(this.torsoGroup);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 1.1, 12), voidMat);
    torso.position.y = 0.55;
    this.torsoGroup.add(torso);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), voidMat);
    helm.position.y = 1.25;
    this.torsoGroup.add(helm);

    // 凶狠血紅裂隙眼眸 (Bloom 高亮)
    const eyeGeo = new THREE.BoxGeometry(0.28, 0.06, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.eyeGlowMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowMesh.position.set(0, 1.28, 0.25);
    this.torsoGroup.add(this.eyeGlowMesh);

    // 雙腿
    const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 1.1, 8);
    legGeo.translate(0, -0.55, 0);

    this.leftLegGroup.position.set(-0.25, 1.1, 0);
    this.leftLegGroup.add(new THREE.Mesh(legGeo, innerMat));
    this.mesh.add(this.leftLegGroup);

    this.rightLegGroup.position.set(0.25, 1.1, 0);
    this.rightLegGroup.add(new THREE.Mesh(legGeo, innerMat));
    this.mesh.add(this.rightLegGroup);

    // 雙臂與巨刃
    const armGeo = new THREE.CylinderGeometry(0.11, 0.09, 1.0, 8);
    armGeo.translate(0, -0.5, 0);

    this.leftArmGroup.position.set(-0.55, 1.05, 0);
    this.leftArmGroup.add(new THREE.Mesh(armGeo, voidMat));
    this.torsoGroup.add(this.leftArmGroup);

    this.rightArmGroup.position.set(0.55, 1.05, 0);
    this.rightArmGroup.add(new THREE.Mesh(armGeo, voidMat));

    // 虛空巨劍
    const bladeGeo = new THREE.BoxGeometry(0.14, 1.6, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x1f1f1f,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xff0055,
      emissiveIntensity: 0.55
    });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0, -0.85, 0.45);
    this.weaponMesh.rotation.set(0.75, 0, 0);
    this.rightArmGroup.add(this.weaponMesh);

    this.torsoGroup.add(this.rightArmGroup);
  }

  private pickNewPatrolTarget() {
    const r = 16 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    this.patrolTarget.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
  }

  public takeDamage(damage: number, dir: SlashDirection, isHeavy: boolean): boolean {
    this.currentHealth -= damage;
    this.hitShakeTimer = 0.18;

    // 命中受擊後仰反饋
    this.torsoGroup.rotation.x = -0.35;
    this.torsoGroup.rotation.z = (Math.random() - 0.5) * 0.3;

    if (this.currentHealth <= 0) {
      this.state = EnemyState.Dead;
      this.mesh.rotation.x = Math.PI / 2;
      this.mesh.position.y = 0.2;
      if (this.animatedResult) {
        this.animatedResult.playAction('death') || this.animatedResult.playAction('die');
      }
      return true;
    }

    if (this.state !== EnemyState.Stagger) {
      this.state = EnemyState.Chase;
    }
    return false;
  }

  public triggerParried() {
    this.isStaggered = true;
    this.state = EnemyState.Stagger;
    this.stateTimer = this.type === EnemyType.VoidBoss ? 2.5 : 1.8;

    // 身體劇烈向後彈開失衡
    this.torsoGroup.rotation.x = -0.65;
    this.rightArmGroup.rotation.x = -1.2;
    if (this.eyeGlowMesh) {
      (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffd700);
    }
  }

  public update(
    delta: number,
    time: number,
    playerPos: THREE.Vector3,
    onEnemyAttack?: (enemy: Enemy) => void
  ) {
    if (this.state === EnemyState.Dead) return;

    // 更新外部模型動畫 Mixer
    if (this.animatedResult && this.animatedResult.mixer) {
      this.animatedResult.mixer.update(delta);
    }

    if (this.type === EnemyType.Dummy) {
      if (this.hitShakeTimer > 0) {
        this.hitShakeTimer -= delta;
        this.mesh.rotation.z = Math.sin(time * 35) * 0.18;
      } else {
        this.mesh.rotation.z = 0;
      }
      return;
    }

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    if (this.hitShakeTimer > 0) {
      this.hitShakeTimer -= delta;
    } else {
      // 軀幹平滑復位
      this.torsoGroup.rotation.x = THREE.MathUtils.lerp(this.torsoGroup.rotation.x, 0, delta * 6);
      this.torsoGroup.rotation.z = THREE.MathUtils.lerp(this.torsoGroup.rotation.z, 0, delta * 6);
    }

    let isMoving = false;
    const attackRange = this.type === EnemyType.VoidBoss ? 3.8 : 2.6;

    switch (this.state) {
      case EnemyState.Idle:
      case EnemyState.Patrol:
        if (distToPlayer < 16) {
          this.state = EnemyState.Chase;
          break;
        }
        const toPatrol = new THREE.Vector3().subVectors(this.patrolTarget, this.mesh.position);
        toPatrol.y = 0;
        if (toPatrol.length() < 1.0) {
          this.pickNewPatrolTarget();
        } else {
          toPatrol.normalize();
          this.mesh.position.addScaledVector(toPatrol, this.moveSpeed * 0.5 * delta);
          this.mesh.lookAt(this.patrolTarget.x, this.mesh.position.y, this.patrolTarget.z);
          isMoving = true;
        }
        break;

      case EnemyState.Chase:
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        if (distToPlayer > attackRange) {
          toPlayer.normalize();
          this.mesh.position.addScaledVector(toPlayer, this.moveSpeed * delta);
          isMoving = true;
        } else {
          this.state = EnemyState.Windup;
          this.stateTimer = this.type === EnemyType.VoidBoss ? 0.65 : 0.55;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff1744);
          }
        }
        break;

      case EnemyState.Windup:
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        this.stateTimer -= delta;
        // 蓄力起手式：高高抬起右手刀刃
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, -1.5, delta * 10);
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Attack;
          this.stateTimer = 0.25;
          if (onEnemyAttack && distToPlayer <= attackRange + 0.8) {
            onEnemyAttack(this);
          }
        }
        break;

      case EnemyState.Attack:
        this.stateTimer -= delta;
        // 揮刀劈砍：右手手臂猛烈下劈！
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 1.25, delta * 18);
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Recover;
          this.stateTimer = this.type === EnemyType.VoidBoss ? 0.5 : 0.7;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(
              this.type === EnemyType.VoidBoss ? 0xff0055 : 0x00e5ff
            );
          }
        }
        break;

      case EnemyState.Recover:
        this.stateTimer -= delta;
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, delta * 6);
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Chase;
        }
        break;

      case EnemyState.Stagger:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Chase;
          this.isStaggered = false;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(
              this.type === EnemyType.VoidBoss ? 0xff0055 : 0x00e5ff
            );
          }
        }
        break;
    }

    // ========================================================
    // 【核心步態更新 (Procedural Limb Animation)】
    // 讓雙腿與手臂配合移動速度真實擺動，徹底告別平移滑行！
    // ========================================================
    if (isMoving) {
      this.walkCycle += delta * (this.moveSpeed * 3.2);

      // 雙腿交替邁步 (前後幅度 ±32°)
      this.leftLegGroup.rotation.x = Math.sin(this.walkCycle) * 0.58;
      this.rightLegGroup.rotation.x = -Math.sin(this.walkCycle) * 0.58;

      // 左手自然前後擺動
      this.leftArmGroup.rotation.x = -Math.sin(this.walkCycle) * 0.45;

      // 右手持武輕微擺動 (若不在攻擊蓄力狀態)
      if (this.state === EnemyState.Chase || this.state === EnemyState.Patrol) {
        this.rightArmGroup.rotation.x = Math.sin(this.walkCycle) * 0.22;
      }

      // 軀幹隨邁步節奏產生上下起伏
      const baseTorsoY = this.type === EnemyType.VoidBoss ? 1.1 : 1.0;
      this.torsoGroup.position.y = baseTorsoY + Math.abs(Math.sin(this.walkCycle)) * 0.05;
    } else if (this.state !== EnemyState.Windup && this.state !== EnemyState.Attack) {
      // 靜止時自然復位
      this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, delta * 8);
      this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, delta * 8);
      this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, delta * 8);
      if (this.state !== EnemyState.Stagger) {
        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, delta * 8);
      }
    }
  }
}
