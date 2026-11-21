import * as THREE from 'three';

/**
 * 程序化石磚與 PBR 貼圖生成器 (TextureGenerator)
 * 免除外部大型貼圖下載，使用 HTML5 Canvas 2D 即時烘焙 1024x1024 高精準石磚法線與粗糙度貼圖
 */
export class TextureGenerator {
  /**
   * 生成古代以太石板 PBR 貼圖套組 (漫反射、法線、粗糙度)
   */
  public static createCobblestonePBR(size: number = 1024): {
    map: THREE.CanvasTexture;
    normalMap: THREE.CanvasTexture;
    roughnessMap: THREE.CanvasTexture;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // 1. 繪製漫反射基底 (深石青底色 + 雜色噪點)
    ctx.fillStyle = '#2c3545';
    ctx.fillRect(0, 0, size, size);

    // 雜色噪點 (微石質顆粒)
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 8)); // 帶微弱青以太色調
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. 繪製石磚磚縫網格 (4x4 或 8x8 格狀石塊)
    const tileSize = size / 8;
    ctx.strokeStyle = '#12161f';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';

    for (let y = 0; y < size; y += tileSize) {
      // 交錯排布 (Running Bond)
      const offsetX = ((y / tileSize) % 2 === 0) ? 0 : tileSize * 0.5;
      for (let x = -tileSize; x < size + tileSize; x += tileSize) {
        ctx.strokeRect(x + offsetX + 3, y + 3, tileSize - 6, tileSize - 6);

        // 每塊石磚內部的隨機風化微裂痕
        if (Math.random() > 0.4) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(18, 22, 31, 0.6)';
          ctx.lineWidth = 2;
          const cx = x + offsetX + tileSize * 0.5;
          const cy = y + tileSize * 0.5;
          ctx.moveTo(cx - 15, cy - 10);
          ctx.lineTo(cx + (Math.random() - 0.5) * 30, cy + (Math.random() - 0.5) * 30);
          ctx.stroke();
        }
      }
    }

    const diffuseTexture = new THREE.CanvasTexture(canvas);
    diffuseTexture.wrapS = THREE.RepeatWrapping;
    diffuseTexture.wrapT = THREE.RepeatWrapping;
    diffuseTexture.repeat.set(4, 4);

    // 3. 透過高度差演算法 (Sobel 濾波器) 烘焙高精算法線貼圖 (Normal Map)
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = size;
    normalCanvas.height = size;
    const nCtx = normalCanvas.getContext('2d')!;

    // 讀取漫反射高度資訊
    const grayData = ctx.getImageData(0, 0, size, size);
    const g = grayData.data;
    const nImgData = nCtx.createImageData(size, size);
    const nd = nImgData.data;

    const getHeight = (x: number, y: number) => {
      const px = (x + size) % size;
      const py = (y + size) % size;
      const idx = (py * size + px) * 4;
      return (g[idx] * 0.299 + g[idx + 1] * 0.587 + g[idx + 2] * 0.114) / 255.0;
    };

    const strength = 3.5;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Sobel 水平與垂直梯度
        const tl = getHeight(x - 1, y - 1);
        const l  = getHeight(x - 1, y);
        const bl = getHeight(x - 1, y + 1);
        const tr = getHeight(x + 1, y - 1);
        const r  = getHeight(x + 1, y);
        const br = getHeight(x + 1, y + 1);
        const t  = getHeight(x, y - 1);
        const b  = getHeight(x, y + 1);

        const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
        const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);
        const dZ = 1.0 / strength;

        // 正規化法線向量
        const len = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
        const nx = -dX / len;
        const ny = -dY / len;
        const nz = dZ / len;

        const idx = (y * size + x) * 4;
        nd[idx]     = Math.floor((nx * 0.5 + 0.5) * 255); // R
        nd[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255); // G
        nd[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255); // B (朝上天藍色)
        nd[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImgData, 0, 0);

    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(4, 4);

    // 4. 烘焙粗糙度貼圖 (Roughness Map - 磚縫粗糙 1.0，石面光滑 0.45)
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d')!;
    const rImgData = rCtx.createImageData(size, size);
    const rd = rImgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (g[i] + g[i + 1] + g[i + 2]) / 3;
      // 較暗處 (磚縫) 粗糙，較亮處 (石板) 光滑
      const roughVal = brightness < 60 ? 240 : 110;
      rd[i]     = roughVal;
      rd[i + 1] = roughVal;
      rd[i + 2] = roughVal;
      rd[i + 3] = 255;
    }
    rCtx.putImageData(rImgData, 0, 0);

    const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
    roughnessTexture.wrapS = THREE.RepeatWrapping;
    roughnessTexture.wrapT = THREE.RepeatWrapping;
    roughnessTexture.repeat.set(4, 4);

    return {
      map: diffuseTexture,
      normalMap: normalTexture,
      roughnessMap: roughnessTexture
    };
  }
}
