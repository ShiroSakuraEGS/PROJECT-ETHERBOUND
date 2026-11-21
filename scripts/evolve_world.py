#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
艾瑟里斯 (Aetheris) 世界進化引擎 (World Evolution Engine)
每小時由 Gemini Task 排程執行，自動豐富世界觀設定、天候事件與探索樓層。
"""

import json
import random
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STATE_FILE = BASE_DIR / 'src' / 'lore' / 'world_state.json'
EVO_DIR = BASE_DIR / 'docs' / 'lore' / 'world_evolution'
EVO_DIR.mkdir(parents=True, exist_ok=True)

# 候選天候庫 (具有不同數值 Buff 與氛圍)
WEATHER_POOL = [
    {
        "name": "以太極光嵐 (Aether Aurora)",
        "description": "天穹灑落青翠星光，全體冒險者的以太劍氣傷害提升 25%，體力恢復加快 15%。",
        "buffType": "AETHER_BOOST",
        "damageBonus": 1.25,
        "staminaBonus": 1.15
    },
    {
        "name": "星辰重力共鳴 (Celestial Gravity Surge)",
        "description": "星環引力增強，跳躍高度上升 30%，重斬破防威力加成 40%！",
        "buffType": "GRAVITY_SURGE",
        "damageBonus": 1.40,
        "staminaBonus": 1.05
    },
    {
        "name": "虛空微光薄霧 (Void Twilight Mist)",
        "description": "虛空能量短暫滲透，敵方攻擊更具侵略性，但擊倒敵人可獲得雙倍星屑幣！",
        "buffType": "VOID_CHALLENGE",
        "damageBonus": 1.10,
        "staminaBonus": 1.0
    },
    {
        "name": "星鐵鍛爐狂潮 (Smith's Forge Heatwave)",
        "description": "高層熔岩熱氣下湧，金屬共鳴強烈，完美格擋（Parry）彈刀硬直延長至 2.5 秒！",
        "buffType": "PARRY_OVERLOAD",
        "damageBonus": 1.20,
        "staminaBonus": 1.20
    }
]

# 候選新樓層情報
LAYER_DISCOVERIES = [
    {"layer": 2, "name": "翡翠鐘乳石窟 (Emerald Caverns)", "features": "古代結晶礦脈、夜行盲蛛、發光蕈類森林"},
    {"layer": 3, "name": "蒼穹星軌迴廊 (Aetherial Skyway)", "features": "半露天浮石走廊、狂風飛行魔鳥、失落星圖碑"},
    {"layer": 4, "name": "熔岩星鐵鍛爐 (Magma Forge Tier)", "features": "地底熾熱熔岩湖、古代巨神兵殘骸、精鍊星鐵礦"},
    {"layer": 5, "name": "永凍冰晶裂谷 (Frostbound Chasm)", "features": "極寒冰刃幽靈、隱居老劍士、冰晶防禦符石"}
]

# 候選新 NPC 與事件
NPC_ENCOUNTERS = [
    "流浪劍客「辛（Shin）」在第 1 層邊緣紮營，傳授雙重拔刀斬訣竅。",
    "蒼穹情報網情報販子「維斯帕」破解了古代石碑，發現隱藏密室地圖！",
    "鍛造師艾琳研究出星鐵淬火新工法，武器附魔效果顯著增強！",
    "藥劑師米拉在草叢中發現了稀有的「月光仙人掌」，調配出超大回血藥水！"
]

def evolve():
    if not STATE_FILE.exists():
        print(f"Error: {STATE_FILE} not found.")
        return

    with open(STATE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    epoch = data.get('epoch', 1) + 1
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 選擇新天候與事件
    weather = random.choice(WEATHER_POOL)
    discovered_layer = LAYER_DISCOVERIES[min(epoch - 1, len(LAYER_DISCOVERIES) - 1)]
    event_npc = random.choice(NPC_ENCOUNTERS)

    event_title = f"第 {discovered_layer['layer']} 層【{discovered_layer['name']}】探索進程推進"
    event_desc = f"探測隊回報：{discovered_layer['features']}。{event_npc}"

    log_entry = f"【紀元 {epoch} 進化達成】天候轉化為「{weather['name']}」，解鎖情報：{discovered_layer['name']}。"

    # 更新世界狀態
    data['epoch'] = epoch
    data['unlockedLayers'] = max(data.get('unlockedLayers', 1), discovered_layer['layer'])
    data['currentWeather'] = weather
    data['activeWorldEvent'] = {
        "title": event_title,
        "description": event_desc,
        "discoveredNpc": event_npc
    }
    data['lastEvolvedAt'] = now_str
    data['evolutionLog'].insert(0, log_entry)

    # 寫回 JSON
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 產出該紀元的詳細 Markdown 歷史檔案
    evo_md = EVO_DIR / f"epoch_{epoch:03d}.md"
    evo_content = f"""# 艾瑟里斯世界進化檔案 — 紀元 {epoch}

- **進化時間**：{now_str}
- **天候狀態**：{weather['name']}
- **天候效果**：{weather['description']}
- **活躍事件**：{event_title}
- **詳細描述**：{event_desc}
- **解鎖樓層情報**：第 {discovered_layer['layer']} 層 — {discovered_layer['name']} ({discovered_layer['features']})
- **歷史日誌**：{log_entry}

---
*本文件由 Gemini Task 自動化世界引擎定時生成，記錄《PROJECT: ETHERBOUND》的持續進化歷程。*
"""
    evo_md.write_text(evo_content, encoding='utf-8')

    print(f"Successfully evolved to Epoch {epoch} at {now_str}.")
    print(f"Weather: {weather['name']}")
    print(f"Event: {event_title}")

if __name__ == '__main__':
    evolve()
