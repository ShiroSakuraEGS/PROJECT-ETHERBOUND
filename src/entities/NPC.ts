import * as THREE from 'three';
import { NPCInfo, NPCS } from '../lore/AetherisLore';

/**
 * NPC 實體物件 (NPC)
 * 在 3D 場景中生成具備特色鎧甲、披風與互動光環的 NPC
 */
export class NPC {
  public mesh: THREE.Group;
  public info: NPCInfo;
  private ringMesh: THREE.Mesh;

  constructor(scene: THREE.Scene, info: NPCInfo, position: THREE.Vector3) {
    this.info = info;
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    // 1. NPC 身體幾何體
    const armorMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(info.avatarColor),
      metalness: 0.6,
      roughness: 0.4
    });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1.2, 12), armorMat);
    body.position.y = 1.1;
    body.castShadow = true;
    this.mesh.add(body);

    // 2. 頭盔 / 頭部
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe0e6ed, roughness: 0.7 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), headMat);
    head.position.y = 1.85;
    this.mesh.add(head);

    // 3. 地面互動光環 (帶有呼吸脈衝)
    const ringGeo = new THREE.RingGeometry(0.8, 0.95, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(info.avatarColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.02;
    this.mesh.add(this.ringMesh);

    scene.add(this.mesh);
  }

  public update(time: number, playerPos: THREE.Vector3) {
    // 轉向玩家
    const lookTarget = new THREE.Vector3(playerPos.x, this.mesh.position.y, playerPos.z);
    this.mesh.lookAt(lookTarget);

    // 光環呼吸
    const s = 1.0 + Math.sin(time * 3.5) * 0.12;
    this.ringMesh.scale.set(s, s, 1);
  }
}
