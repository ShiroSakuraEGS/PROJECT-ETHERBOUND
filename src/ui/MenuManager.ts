import { Player } from '../entities/Player';
import { Inventory } from '../items/Inventory';
import { SoundEffects } from '../audio/SoundEffects';
import { DynamicWorld } from '../lore/DynamicWorld';
import { ClassSkillManager } from '../systems/ClassSkillManager';
import { CLASSES, WEAPONS_CATALOG, ADVANCED_FLOORS } from '../lore/AetherisLore';

export type MenuTab = 'none' | 'pause' | 'inventory' | 'codex' | 'guide' | 'settings' | 'skills';

/**
 * 遊戲多界面與全螢幕管理器 (MenuManager)
 * 整合《project-etherbound 設定集 v2》全部功能：
 * 1. 5 大主職業切換 (Swordsman / Guardian / Tempest / Spellblade / Berserker)
 * 2. 官方武器庫切換 (直劍 / 細劍 / 重劍 / 蒼穹太刀)
 * 3. 技能天賦樹加點分配 (攻擊 / 防禦 / 探索分支)
 * 4. 世界圖鑑 (第 1 至 10 層詳細生態與 Boss 機制)
 * 5. 全螢幕切換與視野設定
 */
export class MenuManager {
  private activeTab: MenuTab = 'none';
  private player: Player;
  private inventory: Inventory;
  private sfx: SoundEffects;
  private dynamicWorld: DynamicWorld;
  public classSkillManager: ClassSkillManager;

  private onResumeGameCallback?: () => void;
  private onQuitToTitleCallback?: () => void;
  private onFovChangeCallback?: (fov: number) => void;

  // DOM 節點
  private topMenuBar: HTMLElement;
  private modalContainer: HTMLElement;
  private pauseModal: HTMLElement;
  private inventoryModal: HTMLElement;
  private skillsModal: HTMLElement;
  private codexModal: HTMLElement;
  private guideModal: HTMLElement;
  private settingsModal: HTMLElement;
  private fullscreenBtn: HTMLElement;
  private isFullscreen: boolean = false;

  constructor(
    player: Player,
    inventory: Inventory,
    sfx: SoundEffects,
    dynamicWorld: DynamicWorld,
    classSkillManager: ClassSkillManager
  ) {
    this.player = player;
    this.inventory = inventory;
    this.sfx = sfx;
    this.dynamicWorld = dynamicWorld;
    this.classSkillManager = classSkillManager;

    this.topMenuBar = document.getElementById('top-menu-bar')!;
    this.modalContainer = document.getElementById('menu-modal-container')!;
    this.pauseModal = document.getElementById('modal-pause')!;
    this.inventoryModal = document.getElementById('modal-inventory')!;
    this.skillsModal = document.getElementById('modal-skills')!;
    this.codexModal = document.getElementById('modal-codex')!;
    this.guideModal = document.getElementById('modal-guide')!;
    this.settingsModal = document.getElementById('modal-settings')!;
    this.fullscreenBtn = document.getElementById('btn-fullscreen')!;

    this.bindEvents();
    this.bindSettingsControls();
  }

  public setCallbacks(onResume: () => void, onQuit: () => void, onFovChange: (fov: number) => void) {
    this.onResumeGameCallback = onResume;
    this.onQuitToTitleCallback = onQuit;
    this.onFovChangeCallback = onFovChange;
  }

  public get isOpen(): boolean {
    return this.activeTab !== 'none';
  }

  public get currentTab(): MenuTab {
    return this.activeTab;
  }

  /**
   * 開啟指定介面
   */
  public openTab(tab: MenuTab) {
    if (tab === 'none') {
      this.close();
      return;
    }

    this.activeTab = tab;
    this.modalContainer.style.display = 'flex';
    this.sfx.playWhoosh(false);

    // 隱藏所有面板
    this.pauseModal.style.display = 'none';
    this.inventoryModal.style.display = 'none';
    this.skillsModal.style.display = 'none';
    this.codexModal.style.display = 'none';
    this.guideModal.style.display = 'none';
    this.settingsModal.style.display = 'none';

    // 解除 PointerLock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    if (tab === 'pause') {
      this.pauseModal.style.display = 'block';
    } else if (tab === 'inventory') {
      this.inventoryModal.style.display = 'block';
      this.renderInventoryPanel();
    } else if (tab === 'skills') {
      this.skillsModal.style.display = 'block';
      this.renderSkillsPanel();
    } else if (tab === 'codex') {
      this.codexModal.style.display = 'block';
      this.renderCodexPanel();
    } else if (tab === 'guide') {
      this.guideModal.style.display = 'block';
    } else if (tab === 'settings') {
      this.settingsModal.style.display = 'block';
    }
  }

  /**
   * 關閉當前開啟的任何介面並嘗試恢復遊戲
   */
  public close() {
    this.activeTab = 'none';
    this.modalContainer.style.display = 'none';
    this.pauseModal.style.display = 'none';
    this.inventoryModal.style.display = 'none';
    this.skillsModal.style.display = 'none';
    this.codexModal.style.display = 'none';
    this.guideModal.style.display = 'none';
    this.settingsModal.style.display = 'none';

    if (this.onResumeGameCallback) {
      this.onResumeGameCallback();
    }
  }

  /**
   * 切換全螢幕
   */
  public toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('全螢幕請求被瀏覽器拒絕:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  private bindEvents() {
    // 1. 全螢幕按鈕
    this.fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.fullscreenBtn.innerHTML = this.isFullscreen ? '🗗 視窗模式' : '⛶ 全螢幕';
      const settingsFsBtn = document.getElementById('settings-toggle-fs');
      if (settingsFsBtn) {
        settingsFsBtn.innerText = this.isFullscreen ? '退出全螢幕 (F11)' : '切換全螢幕 (F11)';
      }
      window.dispatchEvent(new Event('resize'));
    });

    // 2. 頂部快速導航列按鈕
    document.getElementById('nav-btn-bag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'inventory' ? 'none' : 'inventory');
    });

    document.getElementById('nav-btn-skills')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'skills' ? 'none' : 'skills');
    });

    document.getElementById('nav-btn-codex')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'codex' ? 'none' : 'codex');
    });

    document.getElementById('nav-btn-guide')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'guide' ? 'none' : 'guide');
    });

    document.getElementById('nav-btn-settings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'settings' ? 'none' : 'settings');
    });

    document.getElementById('nav-btn-pause')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'pause' ? 'none' : 'pause');
    });

    // 3. 所有彈窗關閉按鈕
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    });

    // 4. 暫停選單內部各按鈕
    document.getElementById('pause-btn-resume')?.addEventListener('click', () => this.close());
    document.getElementById('pause-btn-inventory')?.addEventListener('click', () => this.openTab('inventory'));
    document.getElementById('pause-btn-skills')?.addEventListener('click', () => this.openTab('skills'));
    document.getElementById('pause-btn-codex')?.addEventListener('click', () => this.openTab('codex'));
    document.getElementById('pause-btn-guide')?.addEventListener('click', () => this.openTab('guide'));
    document.getElementById('pause-btn-settings')?.addEventListener('click', () => this.openTab('settings'));
    document.getElementById('pause-btn-title')?.addEventListener('click', () => {
      this.close();
      if (this.onQuitToTitleCallback) this.onQuitToTitleCallback();
    });

    // 5. 鍵盤快捷鍵管理
    window.addEventListener('keydown', (e) => {
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display === 'block') return;

      if (e.code === 'Escape') {
        if (this.activeTab === 'pause') {
          this.close();
        } else if (this.activeTab !== 'none') {
          this.openTab('pause');
        } else {
          this.openTab('pause');
        }
        return;
      }

      if (e.code === 'KeyB') {
        this.openTab(this.activeTab === 'inventory' ? 'none' : 'inventory');
        return;
      }

      if (e.code === 'KeyK') {
        this.openTab(this.activeTab === 'skills' ? 'none' : 'skills');
        return;
      }

      if (e.code === 'KeyL' || e.code === 'KeyM') {
        this.openTab(this.activeTab === 'codex' ? 'none' : 'codex');
        return;
      }

      if (e.code === 'KeyH') {
        this.openTab(this.activeTab === 'guide' ? 'none' : 'guide');
        return;
      }

      if (e.code === 'KeyO') {
        this.openTab(this.activeTab === 'settings' ? 'none' : 'settings');
        return;
      }
    });
  }

  /**
   * 渲染主職業、武器庫與技能天賦面板
   */
  private renderSkillsPanel() {
    // 1. 渲染職業切換卡片
    const classContainer = document.getElementById('class-cards-container');
    if (classContainer) {
      classContainer.innerHTML = '';
      Object.values(CLASSES).forEach(cls => {
        const isCurrent = cls.id === this.classSkillManager.currentClass.id;
        const card = document.createElement('div');
        card.className = 'feat-card';
        card.style.cursor = 'pointer';
        card.style.borderColor = isCurrent ? '#00e5ff' : 'rgba(255,255,255,0.1)';
        card.style.background = isCurrent ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)';
        card.innerHTML = `
          <h4 style="color:${isCurrent ? '#ffd700' : '#00e5ff'}">${cls.name}</h4>
          <p style="font-size:11px; color:#cbd5e1; margin-bottom:6px;">${cls.focus}</p>
          <p style="font-size:12px; color:#94a3b8; line-height:1.5;">${cls.passiveDesc}</p>
          <div style="margin-top:8px; font-size:11px; color:#ffd700;">${isCurrent ? '✔ 當前主職業' : '[點擊選擇]'}</div>
        `;
        card.addEventListener('click', () => {
          this.classSkillManager.selectClass(cls.id);
          this.sfx.playWhoosh(false);
          this.renderSkillsPanel();
        });
        classContainer.appendChild(card);
      });
    }

    // 2. 渲染官方武器庫切換
    const weaponContainer = document.getElementById('weapon-cards-container');
    if (weaponContainer) {
      weaponContainer.innerHTML = '';
      WEAPONS_CATALOG.forEach(weap => {
        const isCurrent = weap.id === this.classSkillManager.currentWeapon.id;
        const card = document.createElement('div');
        card.className = 'feat-card';
        card.style.cursor = 'pointer';
        card.style.borderColor = isCurrent ? '#ffd700' : 'rgba(255,255,255,0.1)';
        card.style.background = isCurrent ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)';
        card.innerHTML = `
          <h4 style="color:${isCurrent ? '#ffd700' : '#e2e8f0'}">${weap.name}</h4>
          <p style="font-size:11px; color:#38bdf8;">【${weap.rarity}】ATK ${weap.atk} | 暴擊 ${(weap.critRate*100).toFixed(0)}%</p>
          <p style="font-size:12px; color:#94a3b8; margin-top:4px;">${weap.trait}</p>
          <div style="margin-top:8px; font-size:11px; color:#00e5ff;">${isCurrent ? '⚔️ 正在裝備' : '[點擊裝備]'}</div>
        `;
        card.addEventListener('click', () => {
          this.classSkillManager.equipWeapon(weap.id);
          this.sfx.playSwordDraw();
          this.renderSkillsPanel();
        });
        weaponContainer.appendChild(card);
      });
    }

    // 3. 渲染天賦技能樹加點
    const spDisplay = document.getElementById('skill-points-display');
    if (spDisplay) spDisplay.innerText = this.classSkillManager.skillPoints.toString();

    const skillContainer = document.getElementById('skill-nodes-container');
    if (skillContainer) {
      skillContainer.innerHTML = '';
      this.classSkillManager.skills.forEach(skill => {
        const card = document.createElement('div');
        card.className = 'feat-card';
        const canUpgrade = this.classSkillManager.skillPoints >= skill.cost && skill.currentLevel < skill.maxLevel;
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="color:#00e5ff;">${skill.name}</h4>
            <span style="font-size:12px; color:#ffd700;">Lv.${skill.currentLevel}/${skill.maxLevel}</span>
          </div>
          <p style="font-size:12px; color:#cbd5e1; margin:8px 0;">${skill.description}</p>
          <button class="modal-close-btn" style="width:100%; border-color:${canUpgrade ? '#00e5ff' : '#475569'}; color:${canUpgrade ? '#00e5ff' : '#64748b'}; cursor:${canUpgrade ? 'pointer' : 'not-allowed'};">
            ${skill.currentLevel >= skill.maxLevel ? '已達上限' : `學習/升級 (消耗 ${skill.cost} SP)`}
          </button>
        `;
        const btn = card.querySelector('button');
        if (canUpgrade && btn) {
          btn.addEventListener('click', () => {
            if (this.classSkillManager.upgradeSkill(skill.id)) {
              this.sfx.playQuestComplete();
              this.renderSkillsPanel();
            }
          });
        }
        skillContainer.appendChild(card);
      });
    }
  }

  /**
   * 渲染背包與角色屬性面板
   */
  private renderInventoryPanel() {
    const hpVal = document.getElementById('stat-hp');
    const spVal = document.getElementById('stat-sp');
    const atkVal = document.getElementById('stat-atk');
    const parryVal = document.getElementById('stat-parry');
    const weaponEquip = document.getElementById('equip-weapon-name');

    if (hpVal) hpVal.innerText = `${this.player.currentHealth.toFixed(0)} / ${this.player.maxHealth}`;
    if (spVal) spVal.innerText = `${this.player.currentStamina.toFixed(0)} / ${(this.player.maxStamina + this.classSkillManager.maxStaminaBonus).toFixed(0)}`;
    if (atkVal) atkVal.innerText = `${this.classSkillManager.totalPhysicalDamage} 物理 (${this.classSkillManager.currentWeapon.name})`;
    if (parryVal) parryVal.innerText = `${this.classSkillManager.parryWindow.toFixed(2)} 秒 (職業: ${this.classSkillManager.currentClass.name.split(' ')[0]})`;
    if (weaponEquip) weaponEquip.innerText = this.classSkillManager.currentWeapon.name;

    const bagContainer = document.getElementById('bag-grid-items');
    if (!bagContainer) return;

    bagContainer.innerHTML = `
      <div class="inventory-grid-slot" title="微風恢復藥水：按 [R] 飲用，恢復 50 點生命值">
        <div class="slot-icon">🧪</div>
        <div class="slot-name">微風恢復藥水</div>
        <div class="slot-qty">x ${this.inventory.potions}</div>
      </div>
      <div class="inventory-grid-slot" title="柯爾幣：塔內通用貨幣，可用於鍛造武器與購買補給">
        <div class="slot-icon">💰</div>
        <div class="slot-name">柯爾幣 (Cor)</div>
        <div class="slot-qty">${this.inventory.cor}</div>
      </div>
      <div class="inventory-grid-slot" title="以太共鳴結晶：可釋放貫穿劍氣 [Q]">
        <div class="slot-icon">💎</div>
        <div class="slot-name">以太結晶</div>
        <div class="slot-qty">x 1</div>
      </div>
      <div class="inventory-grid-slot" title="當前主手武器">
        <div class="slot-icon">⚔️</div>
        <div class="slot-name">${this.classSkillManager.currentWeapon.name}</div>
        <div class="slot-qty">ATK ${this.classSkillManager.currentWeapon.atk}</div>
      </div>
    `;
  }

  /**
   * 渲染世界圖鑑面板 (包含第 1 至 10 層進階生態與 Boss 戰略)
   */
  private renderCodexPanel() {
    const codexContent = document.getElementById('codex-dynamic-content');
    if (!codexContent) return;

    const floor = this.dynamicWorld.state.currentFloor;
    const weather = this.dynamicWorld.state.currentWeather;

    let floorsHtml = '';
    ADVANCED_FLOORS.forEach(f => {
      floorsHtml += `
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px; margin-bottom:10px;">
          <h4 style="color:#00e5ff; font-size:14px;">第 ${f.floor} 層：${f.name}</h4>
          <p style="font-size:12px; color:#cbd5e1; margin:4px 0;"><b>安全區：</b>${f.safeZone} ｜ <b>環境機制：</b>${f.hazard}</p>
          <p style="font-size:12px; color:#ffd700;"><b>守層 Boss：</b>${f.boss}</p>
          <p style="font-size:11px; color:#94a3b8; line-height:1.6;">${f.bossTactic}</p>
        </div>
      `;
    });

    codexContent.innerHTML = `
      <div class="codex-section">
        <h3>🏛️ 當前所在樓層：${floor?.name_tc || '艾瑟里斯 第 1 層'} (${floor?.name_en || 'Verdant Breeze Plains'})</h3>
        <p><b>安全區：</b>${floor?.safe_zone || '始源鎮 (Origin Town)'}</p>
        <p>${floor?.description || '千年前大斷裂封閉的古代浮空方舟，由星環議會建立，微型生態與以太結晶環繞。'}</p>
      </div>

      <div class="codex-section">
        <h3>🌤️ 當前天候：${weather.name}</h3>
        <p>${weather.description}</p>
      </div>

      <div class="codex-section">
        <h3>🌌 進階高層樓層生態與 Boss 攻略手冊 (第 6 至 10 層)</h3>
        <p style="font-size:12px; color:#94a3b8; margin-bottom:10px;">提取自《設定集 06》機密情報，由破曉之劍前線斥候提供：</p>
        ${floorsHtml}
      </div>

      <div class="codex-section">
        <h3>⚔️ 艾瑟里斯主要勢力 (Factions)</h3>
        <ul>
          <li><b>破曉之劍 (Blade of Dawn)</b>：前線攻略公會，團長雷納德駐守始源鎮，指導新人格擋與彈刀劍術。</li>
          <li><b>鍛造同盟 (Smiths' Guild)</b>：生活系工會，艾琳掌控獨家星鐵冶煉技術，能大幅提升武器攻擊力。</li>
          <li><b>蒼穹情報網 (Aether Info Network)</b>：掌握各樓層 Boss 弱點與迷宮暗道的地下組織。</li>
          <li><b>虛空低語者 (Void Whisperers)</b>：阻撓攻略的敵對反派教團，召喚虛空漫遊者襲擊冒險者。</li>
        </ul>
      </div>
    `;
  }

  private bindSettingsControls() {
    const sensSlider = document.getElementById('settings-sens') as HTMLInputElement;
    const sensVal = document.getElementById('settings-sens-val');
    if (sensSlider && sensVal) {
      sensSlider.addEventListener('input', () => {
        const val = parseFloat(sensSlider.value);
        sensVal.innerText = `${val.toFixed(1)}x`;
        (this.player as any).mouseSensitivity = val * 0.0022;
      });
    }

    const fovSlider = document.getElementById('settings-fov') as HTMLInputElement;
    const fovVal = document.getElementById('settings-fov-val');
    if (fovSlider && fovVal) {
      fovSlider.addEventListener('input', () => {
        const val = parseInt(fovSlider.value);
        fovVal.innerText = `${val}°`;
        if (this.onFovChangeCallback) {
          this.onFovChangeCallback(val);
        }
      });
    }

    document.getElementById('settings-toggle-fs')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }
}
