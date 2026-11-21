---
name: unity-level-world-design
description: >-
  專精於 Unity 關卡設計、灰模原型（Greyboxing）、開放世界區域切分與 RPG 探索機制。
  當使用者需要設計戰鬥測試場景（CombatArena）、艾爾諾斯（Aelnos）城鎮與森林、NPC 對話任務、物資拾取與世界物件時，自動啟用此技能。
---

# Unity 關卡與開放世界原型設計技能

本技能負責《PROJECT: ETHERBOUND》的場景空間規劃、第一人稱空間尺度設計、白盒灰模（Greyboxing）搭建與開放世界核心探索機制。

---

## 1. 空間尺度原則（First-Person Scale Guidelines）

第一人稱視角對空間尺度極為敏感，過窄或過矮的空間會造成壓迫感與操作不順暢：
- **標準玩家規格**：
  - 身高（Height）：1.8 公尺（Unity Unit = 1m）
  - 膠囊半徑（Radius）：0.4 公尺
  - 視角高度（Eye Level）：1.65 公尺
- **戰鬥空間規範**：
  - 室內走廊寬度：至少 3.0 ~ 4.0 公尺（確保玩家有揮劍與側跳閃避空間）。
  - 訓練場/競技場直徑：不小於 15 ~ 20 公尺。
  - 障礙物與武器展示架：高度在 0.8 ~ 1.2 公尺之間。

---

## 2. 測試競技場（CombatArena）白盒配置標準

初期不依賴高精細美術模型，直接透過 Unity 內建 Primitive（Cube, Cylinder, Plane）搭建：
1. **戰鬥中庭（Center Ring）**：20x20 公尺平坦石質地面，供移動與滑鼠揮劍測試。
2. **木人訓練區（Dummy Zone）**：放置固定不扣血的訓練木人，標記不同高度方向受擊點。
3. **敵人對抗區（Sparring Zone）**：放置巡邏中、持劍持盾的敵人 AI。
4. **武器架（Weapon Rack）**：放置可互動拾取的長劍、大劍、刺劍。
5. **光源設置**：主 Directional Light 配合柔和環境光（Ambient Light），開啟基本陰影以看清攻擊距離感。

---

## 3. 開放世界第一區域：艾爾諾斯（Aelnos）結構劃分

依照模組化方式將初始區域切分為四個連貫子區塊：
1. **艾爾諾斯守護堡（Town Center）**：安全區，配置武器鍛造鐵匠、旅店、基礎委託告示板。
2. **靜語樹林（Whispering Woods）**：低威脅野外區，初階以太野獸、草藥採集點、散落的石碑。
3. **古代以太遺跡（Ancient Ether Ruins）**：地下或半露天迷宮，包含機關、精英以太守衛與隱藏劍術手卷。
4. **邊境隘口（Border Pass）**：前往灰燼荒原的必經之路，高威脅度守門怪。

---

## 4. RPG 交互系統標準框架

- `IInteractable.cs`：通用介面，包含 `OnFocus()`、`OnLoseFocus()`、`Interact(Player player)`。
- `DialogueSystem.cs`：輕量對話控制器，支援多行對話與分支選擇。
- `ItemPickup.cs`：第一人稱射線偵測（Raycast 2.5m 內），提示按 `E` 拾取並掛載到武器插槽或背包。
