/** JPEG de cerca de 1 MB, sem serviço externo nem dependência. */
export async function reduzirImagem(arquivo: File): Promise<Blob> {
  let imagem: ImageBitmap;
  try { imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" }); }
  catch { throw new Error("Não foi possível abrir a imagem. Escolha outra foto ou print."); }
  const canvas = document.createElement("canvas");
  try {
    let escala = Math.min(1, 2560 / Math.max(imagem.width, imagem.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar a imagem. Tente de novo.");
    for (let tentativa = 0; tentativa < 12; tentativa++) {
      canvas.width = Math.max(1, Math.round(imagem.width * escala));
      canvas.height = Math.max(1, Math.round(imagem.height * escala));
      ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      for (const qualidade of [0.86, 0.72, 0.58]) {
        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", qualidade));
        if (blob && blob.size <= 1024 * 1024) return blob;
      }
      escala *= 0.75;
    }
    throw new Error("Não foi possível preparar a imagem. Escolha outra foto ou print.");
  } finally { imagem.close(); canvas.width = 0; canvas.height = 0; }
}
