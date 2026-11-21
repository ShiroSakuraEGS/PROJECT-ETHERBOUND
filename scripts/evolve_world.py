#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
艾瑟里斯 (Aetheris) 世界演進模組
嚴格依據使用者指示：禁止隨意寬大世界觀，世界設定必須由使用者導入新資料時才進行更新。
"""

import sys
from pathlib import Path

# 調用官方資料導入模組
sys.path.append(str(Path(__file__).resolve().parent))
from import_lore import sync_world_from_user_data, inspect_lore_sources

def main():
    print("==================================================")
    print("PROJECT: ETHERBOUND — 世界觀資料同步模組")
    print("【規則】世界觀嚴格受使用者資料驅動，不進行無來源的隨機擴展。")
    print("==================================================")
    sources = inspect_lore_sources()
    print(f"已確認官方設定來源檔案：共 {len(sources)} 件。")
    sync_world_from_user_data()

if __name__ == '__main__':
    main()
