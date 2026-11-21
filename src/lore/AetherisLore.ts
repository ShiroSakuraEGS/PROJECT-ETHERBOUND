/**
 * 艾瑟里斯 (Aetheris) 世界觀與核心資料設定
 * 提取自官方企劃設定集：
 * - 舞台: 艾瑟里斯浮空遺跡塔 (Aetheris)
 * - 貨幣: 星屑幣 (Cor) / 乙太碎片 (Aether Shard)
 * - 勢力: 破曉之劍、鍛造同盟、蒼穹情報網
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
      greeting: '醒來了嗎，無籍的覺醒者？這裡是艾瑟里斯第 1 層的試煉之庭。若想登上海拔百層的蒼穹樞紐，先證明你的劍術吧。',
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
