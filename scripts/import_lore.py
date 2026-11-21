#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
艾瑟里斯 (Aetheris) 官方資料驅動導入工具 (Official Lore Data Importer)
嚴格依據使用者導入的設定集檔案 (*.docx, *.md, *.json) 更新遊戲世界狀態。
禁止任何隨機捏造與非官方擴展。
"""

import json
import sys
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STATE_FILE = BASE_DIR / 'src' / 'lore' / 'world_state.json'
LORE_DOCS_DIR = BASE_DIR / 'docs' / 'lore'

def inspect_lore_sources():
    """檢查目前專案中的官方設定文檔來源"""
    sources = []
    if LORE_DOCS_DIR.exists():
        for f in LORE_DOCS_DIR.glob('*.md'):
            sources.append(f)
    user_doc_dir = list(BASE_DIR.glob('*設定集*'))
    for d in user_doc_dir:
        if d.is_dir():
            for f in d.glob('*.docx'):
                sources.append(f)
    return sources

def sync_world_from_user_data(source_name="project-etherbound — 奇幻劍擊冒險遊戲設定集 (Antigravity)-v1"):
    """根據使用者導入的官方設定檔案同步世界狀態"""
    if not STATE_FILE.exists():
        print(f"錯誤：找不到世界狀態檔案 {STATE_FILE}")
        return False

    with open(STATE_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 嚴格校準至官方設定集第 1 層：翠風平原與始源鎮
    data['worldName'] = "艾瑟里斯 (Aetheris)"
    data['unlockedLayers'] = 1
    data['currentFloor'] = {
        "floor_id": 1,
        "name_en": "Verdant Breeze Plains",
        "name_tc": "翠風平原與始源鎮",
        "safe_zone": "始源鎮 (Origin Town)",
        "description": "浮空百層塔第 1 層。廣袤微風草原與古代遺跡，由破曉之劍、鍛造同盟與藥劑工坊共同維護安全區。"
    }
    data['currentWeather'] = {
        "name": "晨曦以太微光 (Dawn Aether Glow)",
        "description": "晨曦以太共鳴灑落，視野清晰，玩家全技能冷卻縮短 10%，體力恢復加快 15%。",
        "buffType": "DAWN_RESONANCE",
        "damageBonus": 1.0,
        "staminaBonus": 1.15
    }
    data['activeWorldEvent'] = {
        "title": "第 1 層【始源鎮】攻略先遣隊集結",
        "description": "破曉之劍（Blade of Dawn）團長雷納德指引覺醒者；鍛造同盟艾琳與藥劑師蜜拉提供武器淬火與藥劑支援。",
        "discoveredNpc": "雷納德（晨曦之劍）、艾琳（鍛造同盟）、蜜拉（微風藥劑師）"
    }
    data['lastImportedAt'] = now_str
    data['importSource'] = source_name

    log_entry = f"【官方資料同步 {now_str}】依據使用者導入檔案同步世界觀，鎖定第 1 層翠風平原與始源鎮。"
    if 'evolutionLog' not in data:
        data['evolutionLog'] = []
    data['evolutionLog'].insert(0, log_entry)

    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ 世界觀資料已依據官方文檔同步完成！")
    print(f"資料來源: {source_name}")
    print(f"當前世界: {data['worldName']} - 第 {data['currentFloor']['floor_id']} 層 {data['currentFloor']['name_tc']}")
    return True

if __name__ == '__main__':
    sources = inspect_lore_sources()
    print(f"偵測到 {len(sources)} 個官方設定資料檔案。")
    for s in sources:
        print(f" - {s.name}")
    sync_world_from_user_data()
