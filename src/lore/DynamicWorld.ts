import worldStateData from './world_state.json';

export interface FloorInfo {
  floor_id: number;
  name_en: string;
  name_tc: string;
  safe_zone: string;
  description: string;
}

export interface FactionInfo {
  id: string;
  name: string;
  leader: string;
}

export interface WeatherInfo {
  name: string;
  description: string;
  buffType: string;
  damageBonus: number;
  staminaBonus: number;
}

export interface WorldEventInfo {
  title: string;
  description: string;
  discoveredNpc: string;
}

export interface WorldState {
  epoch: number;
  worldName: string;
  currentFloor?: FloorInfo;
  unlockedLayers: number;
  currentWeather: WeatherInfo;
  activeWorldEvent: WorldEventInfo;
  factions?: FactionInfo[];
  lastImportedAt?: string;
  lastEvolvedAt?: string;
  importSource?: string;
  evolutionLog: string[];
}

/**
 * 官方世界設定管理器 (DynamicWorld)
 * 嚴格依據使用者導入的官方設定文檔驅動遊戲世界狀態與天候加成，
 * 杜絕隨機虛構與任意寬大世界觀。
 */
export class DynamicWorld {
  public state: WorldState;

  constructor() {
    this.state = worldStateData as WorldState;
  }

  public get damageMultiplier(): number {
    return this.state.currentWeather?.damageBonus || 1.0;
  }

  public get staminaRegenMultiplier(): number {
    return this.state.currentWeather?.staminaBonus || 1.0;
  }

  public getWeatherSummary(): string {
    return `[紀元 ${this.state.epoch}] 天候：${this.state.currentWeather.name} | ${this.state.currentWeather.description}`;
  }

  public getWorldEventSummary(): string {
    return `⚡ 世界動態：${this.state.activeWorldEvent.title} — ${this.state.activeWorldEvent.description}`;
  }

  public getCurrentFloorSummary(): string {
    if (this.state.currentFloor) {
      return `第 ${this.state.currentFloor.floor_id} 層：${this.state.currentFloor.name_tc}（安全區：${this.state.currentFloor.safe_zone}）`;
    }
    return `艾瑟里斯 第 1 層 始源鎮`;
  }
}
