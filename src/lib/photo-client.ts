/**
 * photo-client.ts - utilitarios de foto para o painel (roda no navegador).
 * Comprime para WebP no celular antes de subir (economiza dados e Storage).
 */

const MAX_SIDE = 1600;

export async function fileToWebpDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

/** Sobe um arquivo escolhido no aparelho; devolve a URL publica. */
export async function uploadPhotoFile(file: File): Promise<string> {
  const dataUrl = await fileToWebpDataUrl(file);
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Falha ao enviar a foto.');
  return json.url as string;
}

/** Baixa uma foto de outro site (com Referer) e guarda no nosso Storage. */
export async function mirrorPhotoUrl(url: string, ref?: string): Promise<string> {
  const res = await fetch('/api/admin/mirror-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ref }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Não foi possível baixar essa foto.');
  return json.url as string;
}

/** Foto a partir de um link: tenta espelhar no Storage. */
export const looksLikeUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());
