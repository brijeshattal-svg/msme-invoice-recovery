import { COPY } from "./copy";
import { isAllowedMime, MAX_UPLOAD_BYTES } from "./limits";

const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.85;

export class UploadError extends Error {}

const isHeic = (f: File) => /^image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

/**
 * Validates a chosen file and shrinks photos so they fit Vercel's 4.5 MB body limit.
 * PDFs pass through unchanged (4 MB cap). Throws UploadError with user-facing copy.
 */
export async function compressImage(file: File): Promise<File> {
  if (isHeic(file)) throw new UploadError(COPY.heic);
  if (!isAllowedMime(file.type)) throw new UploadError(COPY.unsupported);
  if (file.size === 0) throw new UploadError(COPY.empty);

  if (file.type === "application/pdf") {
    if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(COPY.pdfTooLarge);
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies EXIF orientation in current browsers
  } catch {
    throw new UploadError(COPY.unsupported);
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new UploadError(COPY.unsupported);
  ctx.fillStyle = "#ffffff"; // PNG transparency would otherwise turn black in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new UploadError(COPY.unsupported);
  if (blob.size > MAX_UPLOAD_BYTES) throw new UploadError(COPY.imageTooLarge);
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
