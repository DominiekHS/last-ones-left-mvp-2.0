/**
 * Client-side image compressie zonder externe dependency.
 * - Resized naar max `maxDim` (breedte of hoogte, aspect ratio behouden)
 * - Encodeert opnieuw als JPEG/WebP met opgegeven kwaliteit
 * - Slaat compressie over als het bestand al kleiner is dan `skipUnderBytes`
 */
export interface CompressOptions {
  maxDim?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
  skipUnderBytes?: number;
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const {
    maxDim = 1600,
    quality = 0.82,
    mimeType = "image/jpeg",
    skipUnderBytes = 400 * 1024,
  } = opts;

  // Non-image of al klein genoeg → laat staan
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= skipUnderBytes) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  // Witte achtergrond voor JPEG (voorkomt zwarte fill bij transparante PNG)
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
  if (!blob || blob.size >= file.size) return file;

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
