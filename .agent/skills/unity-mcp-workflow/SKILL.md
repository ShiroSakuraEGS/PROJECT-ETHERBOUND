---
name: unity-mcp-workflow
description: >-
  專精於 Unity Editor 自動化腳本、場景快速建置工具與 Unity MCP Server 整合。
  當使用者需要利用 C# Editor 腳本自動生成遊戲物件、設定 Inspector 參數、整合 Unity MCP 進行即時場景操作與檢視 Console 報錯時，自動啟用此技能。
---

# Unity 自動化與 MCP 整合工作流技能

本技能提供 Antigravity 在無法直接「手動操作 Unity 滑鼠」時的強大外掛能力——透過自動編寫 **Unity Editor Utility 腳本** 或連接 **Unity MCP Server**，實現場景物件一鍵生成、元件自動裝配與錯誤自動分析。

---

## 1. 免 MCP 模式：強大的 Editor 自動化腳本（One-Click Setup）

在使用者尚未安裝 MCP Server 之前，Antigravity 可在專案的 `Assets/_Project/Editor/` 資料夾下編寫客製化選單腳本：

### 常用自動化腳本範例：
1. **`SetupCombatArenaMenu.cs`**：
   - 在 Unity 上方選單建立 `Etherbound > Build Combat Arena`。
   - 點擊後透過程式碼自動在場景中建立 Ground Plane、四周石牆、光源、Player 膠囊體與 Enemy 實體，並自動掛載對應 C# 元件。
2. **`InputActionsGenerator.cs`**：
   - 自動生成或配置新版 Input System 的 Action Map（包含 Move, Look, SlashHold, SwipeVector, Block, Interact）。
3. **`ComponentBinderUtility.cs`**：
   - 一鍵自動搜尋場景中的攝影機、音效監聽器與 Hitbox 並完成欄位參照關聯，免除使用者手動拖曳 Inspector 的繁瑣操作。

---

## 2. Unity MCP 整合模式（第二階段進階）

當專案需要 Antigravity 直接與執行中的 Unity Editor 通訊時，可引入相容的 Unity MCP Server：

### MCP 核心工作能力對應：
- **`unity_create_gameobject`**：直接在當前打開的場景建立階層物件。
- **`unity_add_component`**：為物件掛載指定 C# 腳本。
- **`unity_set_inspector_property`**：設定移動速度、攻擊力、生命值等序列化欄位。
- **`unity_get_console_logs`**：讀取 Unity Editor Console 中的 Compilation Errors 與 Runtime Exceptions，讓 Antigravity 即時修復 Bug。
- **`unity_toggle_playmode`**：啟動或停止 Play Mode 進行回歸測試。

---

## 3. 故障排除與除錯 SOP（Troubleshooting）

1. **CS0246 命名空間遺失**：
   - 檢查是否安裝新版 Input System (`com.unity.inputsystem`)、URP (`com.unity.render-pipelines.universal`) 或 TextMeshPro。
2. **Input System 無法響應**：
   - 檢查 `ProjectSettings/Player` 中 Active Input Handling 是否設為 `Input System Package (New)` 或 `Both`。
3. **滑鼠鎖定與釋放**：
   - 確保在進入遊戲與開啟 UI 介面時正確切換 `Cursor.lockState = CursorLockMode.Locked` 與 `CursorLockMode.None`。
