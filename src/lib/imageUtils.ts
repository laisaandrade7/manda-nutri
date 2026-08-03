function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$|\.heif$/i.test(file.name)
  );
}

function decodeAndResize(blob: Blob, maxDim: number): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, dataUrl });
      };
      img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
}

export async function resizeImageToBase64(
  file: File,
  maxDim = 1024
): Promise<{ base64: string; dataUrl: string }> {
  if (!isHeic(file)) {
    return decodeAndResize(file, maxDim);
  }

  // Safari/iOS decodifica HEIC nativamente — tenta direto primeiro (mais rápido).
  try {
    return await decodeAndResize(file, maxDim);
  } catch {
    // Navegador sem suporte nativo (ex: Chrome/Firefox desktop) — tenta converter.
  }

  try {
    const { default: heic2any } = await import('heic2any');
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const jpeg = Array.isArray(converted) ? converted[0] : converted;
    return await decodeAndResize(jpeg, maxDim);
  } catch (err) {
    console.error('Erro ao processar foto HEIC:', err);
    throw new Error(
      'Não conseguimos processar essa foto HEIC neste navegador. Tente tirar a foto direto pela câmera ou mudar o formato da câmera do iPhone para "Mais compatível" em Ajustes → Câmera → Formatos.'
    );
  }
}
