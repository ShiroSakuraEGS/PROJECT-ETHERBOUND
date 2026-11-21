import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AnimatedModelResult {
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  actions: Map<string, THREE.AnimationAction>;
  playAction: (name: string, fadeDuration?: number) => THREE.AnimationAction | null;
}

/**
 * 3D 模型與骨骼動畫載入管理器 (ModelLoader)
 * 支援載入開源 CC0 (.glb / .gltf) 模型與骨骼動畫 (AnimationMixer)，
 * 具備自動尺寸縮放、材質 PBR 增強與優雅程序化降級機制。
 */
export class ModelLoader {
  private loader: GLTFLoader;
  private modelCache: Map<string, THREE.Group> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * 載入帶骨骼動畫的 GLB 角色模型
   */
  public async loadAnimatedGLB(path: string, targetHeight: number = 1.8): Promise<AnimatedModelResult | null> {
    try {
      const gltf = await this.loader.loadAsync(path);
      const root = gltf.scene;

      // 1. 啟用陰影與增強 PBR 材質
      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;

          if (m.material) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat.isMeshStandardMaterial) {
              mat.roughness = Math.max(0.3, mat.roughness);
              mat.metalness = Math.min(0.9, mat.metalness);
            }
          }
        }
      });

      // 2. 自動規格化高度
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 0) {
        const scale = targetHeight / size.y;
        root.scale.setScalar(scale);
      }

      // 3. 提取骨骼動畫與建立 Mixer
      let mixer: THREE.AnimationMixer | null = null;
      const actions = new Map<string, THREE.AnimationAction>();

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(root);
        for (const clip of gltf.animations) {
          const action = mixer.clipAction(clip);
          actions.set(clip.name.toLowerCase(), action);
        }
      }

      let currentAction: THREE.AnimationAction | null = null;
      const playAction = (name: string, fadeDuration: number = 0.2): THREE.AnimationAction | null => {
        if (!mixer) return null;
        const targetName = name.toLowerCase();
        let targetAction: THREE.AnimationAction | undefined = undefined;

        // 模糊匹配動作名稱 (如 'walk', 'idle', 'run', 'attack')
        for (const [key, act] of actions.entries()) {
          if (key.includes(targetName)) {
            targetAction = act;
            break;
          }
        }

        if (!targetAction && actions.size > 0) {
          targetAction = actions.values().next().value;
        }

        if (targetAction && targetAction !== currentAction) {
          if (currentAction) {
            currentAction.fadeOut(fadeDuration);
          }
          targetAction.reset().fadeIn(fadeDuration).play();
          currentAction = targetAction;
        }

        return targetAction || null;
      };

      return {
        root,
        mixer,
        clips: gltf.animations || [],
        actions,
        playAction
      };
    } catch (err) {
      console.warn(`[ModelLoader] 模型檔案載入失敗或尚未放置 (${path})，啟動程序化骨骼步態動態降級。`);
      return null;
    }
  }

  /**
   * 載入靜態幾何道具 (武器、盾牌、裝飾)
   */
  public async loadStaticGLB(path: string, targetSize: number = 1.0): Promise<THREE.Group | null> {
    if (this.modelCache.has(path)) {
      return this.modelCache.get(path)!.clone();
    }

    try {
      const gltf = await this.loader.loadAsync(path);
      const root = gltf.scene;

      root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        root.scale.setScalar(targetSize / maxDim);
      }

      this.modelCache.set(path, root);
      return root.clone();
    } catch (err) {
      return null;
    }
  }
}
