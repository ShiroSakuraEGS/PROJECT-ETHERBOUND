import { Inventory } from '../items/Inventory';
import { NPCS, NPCInfo } from '../lore/AetherisLore';

export enum QuestStage {
  Awakening = 0,    // 階段 0: 始源試劍 (測試揮劍與 Q 鍵)
  KnightTrial = 1,  // 階段 1: 破曉試煉 (向雷歐納德報到，成功彈刀 Parry 並擊敗試煉衛兵)
  SmithUpgrade = 2, // 階段 2: 星鐵重鑄 (向艾琳報到，升級為蒼穹星鐵劍)
  BossBattle = 3,   // 階段 3: 虛空守護者突破戰 (擊倒虛空漫遊者)
  Victory = 4       // 階段 4: 通過第 1 層
}

export interface QuestData {
  title: string;
  desc: string;
  objective: string;
  targetNpcId?: string;
  isCompleted: boolean;
}

/**
 * 主線任務進程系統 (QuestManager)
 * 依照設定集《03_技能圖鑑、NPC人物誌與初期任務線》設計之完整迴圈
 */
export class QuestManager {
  public stage: QuestStage = QuestStage.Awakening;
  private inventory: Inventory;

  // 任務統計追蹤
  public slashCount: number = 0;
  public skillUsed: boolean = false;
  public parryDone: boolean = false;
  public soldierDefeated: boolean = false;
  public bossDefeated: boolean = false;

  public onQuestUpdated?: (quest: QuestData) => void;
  public onStageChanged?: (newStage: QuestStage) => void;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
  }

  public getCurrentQuest(): QuestData {
    switch (this.stage) {
      case QuestStage.Awakening:
        return {
          title: '主線一：無籍者的甦醒 (The Awakening)',
          desc: '你在艾瑟里斯第 1 層的試煉之庭甦醒，前方有訓練木人。',
          objective: `在木人前揮劍 3 次 (${this.slashCount}/3) 並按下 [Q] 釋放以太劍氣 (${this.skillUsed ? '已達成' : '未達成'})`,
          isCompleted: this.slashCount >= 3 && this.skillUsed
        };

      case QuestStage.KnightTrial:
        return {
          title: '主線二：破曉之劍的認可 (Knight\'s Oath)',
          desc: '與前線副隊長「雷歐納德」對話，接受試煉對抗巡邏衛兵。',
          objective: `靠近雷歐納德按 [E] 對話，並在戰鬥中成功執行一次【⚡ 完美彈刀】(${this.parryDone ? '已完成' : '未完成'})`,
          targetNpcId: 'leonard',
          isCompleted: this.parryDone && this.soldierDefeated
        };

      case QuestStage.SmithUpgrade:
        return {
          title: '主線三：星鐵之刃的重鑄 (The Smiths\' Craft)',
          desc: '鍛造師「艾琳」認可了你的資質，將為你鍛造強大的星鐵劍。',
          objective: '靠近鍛造師艾琳按 [E] 接受鍛造，升級為【蒼穹星鐵劍】',
          targetNpcId: 'aileen',
          isCompleted: false
        };

      case QuestStage.BossBattle:
        return {
          title: '主線四：虛空守護者突破戰 (Void Challenger)',
          desc: '虛空裂隙打開，第 1 層守層菁英「虛空漫遊者」降臨！',
          objective: '擊敗虛空漫遊者，奪得通往第 2 層的封印密鑰！',
          isCompleted: this.bossDefeated
        };

      case QuestStage.Victory:
      default:
        return {
          title: '主線突破：第 1 層攻略完成 (Layer 1 Cleared)',
          desc: '你已經通過了破曉之劍的全部考驗，登頂之路正式開啟！',
          objective: '試玩版本通關！您可以繼續自由探索與測試劍術。',
          isCompleted: true
        };
    }
  }

  public recordSlash() {
    if (this.stage === QuestStage.Awakening && this.slashCount < 3) {
      this.slashCount++;
      this.checkProgress();
    }
  }

  public recordSkill() {
    if (this.stage === QuestStage.Awakening && !this.skillUsed) {
      this.skillUsed = true;
      this.checkProgress();
    }
  }

  public recordParry() {
    if (this.stage === QuestStage.KnightTrial && !this.parryDone) {
      this.parryDone = true;
      this.checkProgress();
    }
  }

  public recordEnemyDefeated(isBoss: boolean) {
    if (isBoss) {
      this.bossDefeated = true;
      this.advanceStage(QuestStage.Victory);
    } else {
      if (this.stage === QuestStage.KnightTrial) {
        this.soldierDefeated = true;
        this.checkProgress();
      }
    }
  }

  /**
   * 與 NPC 交談處理任務推進
   */
  public interactWithNPC(npcId: string): string {
    const npc = NPCS[npcId];
    if (!npc) return '無對話';

    if (npcId === 'leonard') {
      if (this.stage === QuestStage.Awakening) {
        return '先熟悉手中的劍刃吧，覺醒者。在木人前完成基礎斬擊與技能後再來找我。';
      }
      if (this.stage === QuestStage.KnightTrial) {
        if (this.parryDone && this.soldierDefeated) {
          // 完成任務 2，給予獎勵
          this.inventory.addCor(150);
          this.inventory.addPotion(2);
          this.advanceStage(QuestStage.SmithUpgrade);
          return npc.dialogues.questComplete;
        } else {
          return npc.dialogues.questActive;
        }
      }
      return '隨時準備好迎戰更高層的挑戰！';
    }

    if (npcId === 'aileen') {
      if (this.stage === QuestStage.SmithUpgrade) {
        this.inventory.upgradeToSkyboundBlade();
        this.advanceStage(QuestStage.BossBattle);
        return npc.dialogues.questComplete;
      }
      return npc.dialogues.greeting;
    }

    if (npcId === 'mila') {
      this.inventory.addPotion(1);
      return npc.dialogues.greeting;
    }

    return npc.dialogues.greeting;
  }

  private checkProgress() {
    if (this.stage === QuestStage.Awakening && this.slashCount >= 3 && this.skillUsed) {
      this.advanceStage(QuestStage.KnightTrial);
    } else if (this.stage === QuestStage.KnightTrial && this.parryDone && this.soldierDefeated) {
      // 等待向雷歐納德交任務
      this.notify();
    } else {
      this.notify();
    }
  }

  private advanceStage(next: QuestStage) {
    this.stage = next;
    if (this.onStageChanged) {
      this.onStageChanged(next);
    }
    this.notify();
  }

  private notify() {
    if (this.onQuestUpdated) {
      this.onQuestUpdated(this.getCurrentQuest());
    }
  }
}
