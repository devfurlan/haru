// Recorta uma região da imagem (em pixels naturais, como devolvido pelo
// react-easy-crop) e gera um ou mais blobs nos formatos/tamanhos de saída.
// Roda no cliente (usa canvas do DOM). O server só persiste os bytes.

export type CropArea = { x: number; y: number; width: number; height: number };

export type CropOutput = {
  format: 'image/webp' | 'image/jpeg' | 'image/png';
  /** Largura máx. da saída em px; a altura vem do aspecto do recorte. */
  maxWidth: number;
  quality?: number;
  /**
   * Cor de fundo desenhada antes da imagem. Necessária ao gerar JPEG a partir
   * de PNG/WebP transparente (sem isto, o transparente vira preto).
   */
  background?: string;
};

// Dimensões de saída: nunca faz upscale (cap na largura do recorte) e preserva
// o aspecto do recorte. Extraída pra ser verificável sem canvas.
export function outputDims(areaW: number, areaH: number, maxWidth: number) {
  const w = Math.max(1, Math.min(maxWidth, Math.round(areaW)));
  const h = Math.max(1, Math.round((w * areaH) / areaW));
  return { w, h };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Imagem inválida'));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))),
      type,
      quality,
    ),
  );
}

export async function cropToBlobs(
  imageSrc: string,
  area: CropArea,
  outputs: CropOutput[],
): Promise<Blob[]> {
  const img = await loadImage(imageSrc);
  return Promise.all(
    outputs.map(({ format, maxWidth, quality = 0.85, background }) => {
      const { w, h } = outputDims(area.width, area.height, maxWidth);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Não foi possível processar a imagem');
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
      return toBlob(canvas, format, quality);
    }),
  );
}
