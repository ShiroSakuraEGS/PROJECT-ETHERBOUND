---
name: unity-mouse-combat
description: >-
  專精於 Unity 第一人稱滑鼠軌跡即時揮劍（Mouse Directional Sword Combat）系統。
  當使用者需要設計或實作滑鼠軌跡採樣、方向判斷（左/右/上/下斬）、攻擊力道計算、攝影機視角解耦、格擋與彈刀（Parry）、武器物理判定與打擊感反饋時，自動啟用此技能。
---

# Unity 第一人稱滑鼠軌跡劍術戰鬥系統技能

本技能是《PROJECT: ETHERBOUND》的核心靈魂，專門處理玩家透過滑鼠拖曳軌跡直接決定揮劍方向、強度與連招的物理 combat 演算法與 C# 實作。

---

## 1. 核心設計：攝影機與滑鼠揮劍的解耦機制

若滑鼠同時控制第一人稱視角（Look）與揮劍手勢（Slash Gesture），容易造成揮劍時鏡頭劇烈晃動導致頭暈。建議採用「**攻擊架勢模式（Combat Stance Mode）**」：

- **平常狀態（Free Look）**：滑鼠 Delta 自由旋轉第一人稱視角。
- **攻擊狀態（Sword Gesture Mode）**：
  - 玩家按住滑鼠左鍵（Mouse Left）進入揮劍預備架勢。
  - 此時攝影機靈敏度大幅降低（例如降為原先的 10%~20%，或短暫鎖定視角中心）。
  - 系統開始高頻採樣滑鼠螢幕座標點（Screen Position）或 Delta 向量。
  - 當滑鼠滑動位移超過門檻值（Swipe Threshold），判定揮劍方向並觸發攻擊，隨後釋放架勢恢復攝影機控制。

---

## 2. 滑鼠軌跡手勢辨識演算法（Gesture Recognition）

### 方向判定邏輯
1. **向量計算**：記錄起始滑鼠螢幕點 $P_0(x_0, y_0)$ 與結束點 $P_1(x_1, y_1)$，得到手勢位移向量 $\vec{V} = P_1 - P_0$。
2. **正規化與夾角**：計算方向角度 $\theta = \text{atan2}(V_y, V_x) \times \frac{180}{\pi}$。
3. **四方向/八方向映射**：
   - **右斬（Right Slash）**：$-45^\circ \le \theta < 45^\circ$
   - **上斬（Upward Slash）**：$45^\circ \le \theta < 135^\circ$
   - **左斬（Left Slash）**：$135^\circ \le \theta \le 180^\circ$ 或 $-180^\circ \le \theta < -135^\circ$
   - **下劈（Downward Slash）**：$-135^\circ \le \theta < -45^\circ$
4. **滑動速度與力道計算**：
   $$\text{Speed} = \frac{|\vec{V}|}{\Delta t}$$
   - 若 $\text{Speed} > \text{FastThreshold}$：判定為**重斬（Heavy Slash）**，消耗較多體力，造成破防或較大硬直。
   - 若 $\text{Speed} \le \text{FastThreshold}$：判定為**輕斬（Light Slash）**，出手快、消耗體力低。

---

## 3. 防禦與完美格擋系統（Parry & Block）

- **普通防禦（Block）**：按住滑鼠右鍵進入格擋架勢，降低承受傷害 70%，消耗體力（Stamina）。
- **完美格擋（Perfect Parry）**：
  - 在敵人攻擊命中前的 **0.15 ~ 0.2 秒（Parry Window）** 內按下右鍵。
  - 觸發彈刀火花特效與重金屬音效。
  - 免疫所有傷害，不消耗體力，並使敵人陷入 **失去平衡硬直（Staggered）** 狀態。

---

## 4. 打擊感反饋三要素（Combat Juice）

1. **打擊頓挫（Hitstop / Frame Freeze）**：命中瞬間讓時間尺度短暫縮短（如 `Time.timeScale = 0.05f` 持續 0.06 秒），帶來厚重打擊感。
2. **螢幕微震（Camera Shake）**：依據攻擊強度在命中瞬間觸發短暫微小的 Cinemachine Impulse 或相機抖動。
3. **命中火花與軌跡特效（Slash Trail & Sparks）**：利用 Trail Renderer 與 Particle System 在揮劍路徑產生以太刀光。

---

## 5. 核心 C# 腳本職責劃分

- `MouseCombatInput.cs`：採樣滑鼠軌跡、手勢方向判定、計算滑動速度。
- `SwordController.cs`：控制劍身姿態插值（Procedural Swing）、配合動畫播放或物理軌跡。
- `WeaponHitbox.cs`：利用 `BoxCast` 或刀刃兩端軌跡線段檢測碰撞，防止高速揮劍穿越物件（Tunneling）。
- `DamageSystem.cs`：接收打擊事件，計算護甲減免、格擋抵消與扣除生命值。
