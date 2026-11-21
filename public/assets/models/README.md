# 3D 外部模型存放目錄 (3D Assets Directory)

您可以將從 **Sand3D Explorer**、**Objaverse** 或 **Kenney** 下載的 `.glb` / `.gltf` 檔案放置於此目錄中。

## 常用命名規範：
- `sword.glb`：替代玩家手持長劍
- `shield.glb`：玩家防禦持握盾牌
- `dummy.glb`：替代訓練場木人
- `enemy_soldier.glb`：替代敵方以太衛兵
- `pillar.glb`：替代競技場周邊石柱

專案中的 `ModelLoader.ts` 會自動掃描並載入對應的模型；若尚未放置，則自動切換為高質感程序化以太模型。
