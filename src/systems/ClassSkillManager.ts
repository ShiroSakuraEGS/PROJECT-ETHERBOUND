import { CLASSES, ClassDefinition, WEAPONS_CATALOG, WeaponData, INITIAL_SKILLS, SkillNode } from '../lore/AetherisLore';

/**
 * 職業、技能樹與武器管理系統 (ClassSkillManager)
 * 依照《project-etherbound 設定集 v2》第 04、05 規格書實裝：
 * 1. 支援 5 大主職業即時切換與特性加成 (Parry 窗口、傷害倍率、以太消耗)
 * 2. 支援技能點 (Skill Points) 分配與 3 大天賦分支加點
 * 3. 支援武器庫裝備即時切換
 */
export class ClassSkillManager {
  public currentClass: ClassDefinition;
  public currentWeapon: WeaponData;
  public skills: SkillNode[];
  public skillPoints: number = 3; // 初始贈送 3 點天賦點數

  public onClassChanged?: (newClass: ClassDefinition) => void;
  public onWeaponChanged?: (newWeapon: WeaponData) => void;
  public onSkillUpgraded?: (skill: SkillNode) => void;

  constructor() {
    this.currentClass = CLASSES.swordsman;
    this.currentWeapon = WEAPONS_CATALOG[0]; // 新手精鋼直劍
    // 深拷貝初始技能
    this.skills = JSON.parse(JSON.stringify(INITIAL_SKILLS));
  }

  /**
   * 切換主職業
   */
  public selectClass(classId: string): boolean {
    if (CLASSES[classId]) {
      this.currentClass = CLASSES[classId];
      if (this.onClassChanged) {
        this.onClassChanged(this.currentClass);
      }
      return true;
    }
    return false;
  }

  /**
   * 裝備武器
   */
  public equipWeapon(weaponId: string): boolean {
    const found = WEAPONS_CATALOG.find(w => w.id === weaponId);
    if (found) {
      this.currentWeapon = found;
      if (this.onWeaponChanged) {
        this.onWeaponChanged(this.currentWeapon);
      }
      return true;
    }
    return false;
  }

  /**
   * 天賦技能升級
   */
  public upgradeSkill(skillId: string): boolean {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return false;

    if (this.skillPoints >= skill.cost && skill.currentLevel < skill.maxLevel) {
      this.skillPoints -= skill.cost;
      skill.currentLevel += 1;
      if (this.onSkillUpgraded) {
        this.onSkillUpgraded(skill);
      }
      return true;
    }
    return false;
  }

  /**
   * 取得有效格擋 (Parry) 窗口秒數 (基礎 0.18s + 職業加成)
   */
  public get parryWindow(): number {
    return Math.max(0.12, 0.18 + this.currentClass.parryWindowBonus);
  }

  /**
   * 取得綜合物理傷害 (武器 ATK * 職業倍率 * 天賦加成)
   */
  public get totalPhysicalDamage(): number {
    const offSkill = this.skills.find(s => s.id === 'sk_off_1');
    const talentBonus = 1.0 + (offSkill ? offSkill.currentLevel * offSkill.valuePerLevel : 0);
    return Math.round(this.currentWeapon.atk * this.currentClass.damageMultiplier * talentBonus);
  }

  /**
   * 取得以太技能體力消耗 (基礎 40 SP 乘上職業減免)
   */
  public get skillStaminaCost(): number {
    return Math.round(40 * (1.0 - this.currentClass.skillCostReduction));
  }

  /**
   * 取得每次成功彈刀 (Parry) 恢復之生命值
   */
  public get parryHealAmount(): number {
    const healSkill = this.skills.find(s => s.id === 'sk_def_2');
    return healSkill ? healSkill.currentLevel * healSkill.valuePerLevel : 0;
  }

  /**
   * 取得體力上限加成
   */
  public get maxStaminaBonus(): number {
    const staSkill = this.skills.find(s => s.id === 'sk_def_1');
    return staSkill ? staSkill.currentLevel * staSkill.valuePerLevel : 0;
  }

  /**
   * 取得脫戰每秒回血
   */
  public get outOfCombatRegen(): number {
    const regenSkill = this.skills.find(s => s.id === 'sk_util_1');
    return regenSkill ? regenSkill.currentLevel * regenSkill.valuePerLevel : 0;
  }
}
