import { NPCInfo } from '../lore/AetherisLore';

/**
 * NPC 對話介面與任務看板控制器 (DialogueBox)
 */
export class DialogueBox {
  private container: HTMLElement;
  private nameEl: HTMLElement;
  private titleEl: HTMLElement;
  private textEl: HTMLElement;
  private closePrompt: HTMLElement;
  public isOpen: boolean = false;

  constructor() {
    this.container = document.getElementById('dialogue-box')!;
    this.nameEl = document.getElementById('dialogue-name')!;
    this.titleEl = document.getElementById('dialogue-title')!;
    this.textEl = document.getElementById('dialogue-text')!;
    this.closePrompt = document.getElementById('dialogue-close')!;
  }

  public show(npc: NPCInfo, speech: string) {
    this.isOpen = true;
    this.nameEl.innerText = npc.name;
    this.nameEl.style.color = npc.avatarColor;
    this.titleEl.innerText = npc.title;
    this.textEl.innerText = speech;
    this.container.style.display = 'block';
  }

  public hide() {
    this.isOpen = false;
    this.container.style.display = 'none';
  }
}
