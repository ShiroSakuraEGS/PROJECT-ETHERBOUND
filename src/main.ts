import * as THREE from 'three';
import { ArenaScene } from './world/ArenaScene';
import { Player } from './entities/Player';
import { Enemy, EnemyType } from './entities/Enemy';
import { NPC } from './entities/NPC';
import { NPCS } from './lore/AetherisLore';
import { SoundEffects } from './audio/SoundEffects';
import { HUD } from './ui/HUD';
import { DialogueBox } from './ui/DialogueBox';
import { Inventory } from './items/Inventory';
import { QuestManager, QuestStage } from './quest/QuestManager';
import { DynamicWorld } from './lore/DynamicWorld';
import { SlashDirection, GestureResult } from './combat/GestureRecognizer';
import { EtherWave } from './combat/EtherWave';
import { BladeTrail } from './vfx/BladeTrail';
import { AmbientParticles } from './vfx/AmbientParticles';
import { CameraImpulse } from './camera/CameraImpulse';
import { InkSplatVFX } from './vfx/InkSplatVFX';

/**
 * 《PROJECT: ETHERBOUND》主程式 (Game Application)
 * 依照《Aetheris 設定集》重構之完整遊戲流程：
 * - 任務系統：甦醒試劍 ➔ 雷歐納德彈刀試煉 ➔ 艾琳星鐵鍛造升級 ➔ 第1層守層Boss決戰
 * - 三大開源技術：threejs-game-skills (玩法) + nixie-fx (光軌微粒) + ink-studio (彈簧衝擊水墨)
 */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private arena: ArenaScene;
  private player: Player;
  private enemies: Enemy[] = [];
  private npcs: NPC[] = [];
  private etherWaves: EtherWave[] = [];

  private sfx: SoundEffects;
  private hud: HUD;
  private dialogueBox: DialogueBox;
  private inventory: Inventory;
  private questManager: QuestManager;
  private dynamicWorld: DynamicWorld;

  // 三大支柱 VFX 與動力學模組
  private bladeTrail: BladeTrail;
  private ambientParticles: AmbientParticles;
  private cameraImpulse: CameraImpulse;
  private inkSplat: InkSplatVFX;

  // 打擊頓挫 (Hitstop)
  private hitstopTimer: number = 0;

  // 火花粒子系統
  private sparkParticles: THREE.Points;
  private sparkGeo: THREE.BufferGeometry;
  private sparkPositions: Float32Array;
  private sparkVelocities: Float32Array;
  private readonly MAX_SPARKS = 300;
  private activeSparksCount = 0;

  // 近身 NPC 焦點暫存
  private focusedNpc: NPC | null = null;
  private clock = new THREE.Clock();

  constructor() {
    // 1. 初始化 Three.js 渲染器 (ACESFilmic 色調映射)
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
    this.dialogueBox = new DialogueBox();
    this.inventory = new Inventory();
    this.questManager = new QuestManager(this.inventory);
    this.dynamicWorld = new DynamicWorld();

    this.arena = new ArenaScene();
    this.player = new Player(this.camera, this.sfx);
    this.arena.scene.add(this.camera);

    // 3. 初始化三大支柱 VFX 與動力學模組
    this.bladeTrail = new BladeTrail(this.arena.scene);
    this.ambientParticles = new AmbientParticles(this.arena.scene);
    this.cameraImpulse = new CameraImpulse();
    this.inkSplat = new InkSplatVFX(this.arena.scene);

    // 4. 生成場景目標實體 (訓練木人 + 試煉衛兵)
    const dummy = new Enemy(this.arena.scene, EnemyType.Dummy, new THREE.Vector3(0, 0, 0));
    const soldier = new Enemy(this.arena.scene, EnemyType.Soldier, new THREE.Vector3(5, 0, -4));
    this.enemies.push(dummy, soldier);

    // 5. 生成三大核心 NPC
    this.npcs.push(
      new NPC(this.arena.scene, NPCS.leonard, new THREE.Vector3(-6, 0, 4)),
      new NPC(this.arena.scene, NPCS.aileen, new THREE.Vector3(8, 0, 2)),
      new NPC(this.arena.scene, NPCS.mila, new THREE.Vector3(-8, 0, -6))
    );

    // 6. 初始化火花粒子
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

    // 7. 綁定事件監聽與主線進程回調
    this.setupCombatAndQuestEvents();
    this.setupWindowEvents();

    // 初始同步 HUD
    this.hud.updateInventoryHUD(this.inventory.cor, this.inventory.potions, this.inventory.weaponName);
    this.hud.updateQuestHUD(this.questManager.getCurrentQuest());

    this.animate();
  }

  private setupCombatAndQuestEvents() {
    // 揮劍事件
    this.player.onAttackExecuted = (result: GestureResult) => {
      this.cameraImpulse.addSwingImpulse(new THREE.Vector2(result.vector.x, result.vector.y), result.isHeavy);
      this.questManager.recordSlash();
      this.checkPlayerAttackHit(result);
    };

    // Q 鍵以太劍氣事件
    this.player.onSkillTriggered = () => {
      this.questManager.recordSkill();
      this.spawnEtherWave();
    };

    // 任務推進事件
    this.questManager.onQuestUpdated = (quest) => {
      this.hud.updateQuestHUD(quest);
    };

    // 任務階段切換事件
    this.questManager.onStageChanged = (newStage) => {
      if (newStage === QuestStage.KnightTrial) {
        this.sfx.playQuestComplete();
        this.hud.showBanner('🎉 任務達成！向【雷歐納德】接取破曉試煉！');
      } else if (newStage === QuestStage.SmithUpgrade) {
        this.sfx.playQuestComplete();
        this.hud.showBanner('⭐ 試煉完成！獲得 150 Cor！向【艾琳】重鑄武器！');
      } else if (newStage === QuestStage.BossBattle) {
        this.spawnVoidBoss();
      } else if (newStage === QuestStage.Victory) {
        this.sfx.playQuestComplete();
        this.hud.showBanner('🏆 恭喜突破第 1 層！蒼穹樞紐封印解除！', true);
      }
    };

    // 背包更新
    this.inventory.onInventoryChanged = () => {
      this.hud.updateInventoryHUD(this.inventory.cor, this.inventory.potions, this.inventory.weaponName);
    };
  }

  /**
   * 召喚第 1 層守層 Boss：虛空漫遊者 (Void Stalker)
   */
  private spawnVoidBoss() {
    this.sfx.playBossRoar();
    this.hud.showBanner('⚠️ 虛空裂隙打開！第 1 層守層 Boss 降臨！', true);
    this.cameraImpulse.addImpulse(new THREE.Vector3(0, 0.2, 0.15));

    const boss = new Enemy(this.arena.scene, EnemyType.VoidBoss, new THREE.Vector3(0, 0, -12));
    this.enemies.push(boss);

    // 爆發虛空水墨粒子
    this.inkSplat.spawnInkBurst(new THREE.Vector3(0, 2, -12), new THREE.Vector3(0, 1, 0), true);
  }

  private setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const blocker = document.getElementById('blocker')!;
    const startBtn = document.getElementById('start-btn')!;

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sfx.playSwordDraw();
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
        if (!this.dialogueBox.isOpen) {
          blocker.classList.remove('fade-out');
        }
      }
    });

    // 鍵盤特殊互動快捷鍵 (R 飲用藥水 / E 與 NPC 交談)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && this.player.isLocked) {
        // 飲用恢復藥水
        const res = this.inventory.usePotion(this.player.currentHealth, this.player.maxHealth);
        if (res.success) {
          this.player.currentHealth = res.newHp;
          this.sfx.playDrinkPotion();
          this.hud.showBanner('🧪 飲用微風藥水，恢復 50 點生命值！');
          this.inkSplat.spawnInkBurst(this.player.position, new THREE.Vector3(0, 1, 0), true);
        } else {
          this.hud.showBanner('藥水已耗盡或生命已滿！');
        }
      }

      if (e.code === 'KeyE') {
        if (this.dialogueBox.isOpen) {
          this.dialogueBox.hide();
        } else if (this.focusedNpc && this.player.isLocked) {
          // 與 NPC 互動
          const reply = this.questManager.interactWithNPC(this.focusedNpc.info.id);
          this.dialogueBox.show(this.focusedNpc.info, reply);
          this.sfx.playWhoosh(false);
        }
      }

      if (e.code === 'Escape' && this.dialogueBox.isOpen) {
        this.dialogueBox.hide();
      }
    });
  }

  private spawnEtherWave() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const spawnPos = this.player.position.clone().addScaledVector(forward, 0.8);

    const wave = new EtherWave(spawnPos, forward);
    const worldDmgMult = this.dynamicWorld.damageMultiplier;
    wave.damage = Math.round(wave.damage * this.inventory.weaponDamageMultiplier * worldDmgMult);
    this.arena.scene.add(wave.mesh);
    this.etherWaves.push(wave);

    this.hud.showBanner('⚡ 釋放劍技：【以太劍氣波】(ETHER WAVE)！');
    this.cameraImpulse.addImpulse(new THREE.Vector3(0, 0, 0.05));
    this.inkSplat.spawnInkBurst(spawnPos, forward, true);
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
        if (dist < (enemy.type === EnemyType.VoidBoss ? 2.2 : 1.5)) {
          const killed = enemy.takeDamage(wave.damage, SlashDirection.Right, true);
          this.sfx.playHitImpact();
          this.spawnSparks(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
          
          const forward = new THREE.Vector3();
          this.camera.getWorldDirection(forward);
          this.cameraImpulse.addHitImpact(true);
          this.inkSplat.spawnInkBurst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)), forward, true);
          this.triggerHitstop(0.08);

          if (killed) {
            this.questManager.recordEnemyDefeated(enemy.type === EnemyType.VoidBoss);
            this.hud.showBanner(enemy.type === EnemyType.VoidBoss ? '👑 斬落第 1 層守層 Boss！' : '擊倒敵人士兵！');
          } else {
            this.hud.showBanner(`💥 劍氣貫穿！造成 ${wave.damage} 點傷害！`);
          }

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

      const maxHitDist = enemy.type === EnemyType.VoidBoss ? 4.2 : 3.5;

      if (dist <= maxHitDist && angle < 0.85) {
        let baseDamage = result.isHeavy ? 45 : 22;
        const worldDmgMult = this.dynamicWorld.damageMultiplier;
        baseDamage = Math.round(baseDamage * this.inventory.weaponDamageMultiplier * worldDmgMult);

        const killed = enemy.takeDamage(baseDamage, result.direction, result.isHeavy);

        // 受擊擊退 (Knockback，依規格書 02 規定：輕斬 0.5m，重斬 1.8m)
        const knockbackDist = result.isHeavy ? 1.8 : 0.5;
        if (enemy.type !== EnemyType.Dummy) {
          enemy.mesh.position.addScaledVector(forward, knockbackDist);
        }

        this.sfx.playHitImpact();
        this.triggerHitstop(result.isHeavy ? 0.10 : 0.045); // 規格書頓幀

        this.cameraImpulse.addHitImpact(result.isHeavy);
        this.inkSplat.spawnInkBurst(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)), forward, result.isHeavy);
        this.spawnSparks(enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)));

        const heavyLabel = result.isHeavy ? '【重斬】' : '【輕斬】';
        let dirLabel = '直刺';
        if (result.direction === SlashDirection.Left) dirLabel = '左橫斬';
        if (result.direction === SlashDirection.Right) dirLabel = '右橫斬';
        if (result.direction === SlashDirection.Up) dirLabel = '上撩斬';
        if (result.direction === SlashDirection.Down) dirLabel = '當頭下劈';

        if (killed) {
          this.questManager.recordEnemyDefeated(enemy.type === EnemyType.VoidBoss);
          this.hud.showBanner(enemy.type === EnemyType.VoidBoss ? '👑 斬落第 1 層守層 Boss！' : '擊倒試煉衛兵！');
        } else {
          this.hud.showBanner(`命中！${heavyLabel} ${dirLabel} (${baseDamage} 傷害)`);
        }
        break;
      }
    }
  }

  private handleEnemyAttack(enemy: Enemy) {
    const rawDamage = enemy.type === EnemyType.VoidBoss ? 42 : 25;
    const result = this.player.takeDamage(rawDamage);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    if (result.parried) {
      enemy.triggerParried();
      this.triggerHitstop(0.15); // 規格書 Parry 頓幀 150ms
      this.cameraImpulse.addParryImpulse();
      this.questManager.recordParry();
      this.inkSplat.spawnInkBurst(this.player.position.clone().add(new THREE.Vector3(0, 0, -1)), forward, true);
      this.hud.showBanner('⚡ 完美格擋 (PERFECT PARRY)！敵人破防 1.8s！', true);
      this.spawnSparks(this.player.position.clone().add(new THREE.Vector3(0, 0, -1)));
    } else if (result.blocked) {
      this.cameraImpulse.addImpulse(new THREE.Vector3(0, 0, 0.04));
      this.hud.showBanner(`🛡️ 格擋抵禦！承受 ${result.damageDealt.toFixed(0)} 點輕微傷害`);
    } else {
      this.cameraImpulse.addImpulse(new THREE.Vector3(0, -0.05, 0.12));
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
      if (this.positionsValid(idx)) {
        this.sparkPositions[idx] += this.sparkVelocities[idx] * delta;
        this.sparkPositions[idx + 1] += this.sparkVelocities[idx + 1] * delta;
        this.sparkPositions[idx + 2] += this.sparkVelocities[idx + 2] * delta;
        this.sparkVelocities[idx + 1] -= 18.0 * delta;
      }
    }
    this.sparkGeo.attributes.position.needsUpdate = true;
  }

  private positionsValid(idx: number): boolean {
    return this.sparkPositions[idx + 1] > 0;
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

    // 1. 更新玩家實體
    this.player.update(delta, elapsedTime);

    // 2. 更新彈簧阻尼相機衝擊 (Camera Impulse)
    this.cameraImpulse.update(delta);
    this.camera.position.add(this.cameraImpulse.offset);
    this.camera.rotation.x += this.cameraImpulse.rotationOffset.x;
    this.camera.rotation.y += this.cameraImpulse.rotationOffset.y;
    this.camera.rotation.z += this.cameraImpulse.rotationOffset.z;

    // 3. 採樣劍尖與劍顎座標，驅動 Ribbon 劍刃光軌
    const tipPos = this.player.sword.getBladeTipPosition();
    const basePos = this.player.sword.getBladeBasePosition();
    this.bladeTrail.addSample(tipPos, basePos, this.player.sword.swinging);
    this.bladeTrail.update(delta);

    // 4. 更新以太空間微粒與水墨墨滴
    this.ambientParticles.update(delta, elapsedTime);
    this.inkSplat.update(delta);

    // 5. 更新 NPC 轉向與近身互動檢測
    let closestNpc: NPC | null = null;
    let minDist = 3.6;

    for (const npc of this.npcs) {
      npc.update(elapsedTime, this.player.position);
      const d = npc.mesh.position.distanceTo(this.player.position);
      if (d < minDist) {
        minDist = d;
        closestNpc = npc;
      }
    }

    this.focusedNpc = closestNpc;
    this.hud.setInteractPrompt(
      this.focusedNpc !== null && !this.dialogueBox.isOpen,
      this.focusedNpc ? `[E] 與 ${this.focusedNpc.info.name} 交談` : ''
    );

    // 6. 更新敵人 AI
    for (const enemy of this.enemies) {
      enemy.update(delta, this.player.position, (attackingEnemy) => {
        this.handleEnemyAttack(attackingEnemy);
      });
    }

    // 7. 更新以太劍氣波與粒子火花
    this.updateEtherWaves(delta);
    this.updateSparks(delta);
    this.arena.update(elapsedTime);

    // 8. 同步 HUD
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
