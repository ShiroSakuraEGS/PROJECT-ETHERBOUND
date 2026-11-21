/**
 * 滑鼠揮劍方向枚舉
 */
export enum SlashDirection {
  Left = 'LEFT_SLASH',      // 左橫斬
  Right = 'RIGHT_SLASH',    // 右橫斬
  Up = 'UPWARD_SLASH',      // 上撩斬
  Down = 'DOWNWARD_SLASH',  // 下劈斬
  Thrust = 'THRUST'         // 直刺 (手勢位移極小或點擊)
}

/**
 * 揮劍手勢分析結果
 */
export interface GestureResult {
  direction: SlashDirection;
  isHeavy: boolean;          // 是否為高速重斬
  speed: number;             // 滑動速率 (像素/毫秒)
  angle: number;             // 手勢角度 (-180° ~ 180°)
  vector: { x: number; y: number };
}

/**
 * 滑鼠手勢辨識器 (GestureRecognizer)
 * 負責在玩家按住滑鼠左鍵期間採樣螢幕座標軌跡，
 * 計算位移向量、角度映射與速度分析。
 */
export class GestureRecognizer {
  private isSampling: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private currentX: number = 0;
  private currentY: number = 0;
  private startTime: number = 0;

  // 門檻設定
  private readonly MIN_DISTANCE = 35; // 最小手勢像素位移 (低於此判定為直刺)
  private readonly HEAVY_SPEED_THRESHOLD = 0.85; // 重斬判定速率 (像素/毫秒)

  /**
   * 進入揮劍架勢，開始採樣軌跡
   */
  public startStance(x: number, y: number) {
    this.isSampling = true;
    this.startX = x;
    this.startY = y;
    this.currentX = x;
    this.currentY = y;
    this.startTime = performance.now();
  }

  /**
   * 滑鼠移動更新點位
   */
  public updatePoint(deltaX: number, deltaY: number) {
    if (!this.isSampling) return;
    this.currentX += deltaX;
    this.currentY += deltaY;
  }

  /**
   * 取得即時目前累積的手勢向量長度與角度 (用於動態更新 HUD 羅盤指針)
   */
  public getCurrentVector() {
    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY;
    const distance = Math.hypot(dx, dy);
    const angle = (Math.atan2(-dy, dx) * 180) / Math.PI; // 轉為上正下負角度
    return { dx, dy, distance, angle };
  }

  /**
   * 結束架勢，計算最終揮劍手勢判定
   */
  public finishStance(): GestureResult {
    this.isSampling = false;
    const dx = this.currentX - this.startX;
    const dy = this.currentY - this.startY; // 螢幕 Y 朝下
    const dt = Math.max(1, performance.now() - this.startTime);

    const distance = Math.hypot(dx, dy);
    const speed = distance / dt;
    const isHeavy = speed >= this.HEAVY_SPEED_THRESHOLD;

    // 計算數學角度 (-180 ~ +180 度，向右為 0 度，向上為 90 度)
    const angle = (Math.atan2(-dy, dx) * 180) / Math.PI;

    let direction = SlashDirection.Thrust;

    if (distance >= this.MIN_DISTANCE) {
      if (angle >= -45 && angle < 45) {
        direction = SlashDirection.Right; // 右橫斬
      } else if (angle >= 45 && angle < 135) {
        direction = SlashDirection.Up; // 上撩斬
      } else if (angle >= -135 && angle < -45) {
        direction = SlashDirection.Down; // 下劈斬
      } else {
        direction = SlashDirection.Left; // 左橫斬
      }
    }

    return {
      direction,
      isHeavy,
      speed,
      angle,
      vector: { x: dx, y: dy }
    };
  }

  public get active(): boolean {
    return this.isSampling;
  }
}
