---
name: ink-studio-stylization
description: >-
  專精於 @shapeshift-labs/ink-studio 的水墨藝術著色、SDF 雕塑世界生成、相機衝擊動力學（Camera Impulses）與大氣深度色階。
  當使用者需要為 Three.js / WebGL 遊戲加入水墨筆觸（Ink Brushwork）、邊緣墨暈（Ink Bleed）、阻尼彈簧震動、像素光斑或獨特藝術風格化渲染時，自動啟用此技能。
---

# Ink Studio 藝術風格化與大氣渲染技能

本技能整合自 `@shapeshift-labs/ink-studio` 核心技術，負責賦予《PROJECT: ETHERBOUND》獨特的水墨以太（Ether-Ink）東方幻想藝術風格，並提供物理相機衝擊與大氣渲染。

---

## 1. 核心三大支柱能力

1. **水墨筆觸與墨暈粒子（Ink Splat & Brushwork）**：
   - 刀劍斬擊時產生非純幾何的「水墨筆觸光軌」與「四散飛濺的墨漬光斑（Ink Splats）」。
   - 墨點具備擴散係數（Bleed Rate）、表面張力與漸變衰減。
2. **阻尼相機衝擊系統（Spring-Damper Camera Impulses）**：
   - 告別廉價的隨機震動，採用二階彈簧阻尼系統（Spring Dynamics）：
     $$a = -k \cdot x - c \cdot v + F_{\text{impact}}$$
   - 揮劍、重斬命中與受擊時產生帶有方向性後座力與自然回彈的相機動量。
3. **大氣深度階調（Atmospheric Depth Bands & Palette）**：
   - 採用以太界域限定調色盤（Ether Palette：深邃墨夜藍 `#050811`、青翠以太 `#00e5ff`、古代鎏金 `#ffd700`、墨玉灰 `#37474f`）。
   - 依據與相機距離計算指數階梯霧靄，營造深邃幽遠的幻想空間。

---

## 2. 核心 C# / TypeScript 模組對應

- `CameraImpulse.ts`：二階物理彈簧相機震動器。
- `InkBrushTrail.ts`：帶有墨暈毛邊擴散的斬擊光軌。
- `AtmospherePalette.ts`：場景階調與天空霧氣著色器。
