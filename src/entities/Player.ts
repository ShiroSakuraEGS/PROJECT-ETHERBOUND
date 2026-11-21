import * as THREE from 'three';
import { SwordController } from '../combat/SwordController';
import { GestureRecognizer, SlashDirection, GestureResult } from '../combat/GestureRecognizer';
import { SoundEffects } from '../audio/SoundEffects';
import { CameraImpulse } from '../camera/CameraImpulse';

/**
 * 第一人稱玩家控制器 (Player)
 * 解決滑鼠飄動 (Pointer Lock Delta Spike Filter) 與視角乾淨合成
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
  public staminaRegenRate: number = 24;

  // 狀態旗標
  public isBlocking: boolean = false;
  public inCombatStance: boolean = false;
  public parryWindowTimer: number = 0;

  // 移動與物理
  public position = new THREE.Vector3(0, 1.7, 8);
  private velocity = new THREE.Vector3();
  private isGrounded: boolean = true;
  private readonly MOVE_SPEED = 7.2;
  private readonly SPRINT_SPEED = 12.0;
  private readonly JUMP_FORCE = 8.5;
  private readonly GRAVITY = 22.0;

  // 乾淨的視角歐拉角 (Pitch 仰俯, Yaw 水平)
  private pitch = 0;
  private yaw = 0;
  public isLocked: boolean = false;

  private keys: Record<string, boolean> = {};

  // 回調監聽
  public onAttackExecuted?: (result: GestureResult) => void;
  public onSkillTriggered?: () => void;

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

      if (e.code === 'KeyQ' && this.isLocked) {
        this.castEtherSkill();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isLocked) return;

      if (e.button === 0) {
        if (this.currentStamina >= 10 && !this.sword.swinging) {
          this.inCombatStance = true;
          this.gesture.startStance(e.clientX, e.clientY);
        }
      } else if (e.button === 2) {
        this.isBlocking = true;
        this.parryWindowTimer = 0.18;
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

      // 【核心修復 1】：滑鼠位移跳變保護 (Spike Filter)
      // 在瀏覽器剛進入 Pointer Lock 或快速滑動時，過濾單幀超過 85 像素的異常硬體跳躍
      const clampedX = Math.max(-85, Math.min(85, e.movementX));
      const clampedY = Math.max(-85, Math.min(85, e.movementY));

      if (this.inCombatStance) {
        // 攻擊架勢中大幅衰減鏡頭轉動，防止手勢揮劍時鏡頭劇烈甩頭
        const stanceSensitivity = 0.00025;
        this.yaw -= clampedX * stanceSensitivity;
        this.pitch -= clampedY * stanceSensitivity;
        this.gesture.updatePoint(clampedX, clampedY);
      } else {
        // 正常探索視角 (平滑敏捷)
        const normalSensitivity = 0.0020;
        this.yaw -= clampedX * normalSensitivity;
        this.pitch -= clampedY * normalSensitivity;
      }

      // 嚴格限制仰俯角 (-85° ~ +85°)，防止頭部翻轉
      this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private castEtherSkill() {
    const cost = 40;
    if (this.currentStamina < cost || this.sword.swinging) return;

    this.currentStamina -= cost;
    this.sword.triggerSlash(SlashDirection.Right, true);
    this.sfx.playEtherWave();

    if (this.onSkillTriggered) {
      this.onSkillTriggered();
    }
  }

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

  public takeDamage(amount: number): { parried: boolean; blocked: boolean; damageDealt: number } {
    if (this.isBlocking && this.parryWindowTimer > 0) {
      this.sfx.playParry();
      return { parried: true, blocked: false, damageDealt: 0 };
    }

    if (this.isBlocking && this.currentStamina >= 10) {
      this.currentStamina = Math.max(0, this.currentStamina - 20);
      const reduced = amount * 0.25;
      this.currentHealth = Math.max(0, this.currentHealth - reduced);
      this.sfx.playBlock();
      return { parried: false, blocked: true, damageDealt: reduced };
    }

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.sfx.playHitImpact();
    return { parried: false, blocked: false, damageDealt: amount };
  }

  /**
   * 每幀更新：乾淨合成玩家視角與彈簧衝擊 (Camera Impulse)
   */
  public update(delta: number, time: number, cameraImpulse?: CameraImpulse) {
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= delta;
    }

    if (!this.isBlocking && !this.inCombatStance && !this.sword.swinging) {
      this.currentStamina = Math.min(this.maxStamina, this.currentStamina + this.staminaRegenRate * delta);
    }

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

    const moveQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    moveDir.applyQuaternion(moveQuat);

    this.velocity.x = moveDir.x * currentSpeed;
    this.velocity.z = moveDir.z * currentSpeed;

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

    if (this.position.y <= 1.7) {
      this.position.y = 1.7;
      this.isGrounded = true;
    }
    const arenaRadius = 24;
    const distFromCenter = Math.hypot(this.position.x, this.position.z);
    if (distFromCenter > arenaRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * arenaRadius;
      this.position.z = Math.sin(angle) * arenaRadius;
    }

    // 【核心修復 2】：視角合成（乾淨的非累積疊加）
    // 鏡頭位置 = 玩家物理位置 + 臨時衝擊位移
    this.camera.position.copy(this.position);
    if (cameraImpulse) {
      this.camera.position.add(cameraImpulse.offset);
    }

    // 鏡頭旋轉 = 當前乾淨 Pitch/Yaw + 臨時彈簧角位移，每幀重置，絕不累加！
    let finalPitch = this.pitch;
    let finalYaw = this.yaw;
    let finalRoll = 0;

    if (cameraImpulse) {
      finalPitch += cameraImpulse.rotationOffset.x;
      finalYaw += cameraImpulse.rotationOffset.y;
      finalRoll += cameraImpulse.rotationOffset.z;
    }

    this.camera.quaternion.setFromEuler(new THREE.Euler(finalPitch, finalYaw, finalRoll, 'YXZ'));

    // 更新劍身姿態
    this.sword.update(delta, this.inCombatStance, this.isBlocking, time);
  }
}
