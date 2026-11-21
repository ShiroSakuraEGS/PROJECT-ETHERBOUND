/**
 * 冒險者背包與貨幣管理器 (Inventory)
 * 符合《01_世界觀與浮空塔樓設定_Aetheris》規格：
 * - 貨幣: 星屑幣 (Cor)
 * - 道具: 微風恢復藥劑 (Breeze Potion)
 */
export class Inventory {
  public cor: number = 50;           // 初始攜帶 50 星屑幣
  public potions: number = 3;        // 初始攜帶 3 瓶恢復藥水
  public weaponName: string = '練習用以太長劍';
  public weaponDamageMultiplier: number = 1.0;
  public trailColorHex: number = 0x00e5ff; // 初始青藍色

  public onInventoryChanged?: () => void;

  public addCor(amount: number) {
    this.cor += amount;
    this.notify();
  }

  public addPotion(amount: number) {
    this.potions += amount;
    this.notify();
  }

  /**
   * 飲用微風藥水恢復 HP
   */
  public usePotion(currentHp: number, maxHp: number): { success: boolean; newHp: number } {
    if (this.potions <= 0 || currentHp >= maxHp) {
      return { success: false, newHp: currentHp };
    }

    this.potions--;
    const healAmount = 50;
    const newHp = Math.min(maxHp, currentHp + healAmount);
    this.notify();
    return { success: true, newHp };
  }

  /**
   * 武器升級為【蒼穹星鐵劍】
   */
  public upgradeToSkyboundBlade() {
    this.weaponName = '【蒼穹星鐵劍】(Skybound Blade)';
    this.weaponDamageMultiplier = 1.85; // 傷害大幅提升
    this.trailColorHex = 0xffd700;      // 轉化為耀眼熾金色
    this.notify();
  }

  private notify() {
    if (this.onInventoryChanged) {
      this.onInventoryChanged();
    }
  }
}
