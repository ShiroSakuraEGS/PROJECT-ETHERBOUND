import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 3D 模型載入與管理系統 (ModelLoader)
 * 支援載入來自 Sand3D / Objaverse / Mixamo 的標準 .glb / .gltf 模型
 * 具備自動尺寸規格化、陰影啟用與優雅降級機制
 */
export class ModelLoader {
  private loader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * 非同步載入 GLB 模型並自動規格化至目標尺寸
   * @param path 模型路徑 (例如: '/assets/models/sword.glb')
   * @param targetSize 目標邊界大小 (例如長劍約 1.2 米)
   */
  public async loadGLB(path: string, targetSize: number = 1.0): Promise<THREE.Group | null> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!.clone();
    }

    try {
      const gltf = await this.loader.loadAsync(path);
      const root = gltf.scene;

      // 1. 自動遍歷子網格，啟用軟陰影與材質最佳化
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;

          // 增強金屬度與粗糙度
          if (m.material && (m.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
            const std = m.material as THREE.MeshStandardMaterial;
            std.envMapIntensity = 1.2;
          }
        }
      });

      // 2. 計算包圍盒並自動等比縮放
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      if (maxDim > 0) {
        const scale = targetSize / maxDim;
        root.scale.setScalar(scale);
      }

      this.cache.set(path, root);
      return root.clone();
    } catch (err) {
      console.warn(`[ModelLoader] 模型檔案尚未放置或載入失敗 (${path})，自動降級啟用以太程序化幾何體。`, err);
      return null;
    }
  }
}
