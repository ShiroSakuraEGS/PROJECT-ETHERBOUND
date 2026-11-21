/**
 * 艾瑟里斯 (Aetheris) 官方世界觀與系統資料庫
 * 嚴格依據《project-etherbound 設定集 v2》結構化導出：
 * - 04 職業系統、技能樹、生活技能與多元武器
 * - 05 裝備鍛造與數值平衡表
 * - 06 進階樓層設定 (第 6 至 10 層) 與 Boss 機制
 */

export interface NPCInfo {
  id: string;
  name: string;
  title: string;
  affiliation: string;
  avatarColor: string;
  dialogues: {
    greeting: string;
    questActive: string;
    questComplete: string;
  };
}

export const NPCS: Record<string, NPCInfo> = {
  leonard: {
    id: 'leonard',
    name: '雷歐納德 (Leonard)',
    title: '破曉之劍．前線副隊長',
    affiliation: '破曉之劍 (Blade of Dawn)',
    avatarColor: '#78909c',
    dialogues: {
      greeting: '醒來了嗎，無籍的覺醒者？這裡是艾瑟里斯第 1 層的始源之庭。若想登上海拔百層的蒼穹樞紐，先證明你的劍術吧。',
      questActive: '看清敵人的出招軌跡。在刀刃揮落的剎那舉劍反制——只有精準彈反（Parry）才能瓦解高層守護者的霸體。',
      questComplete: '漂亮的一擊！你的反應速度超越了尋常新晉者。帶上這些星屑幣與藥劑，破曉之劍認可你的實力！'
    }
  },
  aileen: {
    id: 'aileen',
    name: '艾琳 (Aileen)',
    title: '星鐵工坊．首席鍛造師',
    affiliation: '鍛造同盟 (Smiths\' Guild)',
    avatarColor: '#ff7043',
    dialogues: {
      greeting: '嘿！你手中那把劍的乙太共鳴頻率非同小可！我是星鐵工坊的艾琳，把武器交給我，我替你注入古代星鐵結晶！',
      questActive: '擊敗試煉守衛，採集其核心留下的乙太碎片，我將為你冶煉出真正能斬裂虛空的「蒼穹之刃」！',
      questComplete: '完成了！看這耀眼的熾金色光軌——這就是我的心血大作【蒼穹星鐵劍】！盡情揮動它吧！'
    }
  },
  mila: {
    id: 'mila',
    name: '米拉 (Mila)',
    title: '微風藥局．植物學者',
    affiliation: '微風藥局 (Breeze Apothecary)',
    avatarColor: '#81c784',
    dialogues: {
      greeting: '請放鬆呼吸，覺醒者。這座塔樓的虛空侵蝕十分危險，身為後勤學者，我為你調配了以太恢復藥水。',
      questActive: '受傷時請按下 [R] 鍵飲用藥劑。願微風與星辰撫平你的創傷。',
      questComplete: '隨時歡迎回來補給。記住，活著登頂，才是我們所有人的心願。'
    }
  }
};

/**
 * 主職業資料結構 (Main Classes)
 * 提取自 04 文檔第一節
 */
export interface ClassDefinition {
  id: string;
  name: string;
  title: string;
  focus: string;
  preferredWeapons: string;
  passiveName: string;
  passiveDesc: string;
  parryWindowBonus: number; // 秒數加成 (例如重裝守護者 +0.08s)
  attackSpeedBonus: number;
  damageMultiplier: number;
  skillCostReduction: number;
}

export const CLASSES: Record<string, ClassDefinition> = {
  swordsman: {
    id: 'swordsman',
    name: '劍士 (Swordsman)',
    title: '均衡近戰專家',
    focus: '力量 STR / 敏捷 AGI',
    preferredWeapons: '單手劍、直劍',
    passiveName: '劍技收招補正',
    passiveDesc: '所有劍技收招硬直縮短 20%，攻守平衡，連招流暢自然。',
    parryWindowBonus: 0.0,
    attackSpeedBonus: 1.2,
    damageMultiplier: 1.0,
    skillCostReduction: 0.0
  },
  guardian: {
    id: 'guardian',
    name: '重裝守護者 (Guardian)',
    title: '不動如山之壁',
    focus: '體魄 VIT / 力量 STR',
    preferredWeapons: '大盾、重劍',
    passiveName: '精準守護反震',
    passiveDesc: '精準彈反（Parry）黃金窗口大幅放寬 +0.08 秒（達 0.26s）！成功彈刀時反震 150% 物理傷害！',
    parryWindowBonus: 0.08,
    attackSpeedBonus: 0.9,
    damageMultiplier: 1.15,
    skillCostReduction: 0.0
  },
  tempest: {
    id: 'tempest',
    name: '疾風劍客 (Tempest Blade)',
    title: '極限暴擊殘影',
    focus: '敏捷 AGI / 技巧 DEX',
    preferredWeapons: '刺劍、太刀、雙刀',
    passiveName: '極限殘影暴擊',
    passiveDesc: '移動速度提升 15%，閃避體力消耗減免，揮砍弱點暴擊率大幅提升！',
    parryWindowBonus: -0.02,
    attackSpeedBonus: 1.4,
    damageMultiplier: 1.25,
    skillCostReduction: 0.1
  },
  spellblade: {
    id: 'spellblade',
    name: '乙太魔劍士 (Aether Spellblade)',
    title: '元素劍壓大師',
    focus: '智力 INT / 力量 STR',
    preferredWeapons: '單手劍、法杖',
    passiveName: '元素以太共鳴',
    passiveDesc: '以太劍氣波 [Q] 體力消耗大幅降低至 25 SP，魔法劍氣範圍與貫穿傷害提高 40%！',
    parryWindowBonus: 0.0,
    attackSpeedBonus: 1.05,
    damageMultiplier: 1.1,
    skillCostReduction: 0.35
  },
  berserker: {
    id: 'berserker',
    name: '狂戰士 (Berserker)',
    title: '逆境血性戰神',
    focus: '力量 STR / 體魄 VIT',
    preferredWeapons: '戰斧、巨型雙手劍',
    passiveName: '逆境血性狂怒',
    passiveDesc: 'HP 越低攻擊力越高；當 HP 低於 40% 時，斬擊附帶吸血效果並獲得 30% 攻速加乘！',
    parryWindowBonus: 0.02,
    attackSpeedBonus: 1.15,
    damageMultiplier: 1.35,
    skillCostReduction: 0.0
  }
};

/**
 * 武器庫資料結構
 * 提取自 05 文檔第一節
 */
export interface WeaponData {
  id: string;
  name: string;
  type: string;
  rarity: '普通' | '精良' | '稀有' | '史詩';
  atk: number;
  critRate: number;
  trait: string;
  description: string;
}

export const WEAPONS_CATALOG: WeaponData[] = [
  {
    id: 'WEAP_001',
    name: '新手精鋼直劍',
    type: '單手劍',
    rarity: '普通',
    atk: 25,
    critRate: 0.02,
    trait: '基礎平衡',
    description: '破曉之劍配發給新晉覺醒者的標準配劍，鍛工嚴謹。'
  },
  {
    id: 'WEAP_006',
    name: '星鐵細劍 (Aether Rapier)',
    type: '刺劍',
    rarity: '稀有',
    atk: 58,
    critRate: 0.15,
    trait: '弱點打擊 +25%',
    description: '艾琳以高純度星鐵礦精煉之刺劍，劍身輕盈如羽，出刀迅猛。'
  },
  {
    id: 'WEAP_004',
    name: '伊爾凡斷斧重劍',
    type: '雙手重劍',
    rarity: '精良',
    atk: 85,
    critRate: 0.05,
    trait: '破韌削防 +20%',
    description: '取自第 1 層守護巨怪骸骨鍛造之巨劍，當頭下劈威力驚人。'
  },
  {
    id: 'WEAP_008',
    name: '蒼穹太刀 (Skybound Katana)',
    type: '太刀',
    rarity: '稀有',
    atk: 105,
    critRate: 0.20,
    trait: '居合拔刀必暴擊',
    description: '融入古代星環羽翼金屬的傳奇太刀，揮砍伴隨金色流光光軌。'
  }
];

/**
 * 技能天賦樹節點結構
 * 提取自 04 文檔第二節
 */
export interface SkillNode {
  id: string;
  name: string;
  branch: 'Offense' | 'Defense' | 'Utility';
  tier: number;
  maxLevel: number;
  currentLevel: number;
  cost: number;
  description: string;
  effectType: string;
  valuePerLevel: number;
}

export const INITIAL_SKILLS: SkillNode[] = [
  {
    id: 'sk_off_1',
    name: '基礎斬擊強化',
    branch: 'Offense',
    tier: 1,
    maxLevel: 5,
    currentLevel: 0,
    cost: 1,
    description: '專注於肌肉與劍勢發力，所有物理斬擊傷害提升 +8%。',
    effectType: 'damageBonus',
    valuePerLevel: 0.08
  },
  {
    id: 'sk_off_2',
    name: '破甲重擊 (Armor Pen)',
    branch: 'Offense',
    tier: 2,
    maxLevel: 3,
    currentLevel: 0,
    cost: 2,
    description: '下劈重斬撕裂敵方防禦，破盾與破韌效率提升 +15%。',
    effectType: 'armorPen',
    valuePerLevel: 0.15
  },
  {
    id: 'sk_def_1',
    name: '體力生生不息',
    branch: 'Defense',
    tier: 1,
    maxLevel: 5,
    currentLevel: 0,
    cost: 1,
    description: '調整呼吸節奏，最大體力上限 +15 SP，自然恢復加快 +10%。',
    effectType: 'staminaMax',
    valuePerLevel: 15
  },
  {
    id: 'sk_def_2',
    name: '精準彈反回血 (Parry Heal)',
    branch: 'Defense',
    tier: 2,
    maxLevel: 3,
    currentLevel: 0,
    cost: 2,
    description: '於 0.18s 窗口成功彈刀時，以太逆流修復身體，立即恢復 15 HP！',
    effectType: 'parryHeal',
    valuePerLevel: 15
  },
  {
    id: 'sk_util_1',
    name: '脫戰以太活化',
    branch: 'Utility',
    tier: 1,
    maxLevel: 3,
    currentLevel: 0,
    cost: 1,
    description: '脫離戰鬥 4 秒後，生命自然以每秒 5 點速率平緩恢復。',
    effectType: 'outOfCombatRegen',
    valuePerLevel: 5
  }
];

/**
 * 第 6 至 10 層進階樓層情報
 * 提取自 06 文檔
 */
export const ADVANCED_FLOORS = [
  {
    floor: 6,
    name: '霜封迴廊 (Frostbound Gallery)',
    safeZone: '暖爐庇護所・暖風驛站',
    hazard: '寒冷值累積機制 (急凍凍傷)、滑冰裂縫',
    boss: '極冰女武神．芙蕾雅 (Freya)',
    bossTactic: '紅光衝鋒必須於最高峰實施精準彈反擊落；紫光冰盾砸擊不可招架，須側面瞬步躲避。'
  },
  {
    floor: 7,
    name: '熾熱熔爐層 (Ember Forge Cavern)',
    safeZone: '鍛造者遺蹟・冷卻避難所',
    hazard: '岩漿噴發、過熱地形 (裝備耐久消耗+300%)',
    boss: '黑曜炎魔．伊格尼斯 (Ignis)',
    bossTactic: '胸口設有過熱以太核心；紫光噴射時繞背攻擊核心可觸發 200% 暴擊破防！'
  },
  {
    floor: 8,
    name: '浮空風車鎮 (Zephyr Haven)',
    safeZone: '風車中央廣場 (蒼穹情報網分部)',
    hazard: '強烈風壓、上升氣流高空躍起跳劈',
    boss: '蒼風劍聖．拉斐爾 (Raphael)',
    bossTactic: '二階段分化風刃殘影；居合出鞘瞬間連續二次彈反可直接震碎殘影。'
  },
  {
    floor: 9,
    name: '幽影迴廊迷宮 (Umbral Labyrinth)',
    safeZone: '提燈者營地 (破曉之劍前線)',
    hazard: '動態旋轉重組黑石、虛空迷霧侵蝕光源',
    boss: '深淵大主教 (Abyssal Hierarch)',
    bossTactic: '虛空低語者主力核心，掌控虛空召喚與現實扭曲結界。'
  },
  {
    floor: 10,
    name: '蒼穹樞紐・第一王座 (Aetheris Apex Tier 1)',
    safeZone: '星環大議會聖所',
    hazard: '古代重力倒懸、全以太光束矩陣',
    boss: '蒼穹代行者・原型機',
    bossTactic: '千年前大斷裂守護者，唯有精通劍技、彈反與元素共鳴的覺醒者方能通過！'
  }
];
