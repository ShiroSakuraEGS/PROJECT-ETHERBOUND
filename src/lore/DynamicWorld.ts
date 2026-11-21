import worldStateData from './world_state.json';

export interface WorldState {
  epoch: number;
  worldName: string;
  unlockedLayers: number;
  currentWeather: {
    name: string;
    description: string;
    buffType: string;
    damageBonus: number;
    staminaBonus: number;
  };
  activeWorldEvent: {
    title: string;
    description: string;
    discoveredNpc: string;
  };
  lastEvolvedAt: string;
  evolutionLog: string[];
}

/**
 * 動態世界管理器 (DynamicWorld)
 * 負責在遊戲運行時讀取每小時由 Gemini Task 進化的世界設定與天候 Buff
 */
export class DynamicWorld {
  public state: WorldState;

  constructor() {
    this.state = worldStateData as WorldState;
  }

  public get damageMultiplier(): number {
    return this.state.currentWeather.damageBonus || 1.0;
  }

  public get staminaRegenMultiplier(): number {
    return this.state.currentWeather.staminaBonus || 1.0;
  }

  public getWeatherSummary(): string {
    return `[紀元 ${this.state.epoch}] 天候：${this.state.currentWeather.name} | ${this.state.currentWeather.description}`;
  }

  public getWorldEventSummary(): string {
    return `⚡ 世界動態：${this.state.activeWorldEvent.title} — ${this.state.activeWorldEvent.description}`;
  }
}
