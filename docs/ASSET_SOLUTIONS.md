# PROJECT: ETHERBOUND — 3D 素材獲取全攻略與 Sand3D 評估手冊

針對遊戲開發中「缺少 3D 模型與素材」的痛點，本文件深入評估 [`Sandflow/sand3d-explorer`](https://huggingface.co/spaces/Sandflow/sand3d-explorer)，並提供一套完整的**開源免費 3D 模型素材解決方案**。

---

## 一、Sand3D Explorer 能否解決沒有素材的問題？

> [!NOTE]
> **結論：能解決「靜態道具、武器、環境建築」的龐大需求，但需要配合其他工具補齊「角色動畫骨骼」。**

### 1. Sand3D 的核心價值
- **直連全球最大 3D 資料集 Objaverse**：
  Sand3D 背後的資料集包含數十萬個開源 3D 物件，涵蓋中世紀冷兵器（長劍、短劍、盾牌、戰鎚）、防具（頭盔、胸甲）、場景物件（石碑、木箱、火把架、城牆柱）等。
- **Code-as-3D（程式碼即模型）**：
  每個模型都有簡短的 Python 程式碼描述，具備可編輯性與標準 `.glb` 導出格式。
- **天然契合 Three.js**：
  所有產出的模型皆為 Web 業界標準的 `GLB / GLTF` 格式，可直接由專案中的 `ModelLoader` 一鍵載入。

### 2. Sand3D 的局限性
- **缺少骨骼動畫（Rigged Skeletal Animation）**：
  Sand3D 中的物件多數是靜態幾何體，若需要具有「走、跑、跳、被攻擊硬直、倒地」的敵人與人形怪物，需要骨骼與動作剪輯（Animation Clips）。

---

## 二、推薦的「黃金素材組合拳」（零成本、商用友善）

為了讓《PROJECT: ETHERBOUND》擁有高品質素材，推薦以下三大免費開源庫搭配使用：

| 素材需求類別 | 推薦最佳開源來源 | 格式 | 說明 |
| :--- | :--- | :--- | :--- |
| **武器與裝備**<br/>(長劍、盾牌、戰斧) | **Sand3D / Objaverse**<br/>或 [Kenney.nl](https://kenney.nl/) | `.glb` | 數萬種中世紀冷兵器，直接下載放入 `public/assets/models/` |
| **角色與怪物**<br/>(衛兵、騎士、骷髏) | **[Mixamo](https://www.mixamo.com/)** (Adobe 免費)<br/>或 **Tripo API** (`threejs-3d-generator`) | `.glb` / `.fbx` | 內建數百種走路、奔跑、揮劍、受擊、格擋的專業動作動畫 |
| **場景與建築**<br/>(石磚、石柱、遺跡) | **Sand3D CAD / SimReady**<br/>或 [Poly Pizza](https://poly.pizza/) | `.glb` | 輕量化 Low-Poly 與高品質 Stylized 建築組件 |
| **以太魔法劍身**<br/>(發光光幕、刀光) | **專案自帶程序化 Mesh** | 程序化代碼 | 無需載入外部檔案，隨滑鼠手勢動態變形、發光與拉出光軌 |

---

## 三、如何在專案中一鍵使用外部 GLB 模型？

專案已內建 [`src/loaders/ModelLoader.ts`](file:///c:/Users/Anubis.Chan/Downloads/unity%20antigravity/src/loaders/ModelLoader.ts)，支援自動尺寸等比縮放與錯誤降級：

```typescript
import { ModelLoader } from './loaders/ModelLoader';

const loader = new ModelLoader();

// 一鍵載入外部下載的長劍模型
const customSword = await loader.loadGLB('/assets/models/knight_sword.glb', 1.2);
if (customSword) {
  player.sword.group.add(customSword);
}
```

> [!TIP]
> 若檔案尚未放入或載入逾時，系統會**自動平滑降級為以太程序化幾何劍身**，絕不報錯閃退！
