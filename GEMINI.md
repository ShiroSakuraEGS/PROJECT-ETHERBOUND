# PROJECT: ETHERBOUND — 開發專案自定義規則 (GEMINI.md)

## 1. 語言與註解規範
- 回應語言：永遠使用**繁體中文**（台灣習慣用語）。
- 程式碼註解：所有新增與修改之 C# 腳本、Shader 與配置檔案，其註解皆**強制使用繁體中文**撰寫。

## 2. 專案技術標準 (Unity 6 & URP)
- **引擎版本**：Unity 6（6000.x）通用渲染管線（Universal Render Pipeline - URP）。
- **輸入系統**：一律使用新版 `UnityEngine.InputSystem`（Action Maps），不使用舊版 `Input.GetAxis()`。
- **角色控制**：第一人稱玩家使用 `CharacterController` 配合自訂重力與地面判定。
- **AI 導航**：使用 `UnityEngine.AI` (NavMesh)。
- **程式架構**：
  - 遵循單一職責原則（SRP），嚴禁將輸入、相機、戰鬥、屬性寫在同一個龐大腳本中。
  - 使用事件驅動機制（`System.Action` 或 UnityEvent）進行系統間溝通。
  - 記憶體敏感操作優先使用非分配記憶體 API（如 `RaycastNonAlloc`、`OverlapSphereNonAlloc`）。

## 3. 戰鬥核心：滑鼠軌跡揮劍規範 (Mouse Gesture Combat)
- **解耦模式**：攻擊時必須採用「攻擊架勢（Combat Stance）」或相機平滑衰減，避免玩家揮劍時視角劇烈甩動。
- **手勢判定**：透過螢幕像素或標準化向量計算手勢位移 $\vec{V}$ 與滑動速度，精準區分「左斬、右斬、上斬、下劈」以及「輕斬 vs 重斬」。
- **反饋優先**：必須包含打擊頓挫（Hitstop）、相機微震（Screen Shake）、火花粒子（Hit Spark）與音效反饋。

## 4. 協作分工與回報模式
- 遇到需要 Unity 編輯器操作的步驟（如專案設定、Layer/Tag 配置、Inspector 拖曳關聯），必須提供清晰條列的手動操作指南。
- 程式碼先行提供可獨立運作的骨架與 Primitive 佔位測試，驗收通過後再擴充複雜度。
