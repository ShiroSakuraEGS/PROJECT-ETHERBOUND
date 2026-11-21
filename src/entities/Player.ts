import * as THREE from 'three';
import { SwordController } from '../combat/SwordController';
import { GestureRecognizer, SlashDirection, GestureResult } from '../combat/GestureRecognizer';
import { SoundEffects } from '../audio/SoundEffects';

/**
 * 第一人稱玩家控制器 (Player)
 * 管理玩家物理移動、Pointer Lock 視角控制、架勢模式解耦、體力與生命值
 */
export class Player {
  public camera: THREE.PerspectiveCamera;
  public sword: SwordController;
  public gesture: GestureRecognizer;
  public sfx: SoundEffects;

  // 屬性數值
  public maxHealth: number = 100;
  public currentHealth: number = 100;
  public maxStamina: number = 100;
  public currentStamina: number = 100;
  public staminaRegenRate: number = 22; // 每秒體力恢復量

  // 狀態旗標
  public isBlocking: boolean = false;
  public inCombatStance: boolean = false;
  public parryWindowTimer: number = 0; // 精準格擋窗口 (按下右鍵的前 0.18 秒為完美格擋)

  // 移動與物理
  public position = new THREE.Vector3(0, 1.7, 8); // 出生點
  private velocity = new THREE.Vector3();
  private isGrounded: boolean = true;
  private readonly MOVE_SPEED = 7.0;
  private readonly SPRINT_SPEED = 11.5;
  private readonly JUMP_FORCE = 8.5;
  private readonly GRAVITY = 22.0;

  // 攝影機旋轉 (歐拉角)
  private pitch = 0;
  private yaw = 0;
  public isLocked: boolean = false;

  // 輸入狀態暫存
  private keys: Record<string, boolean> = {};

  constructor(camera: THREE.PerspectiveCamera, sfx: SoundEffects) {
    this.camera = camera;
    this.sfx = sfx;
    this.sword = new SwordController();
    this.gesture = new GestureRecognizer();

    this.camera.add(this.sword.group);
    this.setupInputs();
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;

      if (e.button === 0) { // 滑鼠左鍵：進入揮劍攻擊架勢
        if (this.currentStamina >= 10 && !this.sword.swinging) {
          this.inCombatStance = true;
          this.gesture.startStance(e.clientX, e.clientY);
        }
      } else if (e.button === 2) { // 滑鼠右鍵：進入防禦並啟動完美格擋計時
        this.isBlocking = true;
        this.parryWindowTimer = 0.18; // 0.18 秒的完美格擋窗口
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isLocked) return;

      if (e.button === 0 && this.inCombatStance) {
        this.inCombatStance = false;
        const result = this.gesture.finishStance();
        this.executeAttack(result);
      } else if (e.button === 2) {
        this.isBlocking = false;
        this.parryWindowTimer = 0;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      // 如果處於揮劍架勢模式，降低攝影機靈敏度 (解耦防暈)，並採樣手勢位移
      if (this.inCombatStance) {
        const stanceSensitivity = 0.0003; // 大幅衰減轉向
        this.yaw -= e.movementX * stanceSensitivity;
        this.pitch -= e.movementY * stanceSensitivity;
        this.gesture.updatePoint(e.movementX, e.movementY);
      } else {
        const normalSensitivity = 0.0022; // 正常第一人稱視角轉動
        this.yaw -= e.movementX * normalSensitivity;
        this.pitch -= e.movementY * normalSensitivity;
      }

      // 限制垂直仰俯視角 (-85° ~ +85°)
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });

    // 禁用右鍵預設瀏覽器選單
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * 執行揮劍斬擊邏輯
   */
  public onAttackExecuted?: (result: GestureResult) => void;

  private executeAttack(result: GestureResult) {
    const staminaCost = result.isHeavy ? 30 : 15;
    if (this.currentStamina < staminaCost) return;

    this.currentStamina = Math.max(0, this.currentStamina - staminaCost);
    this.sword.triggerSlash(result.direction, result.isHeavy);
    this.sfx.playWhoosh(result.isHeavy);

    if (this.onAttackExecuted) {
      this.onAttackExecuted(result);
    }
  }

  /**
   * 玩家受到傷害
   */
  public takeDamage(amount: number): { parried: boolean; blocked: boolean; damageDealt: number } {
    // 1. 檢驗完美格擋 (Parry)
    if (this.isBlocking && this.parryWindowTimer > 0) {
      this.sfx.playParry();
      return { parried: true, blocked: false, damageDealt: 0 };
    }

    // 2. 檢驗普通防禦 (Block)
    if (this.isBlocking && this.currentStamina >= 10) {
      this.currentStamina = Math.max(0, this.currentStamina - 20);
      const reduced = amount * 0.25; // 減傷 75%
      this.currentHealth = Math.max(0, this.currentHealth - reduced);
      this.sfx.playBlock();
      return { parried: false, blocked: true, damageDealt: reduced };
    }

    // 3. 結結實實挨刀
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.sfx.playHitImpact();
    return { parried: false, blocked: false, damageDealt: amount };
  }

  /**
   * 每幀更新
   */
  public update(delta: number, time: number) {
    // 1. 格擋窗口倒數
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= delta;
    }

    // 2. 體力自動恢復 (防禦或出刀時不恢復)
    if (!this.isBlocking && !this.inCombatStance && !this.sword.swinging) {
      this.currentStamina = Math.min(this.maxStamina, this.currentStamina + this.staminaRegenRate * delta);
    }

    // 3. 移動物理更新
    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const currentSpeed = isSprinting && this.currentStamina > 5 ? this.SPRINT_SPEED : this.MOVE_SPEED;

    if (isSprinting && (this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD'])) {
      this.currentStamina = Math.max(0, this.currentStamina - 12 * delta);
    }

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;
    moveDir.normalize();

    // 依據玩家 Yaw 角度旋轉移動方向
    const moveQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    moveDir.applyQuaternion(moveQuat);

    this.velocity.x = moveDir.x * currentSpeed;
    this.velocity.z = moveDir.z * currentSpeed;

    // 重力與跳躍
    if (this.isGrounded) {
      if (this.keys['Space'] && this.currentStamina >= 10) {
        this.velocity.y = this.JUMP_FORCE;
        this.currentStamina -= 10;
        this.isGrounded = false;
      } else {
        this.velocity.y = 0;
      }
    } else {
      this.velocity.y -= this.GRAVITY * delta;
    }

    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.position.z += this.velocity.z * delta;

    // 簡易競技場邊界與地面碰撞
    if (this.position.y <= 1.7) {
      this.position.y = 1.7;
      this.isGrounded = true;
    }
    const arenaRadius = 23;
    const distFromCenter = Math.hypot(this.position.x, this.position.z);
    if (distFromCenter > arenaRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * arenaRadius;
      this.position.z = Math.sin(angle) * arenaRadius;
    }

    // 4. 同步攝影機位置與朝向
    this.camera.position.copy(this.position);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));

    // 5. 更新劍控制器
    this.sword.update(delta, this.inCombatStance, this.isBlocking, time);
  }
}
