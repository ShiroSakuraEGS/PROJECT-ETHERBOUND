import * as THREE from 'three';
import { ArenaScene } from './world/ArenaScene';
import { Player } from './entities/Player';
import { Enemy, EnemyType } from './entities/Enemy';
import { SoundEffects } from './audio/SoundEffects';
import { HUD } from './ui/HUD';
import { SlashDirection, GestureResult } from './combat/GestureRecognizer';

/**
 * 遊戲主程式 (Game Application)
 * 整合渲染器、相機、實體狀態、打擊頓挫 (Hitstop) 與粒子特效
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private arena: ArenaScene;
  private player: Player;
  private enemies: Enemy[] = [];
  private sfx: SoundEffects;
  private hud: HUD;

  // 打擊頓挫 (Hitstop / Frame Freeze) 控制
  private hitstopTimer: number = 0;
  // 相機微震 (Camera Shake) 控制
  private cameraShakeIntensity: number = 0;

  // 命中火花粒子系統 (Hit Sparks)
  private sparkParticles: THREE.Points;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private readonly MAX_SPARKS = 150;
  private activeSparksCount = 0;

  private clock = new THREE.Clock();

  constructor() {
    // 1. 初始化 Three.js 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('canvas-container')!;
    container.appendChild(this.renderer.domElement);

    // 2. 初始化核心子系統
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
    this.sfx = new SoundEffects();
    this.hud = new HUD();
    this.arena = new ArenaScene();
    this.player = new Player(this.camera, this.sfx);
    this.arena.scene.add(this.camera);

    // 3. 生成場景目標實體 (訓練木人 + 敵人士兵)
    const dummy = new Enemy(this.arena.scene, EnemyType.Dummy, new THREE.Vector3(0, 0, 0));
    const soldier = new Enemy(this.arena.scene, EnemyType.Soldier, new THREE.Vector3(5, 0, -4));
    this.enemies.push(dummy, soldier);

    // 4. 初始化打擊火花粒子
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkVelocities = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.12,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sparkParticles = new THREE.Points(this.sparkGeo, sparkMat);
    this.arena.scene.add(this.sparkParticles);

    // 5. 綁定揮劍命中檢測回調
    this.player.onAttackExecuted = (result: GestureResult) => {
      this.checkPlayerAttackHit(result);
    };

    // 6. 設定事件監聽器與主迴圈
    this.setupWindowEvents();
    this.animate();
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 點擊遮罩進入 Pointer Lock
    const blocker = document.getElementById('blocker')!;
    blocker.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement === document.body;
      this.player.isLocked = isLocked;
      blocker.style.display = isLocked ? 'none' : 'flex';
    });
  }

  /**
   * 玩家揮劍命中檢測 (透過第一人稱射線與扇形錐體判定)
   */
  private checkPlayerAttackHit(result: GestureResult) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = 3.6; // 近戰揮劍距離

    for (const enemy of this.enemies) {
      if (enemy.currentHealth <= 0 && enemy.type !== EnemyType.Dummy) continue;

      const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.position);
      const dist = toEnemy.length();

      // 角度與距離判定
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const angle = forward.angleTo(toEnemy);

      if (dist <= 3.5 && angle < 0.85) {
        // 命中成功！
        const baseDamage = result.isHeavy ? 45 : 22;
        const killed = enemy.takeDamage(baseDamage, result.direction, result.isHeavy);

        // 音效與反饋
        this.sfx.playHitImpact();
        this.triggerHitstop(0.06); // 頓挫 0.06 秒
        this.cameraShakeIntensity = result.isHeavy ? 0.08 : 0.04;
        this.spawnSparks(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)));

        const heavyLabel = result.isHeavy ? '【重斬】' : '【輕斬】';
        let dirLabel = '直刺';
        if (result.direction === SlashDirection.Left) dirLabel = '左橫斬';
        if (result.direction === SlashDirection.Right) dirLabel = '右橫斬';
        if (result.direction === SlashDirection.Up) dirLabel = '上撩斬';
        if (result.direction === SlashDirection.Down) dirLabel = '當頭下劈';

        if (killed) {
          this.hud.showBanner(`擊倒敵人士兵！`);
        } else {
          this.hud.showBanner(`命中！${heavyLabel} ${dirLabel} (${baseDamage} 傷害)`);
        }
        break;
      }
    }
  }

  /**
   * 敵人攻擊玩家回調
   */
  private handleEnemyAttack(enemy: Enemy) {
    const rawDamage = 25;
    const result = this.player.takeDamage(rawDamage);

    if (result.parried) {
      // 玩家成功完美格擋！彈刀！
      enemy.triggerParried();
      this.triggerHitstop(0.12); // 格擋強烈頓挫
      this.cameraShakeIntensity = 0.06;
      this.hud.showBanner('⚡ 完美格擋 (PERFECT PARRY)！敵人破防！', true);
      this.spawnSparks(this.player.position.clone().add(new THREE.Vector3(0, 0, -1)));
    } else if (result.blocked) {
      this.cameraShakeIntensity = 0.03;
      this.hud.showBanner(`🛡️ 格擋抵禦！承受 ${result.damageDealt.toFixed(0)} 點輕微傷害`);
    } else {
      this.cameraShakeIntensity = 0.12;
      this.hud.showBanner(`💥 遭到敵方重擊！損失 ${result.damageDealt} 生命！`);
    }
  }

  /**
   * 觸發打擊頓挫
   */
  private triggerHitstop(duration: number) {
    this.hitstopTimer = duration;
  }

  /**
   * 產生命中火花粒子
   */
  private spawnSparks(hitPos: THREE.Vector3) {
    for (let i = 0; i < 25; i++) {
      const idx = (this.activeSparksCount % this.MAX_SPARKS) * 3;
      this.sparkPositions[idx] = hitPos.x;
      this.sparkPositions[idx + 1] = hitPos.y;
      this.sparkPositions[idx + 2] = hitPos.z;

      this.sparkVelocities[idx] = (Math.random() - 0.5) * 8.0;
      this.sparkVelocities[idx + 1] = Math.random() * 6.0 + 2.0;
      this.sparkVelocities[idx + 2] = (Math.random() - 0.5) * 8.0;

      this.activeSparksCount++;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  /**
   * 粒子更新
   */
  private updateSparks(delta: number) {
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      const idx = i * 3;
      if (this.sparkPositions[idx + 1] > 0) {
        this.sparkPositions[idx] += this.sparkVelocities[idx] * delta;
        this.sparkPositions[idx + 1] += this.sparkVelocities[idx + 1] * delta;
        this.sparkPositions[idx + 2] += this.sparkVelocities[idx + 2] * delta;

        this.sparkVelocities[idx + 1] -= 18.0 * delta; // 重力下墜
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  /**
   * 遊戲每幀渲染迴圈
   */
  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 處理打擊頓挫 (Frame Freeze)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      // 頓挫期間暫停物理移動更新，營造打擊份量感
      this.renderer.render(this.arena.scene, this.camera);
      return;
    }

    // 1. 更新玩家實體
    this.player.update(delta, elapsedTime);

    // 2. 更新敵人 AI
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player.position, (attackingEnemy) => {
        this.handleEnemyAttack(attackingEnemy);
      });
    }

    // 3. 更新粒子與場景
    this.updateSparks(delta);
    this.arena.update(elapsedTime);

    // 4. 相機微震 (Camera Shake) 衰減計算
    if (this.cameraShakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 0.4);
    }

    // 5. 同步 HUD 介面
    this.hud.updateStatus(
      this.player.currentHealth,
      this.player.maxHealth,
      this.player.currentStamina,
      this.player.maxStamina
    );
    this.hud.updateStanceUI(
      this.player.inCombatStance,
      this.player.gesture.active ? this.player.gesture.getCurrentVector() : undefined
    );

    // 6. 渲染畫面
    this.renderer.render(this.arena.scene, this.camera);
  };
}

// 啟動遊戲實例
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
