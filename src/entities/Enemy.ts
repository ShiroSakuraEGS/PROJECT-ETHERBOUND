import * as THREE from 'three';
import { SlashDirection } from '../combat/GestureRecognizer';

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

  private eyeGlowMesh: THREE.Mesh | null = null;
  private weaponMesh: THREE.Mesh | null = null;
  private hitShakeTimer: number = 0;

  constructor(scene: THREE.Scene, type: EnemyType, startPos: THREE.Vector3) {
    this.type = type;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPos);

    if (type === EnemyType.Dummy) {
      this.buildDummyModel();
      this.maxHealth = 9999;
      this.currentHealth = 9999;
    } else if (type === EnemyType.Soldier) {
      this.buildSoldierModel();
      this.maxHealth = 120;
      this.currentHealth = 120;
      this.pickNewPatrolTarget();
    } else if (type === EnemyType.VoidBoss) {
      this.buildBossModel();
      this.maxHealth = 350;
      this.currentHealth = 350;
      this.moveSpeed = 4.5;
    }

    scene.add(this.mesh);
  }

  private buildDummyModel() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
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

  private buildSoldierModel() {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7, roughness: 0.4 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 1.1, 12), armorMat);
    torso.position.y = 1.15;
    this.mesh.add(torso);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), armorMat);
    helm.position.y = 1.85;
    this.mesh.add(helm);

    const eyeGeo = new THREE.BoxGeometry(0.24, 0.05, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.eyeGlowMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowMesh.position.set(0, 1.88, 0.22);
    this.mesh.add(this.eyeGlowMesh);

    const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.9 });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0.45, 1.2, 0.35);
    this.weaponMesh.rotation.set(0.4, 0, -0.3);
    this.mesh.add(this.weaponMesh);
  }

  /**
   * 建造第 1 層守層 Boss：虛空漫遊者 (Void Stalker)
   */
  private buildBossModel() {
    // 巨大化 1.5 倍
    this.mesh.scale.set(1.5, 1.5, 1.5);

    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a2a, // 深虛空紫黑
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x4a148c,
      emissiveIntensity: 0.3
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.32, 1.3, 12), voidMat);
    torso.position.y = 1.25;
    this.mesh.add(torso);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), voidMat);
    helm.position.y = 2.05;
    this.mesh.add(helm);

    // 凶狠血紅裂隙眼眸
    const eyeGeo = new THREE.BoxGeometry(0.3, 0.06, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.eyeGlowMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowMesh.position.set(0, 2.08, 0.28);
    this.mesh.add(this.eyeGlowMesh);

    // 巨型虛空巨劍 (Void Greatsword)
    const bladeGeo = new THREE.BoxGeometry(0.12, 1.6, 0.03);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x212121,
      metalness: 0.95,
      emissive: 0xff0055,
      emissiveIntensity: 0.4
    });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0.65, 1.4, 0.45);
    this.weaponMesh.rotation.set(0.5, 0, -0.25);
    this.mesh.add(this.weaponMesh);
  }

  private pickNewPatrolTarget() {
    const r = 16 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    this.patrolTarget.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
  }

  public takeDamage(amount: number, dir: SlashDirection, isHeavy: boolean): boolean {
    if (this.state === EnemyState.Dead) return false;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.hitShakeTimer = 0.15;

    if (isHeavy || this.state === EnemyState.Windup) {
      this.state = EnemyState.Stagger;
      this.stateTimer = this.type === EnemyType.VoidBoss ? 0.8 : 1.2;
      if (this.eyeGlowMesh) {
        (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
      }
    }

    if (this.currentHealth <= 0 && this.type !== EnemyType.Dummy) {
      this.state = EnemyState.Dead;
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.position.y = 0.2;
      return true;
    }

    return false;
  }

  public triggerParried() {
    this.state = EnemyState.Stagger;
    this.stateTimer = this.type === EnemyType.VoidBoss ? 1.4 : 2.0;
    this.isStaggered = true;
    if (this.eyeGlowMesh) {
      (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    }
    this.mesh.rotation.x = -0.4;
  }

  public update(delta: number, playerPos: THREE.Vector3, onEnemyAttack?: (enemy: Enemy) => void) {
    if (this.type === EnemyType.Dummy || this.state === EnemyState.Dead) return;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    toPlayer.y = 0;
    const distToPlayer = toPlayer.length();

    if (this.hitShakeTimer > 0) {
      this.hitShakeTimer -= delta;
      this.mesh.position.x += (Math.random() - 0.5) * 0.04;
    }

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
        }
        break;

      case EnemyState.Chase:
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        if (distToPlayer > attackRange) {
          toPlayer.normalize();
          this.mesh.position.addScaledVector(toPlayer, this.moveSpeed * delta);
        } else {
          this.state = EnemyState.Windup;
          this.stateTimer = this.type === EnemyType.VoidBoss ? 0.65 : 0.55;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff1744);
          }
          if (this.weaponMesh) {
            this.weaponMesh.rotation.set(-0.9, 0, 0.4);
          }
        }
        break;

      case EnemyState.Windup:
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Attack;
          this.stateTimer = 0.25;
          if (this.weaponMesh) {
            this.weaponMesh.rotation.set(1.3, 0, -0.6);
          }
          if (onEnemyAttack && distToPlayer <= attackRange + 0.8) {
            onEnemyAttack(this);
          }
        }
        break;

      case EnemyState.Attack:
        this.stateTimer -= delta;
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
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Chase;
        }
        break;

      case EnemyState.Stagger:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Chase;
          this.mesh.rotation.x = 0;
          this.isStaggered = false;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(
              this.type === EnemyType.VoidBoss ? 0xff0055 : 0x00e5ff
            );
          }
        }
        break;
    }
  }
}
