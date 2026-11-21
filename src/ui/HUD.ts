import { SlashDirection, GestureResult } from '../combat/GestureRecognizer';

/**
 * 網頁 DOM HUD 管理器 (HUD)
 * 負責同步生命值、體力條、手勢準心導引與格擋提示通知
 */
export class HUD {
  private healthFill: HTMLElement;
  private staminaFill: HTMLElement;
  private crosshair: HTMLElement;
  private gestureIndicator: HTMLElement;
  private combatBanner: HTMLElement;
  private bannerTimeout: number | null = null;

  constructor() {
    this.healthFill = document.getElementById('health-fill')!;
    this.staminaFill = document.getElementById('stamina-fill')!;
    this.crosshair = document.getElementById('crosshair')!;
    this.gestureIndicator = document.getElementById('gesture-indicator')!;
    this.combatBanner = document.getElementById('combat-banner')!;
  }

  /**
   * 更新玩家 HP 與體力條
   */
  public updateStatus(currentHp: number, maxHp: number, currentSp: number, maxSp: number) {
    const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    const spPct = Math.max(0, Math.min(100, (currentSp / maxSp) * 100));

    this.healthFill.style.width = `${hpPct}%`;
    this.staminaFill.style.width = `${spPct}%`;
  }

  /**
   * 更新準心與手勢提示
   */
  public updateStanceUI(inStance: boolean, currentVector?: { dx: number; dy: number; distance: number; angle: number }) {
    if (inStance) {
      this.crosshair.classList.add('in-stance');
      this.gestureIndicator.style.opacity = '1';

      if (currentVector && currentVector.distance > 25) {
        let dirText = '直刺';
        const a = currentVector.angle;
        if (a >= -45 && a < 45) dirText = '👉 右橫斬';
        else if (a >= 45 && a < 135) dirText = '👆 上撩斬';
        else if (a >= -135 && a < -45) dirText = '👇 當頭下劈';
        else dirText = '👈 左橫斬';

        this.gestureIndicator.innerText = dirText;
      } else {
        this.gestureIndicator.innerText = '按住滑動以揮劍';
      }
    } else {
      this.crosshair.classList.remove('in-stance');
      this.gestureIndicator.style.opacity = '0';
    }
  }

  /**
   * 顯示戰鬥橫幅 (例如完美格擋成功)
   */
  public showBanner(text: string, isParry: boolean = false) {
    if (this.bannerTimeout) {
      window.clearTimeout(this.bannerTimeout);
    }
    this.combatBanner.innerText = text;
    this.combatBanner.className = isParry ? 'parry-text' : '';
    this.combatBanner.style.opacity = '1';
    this.combatBanner.style.transform = 'translate(-50%, -50%) scale(1.15)';

    this.bannerTimeout = window.setTimeout(() => {
      this.combatBanner.style.opacity = '0';
      this.combatBanner.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 1200);
  }
}
