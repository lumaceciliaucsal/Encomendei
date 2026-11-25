import {
  MAX_TAMANHO_ARQUIVO_ORIGINAL_BYTES,
  MAX_TAMANHO_IMAGEM_BYTES,
  TIPOS_IMAGEM_PERMITIDOS,
  estimarBytesBase64,
  type ImagemAnexadaPayload,
} from './regras';

/**
 * Opção B (sem Storage): comprime a imagem no navegador para no máximo 1280px,
 * qualidade 0.7 (cerca de 100–250 KB), gerando Data URL base64 validada.
 */
export async function comprimirImagemNoNavegador(
  arquivo: File,
  maxDimensao: number = 1280,
  qualidadeInicial: number = 0.7
): Promise<ImagemAnexadaPayload> {
  if (!(TIPOS_IMAGEM_PERMITIDOS as readonly string[]).includes(arquivo.type)) {
    throw new Error('Formato não suportado. Envie JPG, PNG ou WEBP.');
  }
  if (arquivo.size > MAX_TAMANHO_ARQUIVO_ORIGINAL_BYTES) {
    throw new Error('O arquivo original excede 8 MB.');
  }

  const bitmapUrl = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      el.src = bitmapUrl;
    });

    const escala = Math.min(1, maxDimensao / Math.max(img.width, img.height));
    const largura = Math.max(1, Math.round(img.width * escala));
    const altura = Math.max(1, Math.round(img.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Seu navegador não suporta processamento de imagem.');
    }
    ctx.drawImage(img, 0, 0, largura, altura);

    const tipoSaida = arquivo.type === 'image/png' ? 'image/webp' : 'image/jpeg';
    let qualidade = qualidadeInicial;
    let dataBase64 = canvas.toDataURL(tipoSaida, qualidade);
    let mimeFinal: string = tipoSaida;

    // Fallback caso o navegador não gere webp
    if (tipoSaida === 'image/webp' && !dataBase64.startsWith('data:image/webp')) {
      mimeFinal = 'image/jpeg';
      dataBase64 = canvas.toDataURL('image/jpeg', qualidade);
    }

    // Se ainda estiver acima do limite de 500 KB, reduz qualidade progressivamente
    let bytes = estimarBytesBase64(dataBase64);
    while (bytes > MAX_TAMANHO_IMAGEM_BYTES && qualidade > 0.35) {
      qualidade -= 0.1;
      dataBase64 = canvas.toDataURL(mimeFinal, qualidade);
      bytes = estimarBytesBase64(dataBase64);
    }

    if (bytes > MAX_TAMANHO_IMAGEM_BYTES) {
      throw new Error('A imagem comprimida ainda ficou acima de 500 KB. Tente outra foto.');
    }

    return {
      nome: arquivo.name.slice(0, 120),
      mimeType: mimeFinal,
      tamanhoBytes: bytes,
      dataBase64,
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export function formatarTamanhoBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
