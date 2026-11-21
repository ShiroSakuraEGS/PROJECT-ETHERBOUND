import * as THREE from 'three';
import { ArenaScene } from './world/ArenaScene';
import { Player } from './entities/Player';
import { Enemy, EnemyType } from './entities/Enemy';
import { SoundEffects } from './audio/SoundEffects';
import { HUD } from './ui/HUD';
import { SlashDirection, GestureResult } from './combat/GestureRecognizer';
import { EtherWave } from './combat/EtherWave';
import { BladeTrail } from './vfx/BladeTrail';
import { AmbientParticles } from './vfx/AmbientParticles';

/**
 * 遊戲主程式 (Game Application)
 * 整合渲染器、相機、實體狀態、打擊頓挫 (Hitstop)、Ribbon 劍刃光軌、以太環境微粒與粒子特效
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private arena: ArenaScene;
  private player: Player;
  private enemies: Enemy[] = [];
  private etherWaves: EtherWave[] = [];
  private sfx: SoundEffects;
  private hud: HUD;

  // VFX 粒子與光軌系統 (參考 nixie-fx 架構)
  private bladeTrail: BladeTrail;
  private ambientParticles: AmbientParticles;

  // 打擊頓挫 (Hitstop) 與微震 (Camera Shake)
  private hitstopTimer: number = 0;
  private cameraShakeIntensity: number = 0;

  // 命中火花粒子系統
  private sparkParticles: THREE.Points;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private readonly MAX_SPARKS = 250;
  private activeSparksCount = 0;

  private clock = new THREE.Clock();

  constructor() {
    // 1. 初始化 Three.js 渲染器 (採用 AAA 等級 ACES 色調映射與軟陰影)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
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

    // 3. 初始化 VFX 系統 (光軌與以太微粒)
    this.bladeTrail = new BladeTrail(this.arena.scene);
    this.ambientParticles = new AmbientParticles(this.arena.scene);

    // 4. 生成目標實體 (訓練木人 + 敵人士兵)
    const dummy = new Enemy(this.arena.scene, EnemyType.Dummy, new THREE.Vector3(0, 0, 0));
    const soldier = new Enemy(this.arena.scene, EnemyType.Soldier, new THREE.Vector3(5, 0, -4));
    this.enemies.push(dummy, soldier);

    // 5. 初始化火花粒子
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkVelocities = new Float32Array(this.MAX_SPARKS * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.15,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.sparkParticles = new THREE.Points(this.sparkGeo, sparkMat);
    this.arena.scene.add(this.sparkParticles);

    // 6. 綁定揮劍與技能回調
    this.player.onAttackExecuted = (result: GestureResult) => {
      this.checkPlayerAttackHit(result);
    };

    this.player.onSkillTriggered = () => {
      this.spawnEtherWave();
    };

    this.setupWindowEvents();
    this.animate();
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const blocker = document.getElementById('blocker')!;
    const startBtn = document.getElementById('start-btn')!;

    // 點擊「拔劍進入以太界域」按鈕
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sfx.playSwordDraw(); // 播放拔劍龍鳴音效
      document.body.requestPointerLock();
    });

    blocker.addEventListener('click', () => {
      this.sfx.playSwordDraw();
      document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      const isLocked = document.pointerLockElement === document.body;
      this.player.isLocked = isLocked;

      if (isLocked) {
        blocker.classList.add('fade-out');
      } else {
        blocker.classList.remove('fade-out');
      }
    });
  }

  private spawnEtherWave() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const spawnPos = this.player.position.clone().addScaledVector(forward, 0.8);

    const wave = new EtherWave(spawnPos, forward);
    this.arena.scene.add(wave.mesh);
    this.etherWaves.push(wave);

    this.hud.showBanner('⚡ 釋放劍技：【以太劍氣波】(ETHER WAVE)！');
    this.cameraShakeIntensity = 0.05;
  }

  private updateEtherWaves(delta: number) {
    for (let i = this.etherWaves.length - 1; i >= 0; i--) {
      const wave = this.etherWaves[i];
      const dead = wave.update(delta);

      if (dead) {
        this.arena.scene.remove(wave.mesh);
        this.etherWaves.splice(i, 1);
        continue;
      }

      for (const enemy of this.enemies) {
        if (enemy.currentHealth <= 0 && enemy.type !== EnemyType.Dummy) continue;

        const dist = wave.mesh.position.distanceTo(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
        if (dist < 1.5) {
          enemy.takeDamage(wave.damage, SlashDirection.Right, true);
          this.sfx.playHitImpact();
          this.spawnSparks(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
          this.cameraShakeIntensity = 0.08;
          this.triggerHitstop(0.08);

          this.hud.showBanner(`💥 劍氣貫穿！造成 ${wave.damage} 點傷害！`);
          this.arena.scene.remove(wave.mesh);
          this.etherWaves.splice(i, 1);
          break;
        }
      }
    }
  }

  private checkPlayerAttackHit(result: GestureResult) {
    for (const enemy of this.enemies) {
      if (enemy.currentHealth <= 0 && enemy.type !== EnemyType.Dummy) continue;

      const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.player.position);
      const dist = toEnemy.length();

      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const angle = forward.angleTo(toEnemy);

      if (dist <= 3.5 && angle < 0.85) {
        const baseDamage = result.isHeavy ? 45 : 22;
        const killed = enemy.takeDamage(baseDamage, result.direction, result.isHeavy);

        this.sfx.playHitImpact();
        this.triggerHitstop(0.06);
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

  private handleEnemyAttack(enemy: Enemy) {
    const rawDamage = 25;
    const result = this.player.takeDamage(rawDamage);

    if (result.parried) {
      enemy.triggerParried();
      this.triggerHitstop(0.12);
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

  private triggerHitstop(duration: number) {
    this.hitstopTimer = duration;
  }

  private spawnSparks(hitPos: THREE.Vector3) {
    for (let i = 0; i < 30; i++) {
      const idx = (this.activeSparksCount % this.MAX_SPARKS) * 3;
      this.sparkPositions[idx] = hitPos.x;
      this.sparkPositions[idx + 1] = hitPos.y;
      this.sparkPositions[idx + 2] = hitPos.z;

      this.sparkVelocities[idx] = (Math.random() - 0.5) * 8.5;
      this.sparkVelocities[idx + 1] = Math.random() * 6.5 + 2.0;
      this.sparkVelocities[idx + 2] = (Math.random() - 0.5) * 8.5;

      this.activeSparksCount++;
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  private updateSparks(delta: number) {
    for (let i = 0; i < this.MAX_SPARKS; i++) {
      const idx = i * 3;
      if (this.sparkPositions[idx + 1] > 0) {
        this.sparkPositions[idx] += this.sparkVelocities[idx] * delta;
        this.sparkPositions[idx + 1] += this.sparkVelocities[idx + 1] * delta;
        this.sparkPositions[idx + 2] += this.sparkVelocities[idx + 2] * delta;

        this.sparkVelocities[idx + 1] -= 18.0 * delta;
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.renderer.render(this.arena.scene, this.camera);
      return;
    }

    // 1. 更新玩家
    this.player.update(delta, elapsedTime);

    // 2. 採樣劍尖與劍顎座標，驅動 Ribbon 劍刃光軌
    const tipPos = this.player.sword.getBladeTipPosition();
    const basePos = this.player.sword.getBladeBasePosition();
    this.bladeTrail.addSample(tipPos, basePos, this.player.sword.swinging);
    this.bladeTrail.update(delta);

    // 3. 更新以太空間環境微粒
    this.ambientParticles.update(delta, elapsedTime);

    // 4. 更新敵人 AI
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player.position, (attackingEnemy) => {
        this.handleEnemyAttack(attackingEnemy);
      });
    }

    // 5. 更新以太劍氣波與粒子火花
    this.updateEtherWaves(delta);
    this.updateSparks(delta);
    this.arena.update(elapsedTime);

    // 6. 相機微震衰減
    if (this.cameraShakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShakeIntensity;
      this.cameraShakeIntensity = Math.max(0, this.cameraShakeIntensity - delta * 0.4);
    }

    // 7. 同步 HUD
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

    this.renderer.render(this.arena.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
