import { Player } from '../entities/Player';
import { Inventory } from '../items/Inventory';
import { SoundEffects } from '../audio/SoundEffects';
import { DynamicWorld } from '../lore/DynamicWorld';

export type MenuTab = 'none' | 'pause' | 'inventory' | 'codex' | 'guide' | 'settings';

/**
 * 遊戲多界面與全螢幕管理器 (MenuManager)
 * 負責掌控：
 * 1. 全螢幕切換 (Fullscreen API + Resize 監聽)
 * 2. 暫停選單 (Pause Menu)
 * 3. 角色與背包面板 (Character & Inventory Screen - [B])
 * 4. 世界圖鑑與樓層傳記 (World Lore & Codex Screen - [L])
 * 5. 劍術指南與按鍵操作手冊 (Combat Guide - [H])
 * 6. 系統偏好設定面板 (Settings Screen - [O])
 */
export class MenuManager {
  private activeTab: MenuTab = 'none';
  private player: Player;
  private inventory: Inventory;
  private sfx: SoundEffects;
  private dynamicWorld: DynamicWorld;
  private onResumeGameCallback?: () => void;
  private onQuitToTitleCallback?: () => void;
  private onFovChangeCallback?: (fov: number) => void;

  // DOM 節點
  private topMenuBar: HTMLElement;
  private modalContainer: HTMLElement;
  private pauseModal: HTMLElement;
  private inventoryModal: HTMLElement;
  private codexModal: HTMLElement;
  private guideModal: HTMLElement;
  private settingsModal: HTMLElement;
  private fullscreenBtn: HTMLElement;
  private isFullscreen: boolean = false;

  constructor(player: Player, inventory: Inventory, sfx: SoundEffects, dynamicWorld: DynamicWorld) {
    this.player = player;
    this.inventory = inventory;
    this.sfx = sfx;
    this.dynamicWorld = dynamicWorld;

    this.topMenuBar = document.getElementById('top-menu-bar')!;
    this.modalContainer = document.getElementById('menu-modal-container')!;
    this.pauseModal = document.getElementById('modal-pause')!;
    this.inventoryModal = document.getElementById('modal-inventory')!;
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
    // 1. 全螢幕按鈕與快捷鍵
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
      // 觸發視窗重繪
      window.dispatchEvent(new Event('resize'));
    });

    // 2. 頂部快速導航列按鈕
    document.getElementById('nav-btn-bag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openTab(this.activeTab === 'inventory' ? 'none' : 'inventory');
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
    document.getElementById('pause-btn-resume')?.addEventListener('click', () => {
      this.close();
    });

    document.getElementById('pause-btn-inventory')?.addEventListener('click', () => {
      this.openTab('inventory');
    });

    document.getElementById('pause-btn-codex')?.addEventListener('click', () => {
      this.openTab('codex');
    });

    document.getElementById('pause-btn-guide')?.addEventListener('click', () => {
      this.openTab('guide');
    });

    document.getElementById('pause-btn-settings')?.addEventListener('click', () => {
      this.openTab('settings');
    });

    document.getElementById('pause-btn-title')?.addEventListener('click', () => {
      this.close();
      if (this.onQuitToTitleCallback) {
        this.onQuitToTitleCallback();
      }
    });

    // 5. 鍵盤快捷鍵管理
    window.addEventListener('keydown', (e) => {
      // 若正在對話中，則交給對話框處理
      const dialogueBox = document.getElementById('dialogue-box');
      if (dialogueBox && dialogueBox.style.display === 'block') {
        return;
      }

      // [ESC] 鍵：若在次級介面則返回暫停或關閉
      if (e.code === 'Escape') {
        if (this.activeTab === 'pause') {
          this.close();
        } else if (this.activeTab !== 'none') {
          this.openTab('pause');
        } else {
          // 在遊戲中按 ESC 呼叫暫停
          this.openTab('pause');
        }
        return;
      }

      // [B 鍵]：切換背包面板
      if (e.code === 'KeyB') {
        this.openTab(this.activeTab === 'inventory' ? 'none' : 'inventory');
        return;
      }

      // [L 鍵] 或 [M 鍵]：切換圖鑑面板
      if (e.code === 'KeyL' || e.code === 'KeyM') {
        this.openTab(this.activeTab === 'codex' ? 'none' : 'codex');
        return;
      }

      // [H 鍵]：切換指引手冊
      if (e.code === 'KeyH') {
        this.openTab(this.activeTab === 'guide' ? 'none' : 'guide');
        return;
      }

      // [O 鍵]：切換設定
      if (e.code === 'KeyO') {
        this.openTab(this.activeTab === 'settings' ? 'none' : 'settings');
        return;
      }
    });
  }

  /**
   * 渲染背包與角色屬性面板
   */
  private renderInventoryPanel() {
    // 角色屬性
    const hpVal = document.getElementById('stat-hp');
    const spVal = document.getElementById('stat-sp');
    const atkVal = document.getElementById('stat-atk');
    const parryVal = document.getElementById('stat-parry');
    const weaponEquip = document.getElementById('equip-weapon-name');

    if (hpVal) hpVal.innerText = `${this.player.currentHealth.toFixed(0)} / ${this.player.maxHealth}`;
    if (spVal) spVal.innerText = `${this.player.currentStamina.toFixed(0)} / ${this.player.maxStamina}`;
    if (atkVal) atkVal.innerText = `${(35 * this.inventory.weaponDamageMultiplier).toFixed(0)} 物理 / ${(20 * this.dynamicWorld.damageMultiplier).toFixed(0)} 乙太`;
    if (parryVal) parryVal.innerText = '0.18 秒 (黃金彈刀)';
    if (weaponEquip) weaponEquip.innerText = this.inventory.weaponName;

    // 道具清單
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
      <div class="inventory-grid-slot" title="鍛造星鐵礦石：艾琳工坊特製素材">
        <div class="slot-icon">⛏️</div>
        <div class="slot-name">精鍊星鐵錠</div>
        <div class="slot-qty">${this.inventory.weaponDamageMultiplier > 1.0 ? '已淬火' : '待精鍊'}</div>
      </div>
    `;
  }

  /**
   * 渲染世界圖鑑面板
   */
  private renderCodexPanel() {
    const codexContent = document.getElementById('codex-dynamic-content');
    if (!codexContent) return;

    const floor = this.dynamicWorld.state.currentFloor;
    const weather = this.dynamicWorld.state.currentWeather;

    codexContent.innerHTML = `
      <div class="codex-section">
        <h3>🏛️ 當前樓層：${floor?.name_tc || '艾瑟里斯 第 1 層'} (${floor?.name_en || 'Verdant Breeze Plains'})</h3>
        <p><b>安全區：</b>${floor?.safe_zone || '始源鎮 (Origin Town)'}</p>
        <p>${floor?.description || '千年前大斷裂封閉的古代浮空方舟，由星環議會建立，微型生態與以太結晶環繞。'}</p>
      </div>

      <div class="codex-section">
        <h3>🌤️ 當前天候：${weather.name}</h3>
        <p>${weather.description}</p>
        <p><span style="color:#00e5ff">以太加成：</span>傷害加成 x${weather.damageBonus}，體力恢復 x${weather.staminaBonus}</p>
      </div>

      <div class="codex-section">
        <h3>⚔️ 艾瑟里斯主要勢力 (Factions)</h3>
        <ul>
          <li><b>破曉之劍 (Blade of Dawn)</b>：前線攻略公會，團長雷納德駐紮於始源鎮，指導新人格擋與彈刀劍術。</li>
          <li><b>鍛造同盟 (Smiths' Guild)</b>：生活系工會，艾琳掌控獨家星鐵冶煉技術，能大幅提升武器攻擊力。</li>
          <li><b>蒼穹情報網 (Aether Info Network)</b>：掌握各樓層 Boss 弱點與迷宮暗道的地下組織。</li>
          <li><b>虛空低語者 (Void Whisperers)</b>：阻撓攻略的敵對反派教團，召喚虛空漫遊者襲擊冒險者。</li>
        </ul>
      </div>

      <div class="codex-section">
        <h3>👑 守層首領分析 (Boss Intel)</h3>
        <p><b>首領代號：</b>虛空漫遊者 (Void Stalker)</p>
        <p><b>戰術要訣：</b>當 Boss 雙眼泛起赤紅兇芒時即為重斬起手式，在揮砍命中的 0.18 秒黃金窗口右鍵【完美格擋】，可彈開敵刀並令其陷入 1.8 秒失衡硬直！</p>
      </div>
    `;
  }

  /**
   * 綁定設定控制項 (靈敏度、FOV、音量)
   */
  private bindSettingsControls() {
    // 1. 滑鼠靈敏度
    const sensSlider = document.getElementById('settings-sens') as HTMLInputElement;
    const sensVal = document.getElementById('settings-sens-val');
    if (sensSlider && sensVal) {
      sensSlider.addEventListener('input', () => {
        const val = parseFloat(sensSlider.value);
        sensVal.innerText = `${val.toFixed(1)}x`;
        // 設定到玩家
        (this.player as any).mouseSensitivity = val * 0.0022;
      });
    }

    // 2. 視角範圍 FOV
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

    // 3. 全螢幕開關按鈕
    document.getElementById('settings-toggle-fs')?.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }
}
