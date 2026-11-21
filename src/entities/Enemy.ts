import * as THREE from 'three';
import { SlashDirection } from '../combat/GestureRecognizer';

export enum EnemyType {
  Dummy = 'DUMMY',     // 訓練木人 (不動、高防、試刀用)
  Soldier = 'SOLDIER'  // 巡邏以太衛兵 (主動追擊、蓄力紅光、攻擊玩家)
}

export enum EnemyState {
  Idle,
  Patrol,
  Chase,
  Windup,  // 攻擊前搖預警 (亮起紅光)
  Attack,  // 挥刀出招
  Recover, // 後搖硬直
  Stagger, // 被格擋彈刀後的失去平衡硬直
  Dead
}

/**
 * 敵方單位控制器 (Enemy)
 * 實作狀態機 AI、NavMesh 式尋路追逐、前搖攻擊預兆、受擊硬直與傷害判定
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

  // 眼睛紅光預警網格
  private eyeGlowMesh: THREE.Mesh | null = null;
  private weaponMesh: THREE.Mesh | null = null;

  // 受擊晃動動畫暫存
  private hitShakeTimer: number = 0;

  constructor(scene: THREE.Scene, type: EnemyType, startPos: THREE.Vector3) {
    this.type = type;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(startPos);

    if (type === EnemyType.Dummy) {
      this.buildDummyModel();
      this.maxHealth = 9999;
      this.currentHealth = 9999;
    } else {
      this.buildSoldierModel();
      this.maxHealth = 120;
      this.currentHealth = 120;
      this.pickNewPatrolTarget();
    }

    scene.add(this.mesh);
  }

  /**
   * 建造訓練木人模型
   */
  private buildDummyModel() {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.9 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x455a64, metalness: 0.8, roughness: 0.3 });

    // 底座
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.2, 16), ironMat);
    base.position.y = 0.1;
    this.mesh.add(base);

    // 主幹身軀
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 16), woodMat);
    body.position.y = 1.0;
    this.mesh.add(body);

    // 橫向木臂 (標註斬擊方向)
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.16), woodMat);
    arm.position.y = 1.35;
    this.mesh.add(arm);

    // 頭部
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), woodMat);
    head.position.y = 2.05;
    this.mesh.add(head);
  }

  /**
   * 建造以太衛兵模型
   */
  private buildSoldierModel() {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.7, roughness: 0.4 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8 });

    // 身體
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 1.1, 12), armorMat);
    torso.position.y = 1.15;
    this.mesh.add(torso);

    // 頭盔
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), armorMat);
    helm.position.y = 1.85;
    this.mesh.add(helm);

    // 預警紅光眼罩 (Windup 攻擊前蓄力會亮起)
    const eyeGeo = new THREE.BoxGeometry(0.24, 0.05, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff }); // 平常微弱藍光
    this.eyeGlowMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeGlowMesh.position.set(0, 1.88, 0.22);
    this.mesh.add(this.eyeGlowMesh);

    // 敵人手持以太長刀
    const bladeGeo = new THREE.BoxGeometry(0.06, 0.95, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.9 });
    this.weaponMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.weaponMesh.position.set(0.45, 1.2, 0.35);
    this.weaponMesh.rotation.set(0.4, 0, -0.3);
    this.mesh.add(this.weaponMesh);
  }

  private pickNewPatrolTarget() {
    const r = 16 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    this.patrolTarget.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
  }

  /**
   * 承受玩家劍術攻擊
   */
  public takeDamage(amount: number, dir: SlashDirection, isHeavy: boolean): boolean {
    if (this.state === EnemyState.Dead) return false;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.hitShakeTimer = 0.15;

    // 如果遭受重斬或在攻擊前搖被打中，觸發中斷硬直
    if (isHeavy || this.state === EnemyState.Windup) {
      this.state = EnemyState.Stagger;
      this.stateTimer = 1.2; // 陷入 1.2 秒硬直
      if (this.eyeGlowMesh) {
        (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
      }
    }

    if (this.currentHealth <= 0 && this.type !== EnemyType.Dummy) {
      this.state = EnemyState.Dead;
      // 倒下動畫旋轉
      this.mesh.rotation.x = -Math.PI / 2;
      this.mesh.position.y = 0.2;
      return true;
    }

    return false;
  }

  /**
   * 被玩家完美格擋彈刀 (Trigger Parry Stagger)
   */
  public triggerParried() {
    this.state = EnemyState.Stagger;
    this.stateTimer = 2.0; // 陷入長達 2 秒的極大硬直！
    this.isStaggered = true;
    if (this.eyeGlowMesh) {
      (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
    }
    // 踉蹌向後仰
    this.mesh.rotation.x = -0.4;
  }

  /**
   * 敵人 AI 邏輯更新 (Update Loop)
   */
  public update(delta: number, playerPos: THREE.Vector3, onEnemyAttack?: (enemy: Enemy) => void) {
    if (this.type === EnemyType.Dummy || this.state === EnemyState.Dead) return;

    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
    toPlayer.y = 0; // 水平距離
    const distToPlayer = toPlayer.length();

    // 受擊震動恢復
    if (this.hitShakeTimer > 0) {
      this.hitShakeTimer -= delta;
      this.mesh.position.x += (Math.random() - 0.5) * 0.04;
    }

    switch (this.state) {
      case EnemyState.Idle:
      case EnemyState.Patrol:
        // 進入 14 公尺警戒範圍 -> 開始追擊
        if (distToPlayer < 14) {
          this.state = EnemyState.Chase;
          break;
        }
        // 巡邏移動
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
        // 鎖定面向玩家
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);

        if (distToPlayer > 2.6) {
          // 靠近玩家
          toPlayer.normalize();
          this.mesh.position.addScaledVector(toPlayer, this.moveSpeed * delta);
        } else {
          // 進入近身戰鬥距離 -> 開始攻擊前搖 (Windup)
          this.state = EnemyState.Windup;
          this.stateTimer = 0.55; // 0.55 秒前搖蓄力，給予玩家反應時間
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0xff1744); // 亮起危險紅光！
          }
          if (this.weaponMesh) {
            this.weaponMesh.rotation.set(-0.8, 0, 0.4); // 舉刀架勢
          }
        }
        break;

      case EnemyState.Windup:
        // 蓄力前搖中
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          // 前搖結束，揮刀出擊！
          this.state = EnemyState.Attack;
          this.stateTimer = 0.25;
          if (this.weaponMesh) {
            this.weaponMesh.rotation.set(1.2, 0, -0.6); // 斬下
          }
          if (onEnemyAttack && distToPlayer <= 3.2) {
            onEnemyAttack(this);
          }
        }
        break;

      case EnemyState.Attack:
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = EnemyState.Recover;
          this.stateTimer = 0.7; // 0.7 秒收刀後搖
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00e5ff); // 恢復平常
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
          this.mesh.rotation.x = 0; // 恢復直立姿態
          this.isStaggered = false;
          if (this.eyeGlowMesh) {
            (this.eyeGlowMesh.material as THREE.MeshBasicMaterial).color.setHex(0x00e5ff);
          }
        }
        break;
    }
  }
}
